import { NextRequest, NextResponse } from 'next/server';
import { generateInterviewPlan } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const { role, company, daysUntil } = await req.json() as {
      role: string;
      company: string;
      daysUntil: number;
    };

    if (!role || !daysUntil) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const plan = await generateInterviewPlan(role, company ?? '', daysUntil);
    return NextResponse.json({ plan });
  } catch (err) {
    console.error('[POST /api/planner/schedule]', err);
    return NextResponse.json({ error: 'Failed to generate plan' }, { status: 500 });
  }
}
