import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  WebTracerProvider,
  ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-web';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { browserDetector } from '@opentelemetry/resources';
import { detectResourcesSync } from '@opentelemetry/resources/build/src/detect-resources';
import { Span } from '@opentelemetry/api';

export async function initTelemetry() {
  if (typeof window !== 'undefined') {
    return null;
  }

  const { ZoneContextManager } = await import('@opentelemetry/context-zone');

  let resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.BUILD,
  });

  const contextManager = new ZoneContextManager();

  const detectedResources = detectResourcesSync({
    detectors: [browserDetector],
  });

  resource = resource.merge(detectedResources);

  const provider = new WebTracerProvider({
    resource,
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

  provider.addSpanProcessor(
    new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
    ),
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
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: /.*/,
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span: Span) {
            span.setAttribute('app.synthetic_request', 'false');
          },
        },
      }),
    ],
  });

  console.log('instrumentation `client` enabled');
}
