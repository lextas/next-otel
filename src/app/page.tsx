'use client';

import { Span, trace } from '@opentelemetry/api';
import { useState } from 'react';

async function getRandom(): Promise<{ random: number }> {

  const tracer = trace.getTracer('next-otel');
  console.log('tracer', tracer);

  tracer.startActiveSpan('test', (span: Span) => {

    span.setAttribute('custom.attribute', 'value')

    span.end();

  });


  return await trace
    .getTracer('test-button')
    .startActiveSpan('getRandomNumber', async (span) => {
      try {
        const response = await fetch('/api/random');
        return response.json();
      } finally {
        span.end();
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
    <main className='p-5'>
      <h1>Random: {number}</h1>
      <button className='bg-slate-800 text-white p-2 rounded-xs' onClick={onClick}>Get Random Number</button>     
    </main>
  )
}
