import { OtelOptions } from '@/types/otel';
import { Span } from '@opentelemetry/api';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { browserDetector, Resource } from '@opentelemetry/resources';
import { detectResourcesSync } from '@opentelemetry/resources/build/src/detect-resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  WebTracerProvider
} from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export async function initTelemetry({
  endpoint,
  serviceName,
  version
}: OtelOptions) {
  if (typeof window !== 'undefined') {
    return null;
  }

  const { ZoneContextManager } = await import('@opentelemetry/context-zone');

  let resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: version,
  });

  const contextManager = new ZoneContextManager();

  const detectedResources = detectResourcesSync({
    detectors: [browserDetector],
  });

  resource = resource.merge(detectedResources);

  const provider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new SimpleSpanProcessor(
        new ConsoleSpanExporter()
      ),
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: endpoint
       }
      ))
    ]
  });

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
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span: Span) {
            span.setAttribute('app.synthetic_request', 'false');
          },
        },
        '@opentelemetry/instrumentation-document-load': {},
        '@opentelemetry/instrumentation-user-interaction': {},
        '@opentelemetry/instrumentation-xml-http-request': {},
      }),
    ],
  });

  console.log('instrumentation `client` enabled');
}
