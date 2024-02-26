'use client';

import { registerOtel } from '@/lib/otel/instrumentation.client';

export function Otel() {
  return registerOtel({
    endpoint: process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT,
    serviceName: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
    version: process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME,
  }).then(null);
}
