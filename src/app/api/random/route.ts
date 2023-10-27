import { NextResponse } from 'next/server';

export const GET = async (req: Request) => {
  return NextResponse.json({
    random: Math.round(Math.random() * 100),
  });
};
