'use client';

import { getRandomNumber } from '@/actions';
import { tracer } from '@/lib/otel';
import { Span } from '@opentelemetry/api';
import { useState } from 'react';

type RandomNumberProps = {
  initialValue?: number;
}

export const RandomNumber = ({ initialValue = 0 }: RandomNumberProps) => {

  const [number, setNumber] = useState(initialValue);

  const onClick = async () => {

    return tracer.startActiveSpan(
      "[Button] Get Random Number",
      async (parentSpan: Span) => {
        console.log('client', parentSpan.spanContext().traceId)
        try {
          const randomNumber = await getRandomNumber();

          parentSpan.setAttribute("response.random", randomNumber);

          setNumber(randomNumber);
        } finally {
          parentSpan.end();
        }
      }
    );

  };

  return (
    <div>
      <button
        className="bg-slate-800 text-white p-2 rounded-md"
        onClick={onClick}
      >
        Get Random Number
      </button>
      Random: {number}
    </div>
  );
}
