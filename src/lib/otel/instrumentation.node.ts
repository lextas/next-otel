import { Span } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  awsEc2Detector,
  awsEksDetector,
} from '@opentelemetry/resource-detector-aws';
import { containerDetector } from '@opentelemetry/resource-detector-container';
import {
  envDetector,
  hostDetector,
  osDetector,
  processDetector, Resource
} from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ClientRequest, IncomingMessage } from 'http';

console.log('')

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: process.env.BUILD,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // disable `instrumentation-fs` because it's bloating the traces
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      '@opentelemetry/instrumentation-http': {
        // ignore certain requests
        ignoreIncomingRequestHook: (request: IncomingMessage) => {

          console.log('ignoreIncomingRequestHook', request.url);

          const ignorePatterns = [
            /^\/_next\/static.*/,
            /\/?_rsc=*/,
            /favicon/,
          ];

          if(request.url && ignorePatterns.some(m => m.test(request.url!))){
            return true;
          }

          return false;
        },

        // rewrite span names from HTTP GET to the path
        requestHook: (span: Span, request: ClientRequest | IncomingMessage) => {
          // span.setAttributes({
          //   name: `${request.method} ${(request as IncomingMessage).url}`,
          // });
        },

        // re-assign the root span's attributes
        startIncomingSpanHook: (request: IncomingMessage) => {
          
          // return {
          //   name: `${request.method} ${request.url}`,
          //   'request.path': request.url,
          // };
          return {}
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

console.log('instrumentation `node` enabled');

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error: any) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
