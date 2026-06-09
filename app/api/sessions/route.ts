import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/sessions — list recent sessions
export async function GET() {
  try {
    const sessions = await prisma.interviewSession.findMany({
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: { answers: true },
    });
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('[GET /api/sessions]', err);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

// POST /api/sessions — save a completed session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, role, context = '', difficulty, totalQuestions, averageScore, answers } = body;

    const session = await prisma.interviewSession.create({
      data: {
        type,
        role,
        context,
        difficulty,
        totalQuestions,
        averageScore,
        answers: {
          create: answers.map((a: {
            question: string;
            userAnswer: string;
            score: number;
            feedback: string;
          }) => ({
            question: a.question,
            userAnswer: a.userAnswer,
            score: a.score,
            feedback: a.feedback,
          })),
        },
      },
      include: { answers: true },
    });

    return NextResponse.json({ session });
  } catch (err) {
    console.error('[POST /api/sessions]', err);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}
