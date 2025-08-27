'use client';

import { OtelOptions } from '@/types/otel';
import { Span } from '@opentelemetry/api';
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
  SimpleSpanProcessor,
  WebTracerProvider
} from '@opentelemetry/sdk-trace-web';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export async function initTelemetry({
  endpoint,
  serviceName,
  version
}: OtelOptions) {
  // if (typeof window === 'undefined') {
  //   return null;
  // }

  let resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: version,
  });

  const contextManager = new ZoneContextManager();

  const detectedResources = detectResources({
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
        "@opentelemetry/instrumentation-fetch": {
          // propagateTraceHeaderCorsUrls: /.*/,
          propagateTraceHeaderCorsUrls: [/^\/api\//], // limit to your backend calls
          clearTimingResources: true,
          applyCustomAttributesOnSpan(span: Span) {
            span.setAttribute("app.synthetic_request", "false");
          },
          ignoreUrls: [/\/_next\/static\//, /favicon/],
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
        "@opentelemetry/instrumentation-document-load": {},
        /*
         * user interaction events like when a user clicks a button, submits a form, etc
         * see: https://www.npmjs.com/package/@opentelemetry/instrumentation-user-interaction
         */
        "@opentelemetry/instrumentation-user-interaction": {
          // disabled as this sample uses custom traces on events
          shouldPreventSpanCreation: () => true,
          // configure which events you want to track
          // eventNames: ["submit"],
        },
        /*
         * XMLHttpRequest traces
         * see: https://www.npmjs.com/package/@opentelemetry/instrumentation-xml-http-request
         */
        "@opentelemetry/instrumentation-xml-http-request": {},
      }),
    ],
  });

  console.log('instrumentation `client` enabled');
}
