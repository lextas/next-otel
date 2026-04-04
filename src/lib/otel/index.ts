import { Attributes, trace } from "@opentelemetry/api";

export const tracer = trace.getTracer(process.env.OTEL_SERVICE_NAME!);

// Equivalent to Activity.Current.AddTag() in .NET — adds attributes to the currently active span.

export async function addSpan(span: string, value: string){
  return addSpanAttributes({ [span]: value} );
}

export function addSpanAttributes(attributes: Attributes) {
  trace.getActiveSpan()?.setAttributes(attributes);
}