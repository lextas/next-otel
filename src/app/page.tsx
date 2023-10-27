'use client';

import { useState } from 'react';
import { trace } from '@opentelemetry/api';

async function getRandom(): Promise<{ random: number }> {

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
      <button className='bg-slate-800 text-white p-2 rounded-sm' onClick={onClick}>Get Random Number</button>     
    </main>
  )
}
