'use client';

import { initTelemetry } from '@/lib/otel/instrumentation.client';
import { OtelOptions } from '@/types/otel';

export function Otel(options: OtelOptions) {
  initTelemetry(options);

  return null;
}
