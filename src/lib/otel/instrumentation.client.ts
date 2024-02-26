import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from "@opentelemetry/core";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  WebTracerProvider,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-web";
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import { browserDetector } from "@opentelemetry/resources";
import { detectResourcesSync } from "@opentelemetry/resources/build/src/detect-resources";
import { Span } from "@opentelemetry/api";
import { OtelOptions } from "@/types/otel";

export async function registerOtel({
  endpoint,
  serviceName,
  version,
  consoleLogging = false,
}: OtelOptions) {
  if (typeof window === "undefined") {
    return null;
  }

  const { ZoneContextManager } = await import("@opentelemetry/context-zone");

  let resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: version,
    })
  );

  const contextManager = new ZoneContextManager();

  const detectedResources = detectResourcesSync({
    detectors: [browserDetector],
  });

  resource = resource.merge(detectedResources);

  const provider = new WebTracerProvider({
    resource,
  });

  if (consoleLogging) {
    provider.addSpanProcessor(
      new SimpleSpanProcessor(new ConsoleSpanExporter())
    );
  }

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: endpoint,
      })
    )
  );

  provider.register({
    contextManager,
    propagator: new CompositePropagator({
      propagators: [
        new W3CBaggagePropagator(),
        new W3CTraceContextPropagator(),
      ],
    }),
  });

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      getWebAutoInstrumentations({
        "@opentelemetry/instrumentation-document-load": {
          enabled: true,
          applyCustomAttributesOnSpan: {
            documentLoad: (span) => {},
            documentFetch: (span) => {},
            resourceFetch: (span, resource) => {},
          },
        },
        "@opentelemetry/instrumentation-user-interaction": {
          eventNames: ["click", "submit" /* add events we want to trace */],
          enabled: true,
          shouldPreventSpanCreation: (eventType, element, span) => {

            // TODO: we can add custom data attributes like `data-ignore-trace` and check for it here and return `true` to prevent tracing

            const title = element.title || element.innerText;

            span.updateName(`${eventType} '${title}'`);

            span.setAttribute("target.id", element.id);
            span.setAttribute("target.className", element.className);
            span.setAttribute("target.html", element.outerHTML);
            span.setAttribute("target.title", title);

            return false;
          },
        },
        "@opentelemetry/instrumentation-xml-http-request": {},
        "@opentelemetry/instrumentation-fetch": {
          enabled: true,
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span: Span, request, result) {

            span.setAttribute("app.synthetic_request", "false");

            // const attributes = (span as any).attributes;
            // if (attributes.component === "fetch") {
            //   span.updateName(
            //     `${attributes["http.method"]} ${attributes["http.url"]}`
            //   );
            // }
          },
        },
      }),
    ],
  });
}
