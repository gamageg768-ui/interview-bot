import { NextRequest, NextResponse } from 'next/server';
import { generateFollowUp } from '@/lib/groq';
import type { InterviewType, Question } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { type, role, context, question, answer } = await req.json() as {
      type: InterviewType;
      role: string;
      context: string;
      question: Question;
      answer: string;
    };

    if (!type || !role || !question) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const followUpQuestion = await generateFollowUp(type, role, context ?? '', question, answer ?? '');
    return NextResponse.json({ followUpQuestion });
  } catch (err) {
    console.error('[POST /api/follow-up]', err);
    return NextResponse.json({ error: 'Failed to generate follow-up' }, { status: 500 });
  }
}
