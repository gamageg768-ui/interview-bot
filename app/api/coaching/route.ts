import { NextRequest, NextResponse } from 'next/server';
import { generateCoachingReport } from '@/lib/groq';
import type { InterviewType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { type, role, context, completedQAs } = await req.json() as {
      type: InterviewType;
      role: string;
      context: string;
      completedQAs: { question: string; answer: string; score: number }[];
    };

    if (!type || !role || !completedQAs?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const report = await generateCoachingReport(type, role, context ?? '', completedQAs);
    return NextResponse.json({ report });
  } catch (err) {
    console.error('[POST /api/coaching]', err);
    return NextResponse.json({ error: 'Failed to generate coaching report' }, { status: 500 });
  }
}
