import { NextRequest, NextResponse } from 'next/server';
import { generateStressChallenge } from '@/lib/groq';
import type { InterviewType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { type, role, context = '', question, answer } = await req.json();
    const challenge = await generateStressChallenge(
      type as InterviewType, role, context, question, answer
    );
    return NextResponse.json({ challenge });
  } catch (err) {
    console.error('[POST /api/stress]', err);
    return NextResponse.json({ error: 'Failed to generate stress challenge' }, { status: 500 });
  }
}
