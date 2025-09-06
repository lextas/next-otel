'use server';

import { Span } from "@opentelemetry/api";
import { tracer } from "./lib/otel";

export async function getRandomNumber() {

  return tracer.startActiveSpan("[action] getRandomNumber", async (parentSpan: Span) => {

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