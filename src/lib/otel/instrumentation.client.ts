'use client';

import { OtelOptions } from '@/types/otel';
import { type Span, propagation } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { browserDetector } from '@opentelemetry/opentelemetry-browser-detector';
import { detectResources, resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
  type SpanExporter,
  type SpanProcessor,
  WebTracerProvider
} from '@opentelemetry/sdk-trace-web';
import { ExportResult } from '@opentelemetry/core';

// Drops root-span fetch POST spans — these are Server Action transport spans that lost
// Zone.js context and would otherwise appear as orphaned traces in the backend.
class DropOrphanedServerActionSpans implements SpanExporter {
  constructor(private inner: SpanExporter) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const filtered = spans.filter(
      (span) =>
        !(
          span.attributes['component'] === 'fetch' &&
          span.attributes['http.method'] === 'POST' &&
          !span.parentSpanId
        )
    );
    this.inner.export(filtered, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Renames client-side fetch spans from "HTTP GET" to "GET /path"
// so RSC navigation spans are readable in Tempo.
class FetchSpanRenamer implements SpanProcessor {
  onStart(): void {}

  onEnd(span: ReadableSpan): void {
    if (span.attributes['http.url']) {
      try {
        const path = new URL(String(span.attributes['http.url'])).pathname;
        const method = String(span.attributes['http.method'] ?? 'GET');
        Object.defineProperty(span, 'name', {
          value: `${method} ${path}`,
          writable: true,
          configurable: true,
        });
      } catch { /* unparseable URL, leave name unchanged */ }
    }
  }

  shutdown(): Promise<void> { return Promise.resolve(); }
  forceFlush(): Promise<void> { return Promise.resolve(); }
}

export async function initTelemetry({
  endpoint,
  serviceName,
  version,
  debug = false
}: OtelOptions) {
  if (typeof window === 'undefined') {
    return null;
  }

  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    })
  );

  let resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: version,
  });

  const contextManager = new ZoneContextManager();

  const detectedResources = detectResources({
    detectors: [browserDetector],
  });

  resource = resource.merge(detectedResources);

  const spanProcessors: SpanProcessor[] = [
    new FetchSpanRenamer(),
    new BatchSpanProcessor(
      new DropOrphanedServerActionSpans(
        new OTLPTraceExporter({ url: endpoint })
      )
    ),
  ];

  if(debug){
    spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  const provider = new WebTracerProvider({
    resource,
    spanProcessors
  });

  provider.register({
    contextManager,
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-fetch": {
          propagateTraceHeaderCorsUrls: [/.*/],
          // propagateTraceHeaderCorsUrls: [/^\/api\//], // limit to your backend calls
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span: Span) {
            span.setAttribute("app.synthetic_request", "false");
          },
          ignoreUrls: [/\/_next\/static\//, /favicon/],
          // requestHook: (span: Span, request: Request | RequestInit) => {
          //   // span.updateName(`${request.method} ${(request as Request).url}`);
          //   console.log("span", span, span.);
          //   console.log("client requestHook", request);
          //   // if (request instanceof Request) {
          //   //   console.log("requestHook", `${request.method} ${request.url}`);
          //   //   span.setAttributes({
          //   //     name: `${request.method} ${request.url}`,
          //   //   });
          //   // }
          // },
        },
        /*
         * DocumentLoaded events
         * see: https://www.npmjs.com/package/@opentelemetry/instrumentation-document-load
         *
         * DocumentLoaded instrumentation supports connecting the server side spans for the
         * initial HTML load with the client side span for the load from the
         * browser's timing API. This works by having the server send its parent
         * trace context (trace ID, span ID and trace sampling decision) to the
         * client. Because the browser does not send a trace context header for the
         * initial page navigation, the server needs to fake a trace context header
         * in a middleware and then send that trace context header back to the client
         * as a meta tag traceparent. The traceparent meta tag should be in the
         * trace context W3C draft format (https://www.w3.org/TR/trace-context)
         */
        "@opentelemetry/instrumentation-document-load": {
          ignoreNetworkEvents: true,
          applyCustomAttributesOnSpan: {
            documentLoad: (span: Span) => {
              // add custom attributes
              // span.setAttribute('key', 'value')
            },
          },
        },
        /*
         * user interaction events like when a user clicks a button, submits a form, etc
         * see: https://www.npmjs.com/package/@opentelemetry/instrumentation-user-interaction
         */
        "@opentelemetry/instrumentation-user-interaction": {
          // disabled as this sample uses custom traces on events
          shouldPreventSpanCreation: () => true,
          // configure which events you want to track
          //eventNames: ["submit"],
        },
        /*
         * XMLHttpRequest traces
         * see: https://www.npmjs.com/package/@opentelemetry/instrumentation-xml-http-request
         */
        "@opentelemetry/instrumentation-xml-http-request": {},
      }),
    ],
  });

  if(debug){
    console.log("instrumentation `client` enabled");
  }
}
