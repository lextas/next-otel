'use client';

import { initTelemetry } from '@/lib/otel/instrumentation.client';

export function Otel() {
  initTelemetry();

  return null;
}
