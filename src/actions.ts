'use server';

import { Span } from "@opentelemetry/api";
import { headers } from 'next/headers';
import { tracer } from "./lib/otel";

export async function getRandomNumber() {

  const headerList = await headers()

  console.log(headerList.get('traceparent'));

  return tracer.startActiveSpan("[action] getRandomNumber", async (parentSpan: Span) => {

    console.log("action", parentSpan.spanContext().traceId);

    try {

      const response = await fetch("http://localhost:3000/api/random");
      const { random } = await response.json();

      parentSpan.setAttribute("response", random);

      return random;
    } finally {
      parentSpan.end();
    }
  });


}