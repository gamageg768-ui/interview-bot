import { NextRequest, NextResponse } from 'next/server';
import { generateQuestions } from '@/lib/groq';
import type { InterviewType, Difficulty } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, role, context = '', difficulty, count } = body as {
      type: InterviewType;
      role: string;
      context: string;
      difficulty: Difficulty;
      count: number;
    };

    if (!type || !role || !difficulty || !count) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const questions = await generateQuestions(type, role, context, difficulty, Math.min(count, 10));
    return NextResponse.json({ questions });
  } catch (err) {
    console.error('[/api/questions]', err);
    return NextResponse.json(
      { error: 'Failed to generate questions. Check your GROQ_API_KEY.' },
      { status: 500 }
    );
  }
}
