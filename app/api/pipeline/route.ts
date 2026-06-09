import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const pipelines = await prisma.pipeline.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });
    return NextResponse.json({ pipelines });
  } catch (err) {
    console.error('[GET /api/pipeline]', err);
    return NextResponse.json({ error: 'Failed to fetch pipelines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, stages, status = 'completed', averageScores } = await req.json() as {
      name: string;
      stages: { type: string; role: string; difficulty: string; questionCount: number; stageOrder: number; averageScore?: number }[];
      status?: string;
      averageScores?: number[];
    };

    const pipeline = await prisma.pipeline.create({
      data: {
        name,
        status,
        completedAt: status === 'completed' ? new Date() : null,
        stages: {
          create: stages.map((s, i) => ({
            type: s.type,
            role: s.role,
            difficulty: s.difficulty,
            questionCount: s.questionCount,
            stageOrder: s.stageOrder ?? i,
            averageScore: averageScores?.[i] ?? s.averageScore ?? null,
            completedAt: status === 'completed' ? new Date() : null,
          })),
        },
      },
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });

    return NextResponse.json({ pipeline });
  } catch (err) {
    console.error('[POST /api/pipeline]', err);
    return NextResponse.json({ error: 'Failed to save pipeline' }, { status: 500 });
  }
}
