import opentelemetry, { Span, propagation } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor, ReadableSpan, SpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  awsEc2Detector,
  awsEksDetector,
} from "@opentelemetry/resource-detector-aws";
import { containerDetector } from "@opentelemetry/resource-detector-container";
import {
  envDetector,
  hostDetector,
  osDetector,
  processDetector,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ClientRequest, IncomingMessage } from "http";
import { RequestOptions } from "https";

// Renames HTTP and Next.js OTEL spans to include the method and path (e.g. "GET /todo/[id]")
// so traces are readable in Tempo instead of showing "HTTP GET" or "NextServer.getRequestHandler".
// Using a SpanProcessor (rather than a SpanExporter wrapper) so the rename happens at span-end
// time on the live Span object, before it is queued for export.
class SpanRenamer implements SpanProcessor {
  onStart(): void {}

  onEnd(span: ReadableSpan): void {
    let newName: string | undefined;

    if (span.attributes["http.url"]) {
      // Any span carrying a full URL — parse the path, strip query string.
      // Covers both @opentelemetry/instrumentation-http spans AND Next.js OTEL outer spans.
      // e.g. http.url="http://localhost:3000/todo?_rsc=abc" → "GET /todo"
      try {
        const path = new URL(String(span.attributes["http.url"])).pathname;
        const method = String(span.attributes["http.method"] ?? "GET");
        const prefix = span.attributes["next.rsc"] ? "RSC " : "";
        newName = `${prefix}${method} ${path}`;
      } catch { /* unparseable URL, leave name unchanged */ }
    } else if (span.attributes["next.route"]) {
      // Next.js OTEL span with a route template but no full URL.
      // e.g. next.route="/todo/[id]", http.method="GET" → "RSC GET /todo/[id]"
      const method = String(span.attributes["http.method"] ?? "GET");
      const route = String(span.attributes["next.route"]);
      const prefix = span.attributes["next.rsc"] ? "RSC " : "";
      newName = `${prefix}${method} ${route}`;
    }

    if (newName && newName !== span.name) {
      // Object.defineProperty creates an own data property that shadows the prototype
      // getter, so the name is visible regardless of how the OTLP serializer reads it.
      Object.defineProperty(span, "name", {
        value: newName,
        writable: true,
        configurable: true,
      });
    }
  }

  shutdown(): Promise<void> { return Promise.resolve(); }
  forceFlush(): Promise<void> { return Promise.resolve(); }
}

opentelemetry.metrics.setGlobalMeterProvider(new MeterProvider());

propagation.setGlobalPropagator(new W3CTraceContextPropagator());

const ignorePatterns = [
  /^\/_next\/static.*/, // static assets
  /^\/_next\/image.*/, // next/image optimizer
  /^\/_next\/data.*/, // SSG data
  /[?&]_rsc=/, // RSC fetches
  /^\/favicon\.ico$/, // favicon
];

export const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.BUILD,
  }),
  spanProcessors: [
    new SpanRenamer(),
    new BatchSpanProcessor(
      new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT })
    ),
  ],
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-amqplib": { enabled: false },
      "@opentelemetry/instrumentation-aws-lambda": { enabled: false },
      "@opentelemetry/instrumentation-aws-sdk": { enabled: false },
      "@opentelemetry/instrumentation-bunyan": { enabled: false },
      "@opentelemetry/instrumentation-cassandra-driver": { enabled: false },
      "@opentelemetry/instrumentation-connect": { enabled: false },
      "@opentelemetry/instrumentation-cucumber": { enabled: false },
      "@opentelemetry/instrumentation-dataloader": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-generic-pool": { enabled: false },
      "@opentelemetry/instrumentation-graphql": { enabled: false },
      "@opentelemetry/instrumentation-grpc": { enabled: false },
      "@opentelemetry/instrumentation-hapi": { enabled: false },
      "@opentelemetry/instrumentation-ioredis": { enabled: false },
      "@opentelemetry/instrumentation-kafkajs": { enabled: false },
      "@opentelemetry/instrumentation-knex": { enabled: false },
      "@opentelemetry/instrumentation-koa": { enabled: false },
      "@opentelemetry/instrumentation-lru-memoizer": { enabled: false },
      "@opentelemetry/instrumentation-memcached": { enabled: false },
      "@opentelemetry/instrumentation-mongodb": { enabled: false },
      "@opentelemetry/instrumentation-mongoose": { enabled: false },
      "@opentelemetry/instrumentation-mysql2": { enabled: false },
      "@opentelemetry/instrumentation-mysql": { enabled: false },
      "@opentelemetry/instrumentation-nestjs-core": { enabled: false },
      "@opentelemetry/instrumentation-net": { enabled: false },
      "@opentelemetry/instrumentation-oracledb": { enabled: false },
      "@opentelemetry/instrumentation-pg": { enabled: false },
      "@opentelemetry/instrumentation-pino": { enabled: false },
      "@opentelemetry/instrumentation-redis": { enabled: false },
      "@opentelemetry/instrumentation-restify": { enabled: false },
      "@opentelemetry/instrumentation-router": { enabled: false },
      "@opentelemetry/instrumentation-runtime-node": { enabled: false },
      "@opentelemetry/instrumentation-socket.io": { enabled: false },
      "@opentelemetry/instrumentation-tedious": { enabled: false },
      "@opentelemetry/instrumentation-undici": { enabled: false },
      "@opentelemetry/instrumentation-winston": { enabled: false },
      "@opentelemetry/instrumentation-express": { enabled: false },
      "@opentelemetry/instrumentation-fs": {
        requireParentSpan: true,
        // enabled: false,
      },
      "@opentelemetry/instrumentation-http": {
        // ignore certain requests
        ignoreIncomingRequestHook: (request: IncomingMessage) => {
          if (request.url && ignorePatterns.some((m) => m.test(request.url!))) {
            console.log("[ignoreIncomingRequestHook] ignored", request.url);
            return true;
          }

          return false;
        },

        // rewrite span names from HTTP GET to the path
        requestHook: (span: Span, request: ClientRequest | IncomingMessage) => {
          console.log(
            "requestHook",
            `${request.method} ${(request as IncomingMessage).url}`
          );
          span.setAttributes({
            name: `${request.method} ${(request as IncomingMessage).url}`,
          });
        },

        // re-assign the root span's attributes
        startIncomingSpanHook: (request: IncomingMessage) => {
          const routeTemplate = (request.headers && request.headers["x-nextjs-route"]) || request.url;

          console.log("startIncomingSpanHook", routeTemplate);

          return {
            name: `${request.method} ${routeTemplate}`,
            'http.route': routeTemplate,
            "request.path": request.url,
          };
        },

        startOutgoingSpanHook: (request: RequestOptions) => {
          console.log("startOutgoingSpanHook");
          return {};
        },
      },
    }),
  ],
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
  }),
  resourceDetectors: [
    containerDetector,
    envDetector,
    hostDetector,
    osDetector,
    processDetector,
    awsEksDetector,
    awsEc2Detector,
  ],
});

sdk.start();

console.log("instrumentation `node` enabled");

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("Tracing terminated"))
    .catch((error: any) => console.log("Error terminating tracing", error))
    .finally(() => process.exit(0));
});
