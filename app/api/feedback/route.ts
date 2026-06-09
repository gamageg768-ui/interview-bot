import { NextRequest, NextResponse } from 'next/server';
import { evaluateAnswer } from '@/lib/groq';
import type { InterviewType, Question } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, role, context = '', question, answer } = body as {
      type: InterviewType;
      role: string;
      context: string;
      question: Question;
      answer: string;
    };

    if (!type || !role || !question || answer === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const feedback = await evaluateAnswer(type, role, context, question, answer);
    return NextResponse.json({ feedback });
  } catch (err) {
    console.error('[/api/feedback]', err);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
