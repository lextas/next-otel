'use client';

import { getRandomNumber } from '@/actions';
import { tracer } from '@/lib/otel';
import { context, propagation, Span } from '@opentelemetry/api';
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
        try {
          // Extract the active trace context so the server action can continue the trace
          const carrier: Record<string, string> = {};
          propagation.inject(context.active(), carrier);

          const randomNumber = await getRandomNumber(carrier);

          parentSpan.setAttribute("response.random", randomNumber);

          setNumber(randomNumber);
        } finally {
          parentSpan.end();
        }
      }
    );

  };

  return (
    <div className='flex flex-col gap-y-4'>
      <h1 className='text-4xl font-black text-center'>{number}</h1>
      <button
        className="bg-slate-800 text-white p-2 rounded-md"
        onClick={onClick}
      >
        Get Random Number
      </button>
    </div>
  );
}
