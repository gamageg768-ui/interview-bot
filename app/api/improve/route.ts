import { NextRequest, NextResponse } from 'next/server';
import { improveAnswer } from '@/lib/groq';
import type { InterviewType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { type, role, context = '', question, answer } = await req.json();
    const improvement = await improveAnswer(
      type as InterviewType, role, context, question, answer
    );
    return NextResponse.json({ improvement });
  } catch (err) {
    console.error('[POST /api/improve]', err);
    return NextResponse.json({ error: 'Failed to generate improvement' }, { status: 500 });
  }
}
