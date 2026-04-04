'use server';

import { context, propagation, Span } from "@opentelemetry/api";
import { tracer } from "./lib/otel";

export async function getRandomNumber(carrier?: Record<string, string>) {

  // Restore the client trace context so this span becomes a child of the frontend span
  const parentContext = carrier
    ? propagation.extract(context.active(), carrier)
    : context.active();

  return context.with(parentContext, () =>
    tracer.startActiveSpan("[action] getRandomNumber", async (parentSpan: Span) => {
      try {

        const response = await fetch("http://localhost:3000/api/random");
        const { random } = await response.json();

        parentSpan.setAttribute("response", random);

        return random;
      } finally {
        parentSpan.end();
      }
    })
  );

}