'use client';

import { Span, trace } from '@opentelemetry/api';
import { useState } from 'react';

async function getRandom(): Promise<{ random: number }> {

  const tracer = trace.getTracer('next-otel');

  return tracer.startActiveSpan("[Button] Get Random Number", async (parentSpan: Span) => {
    try {
      parentSpan.setAttribute("custom.attribute", "value");

      const response = await fetch("/api/random");
      const data = await response.json();

      parentSpan.setAttribute("response.data", JSON.stringify(data));

      return data;
    } finally {
      parentSpan.end();
    }
  });
}

export default function Home() {

  const [number, setNumber] = useState(0);

  const onClick = async () => {
    const response = await getRandom();
    
    setNumber(response.random);
  };

  return (
    <div>
      <h1>Home</h1>
      <button
        className="bg-slate-800 text-white p-2 rounded-xs"
        onClick={onClick}
      >
        Get Random Number
      </button>
      Random: {number}
    </div>
  );
}
