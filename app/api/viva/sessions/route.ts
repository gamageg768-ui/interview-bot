import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VivaSession } from '@/lib/viva-types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json([], { status: 200 });

  try {
    const rows = await prisma.vivaSession.findMany({
      where: { userId },
      include: { turns: { orderBy: { timestamp: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const sessions: VivaSession[] = rows.map((s) => ({
      id: s.id,
      config: {
        discipline: s.discipline as VivaSession['config']['discipline'],
        topic: s.topic,
        difficulty: s.difficulty as VivaSession['config']['difficulty'],
        candidateName: s.candidateName ?? undefined,
        examinerName: s.examinerName ?? undefined,
        allowInterruptions: s.allowInterruptions,
        model: (s.model ?? undefined) as VivaSession['config']['model'],
      },
      turns: s.turns.map((t) => ({
        id: t.id,
        role: t.role as VivaSession['turns'][0]['role'],
        text: t.text,
        timestamp: Number(t.timestamp),
        interrupted: t.interrupted,
      })),
      createdAt: Number(s.createdAt),
      endedAt: s.endedAt ? Number(s.endedAt) : undefined,
      verdict: s.verdict ?? undefined,
      rubricScores: s.rubricScores ? JSON.parse(s.rubricScores) : undefined,
    }));

    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;

  const session: VivaSession = await req.json();

  try {
    await prisma.vivaSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        userId,
        discipline: session.config.discipline,
        topic: session.config.topic,
        difficulty: session.config.difficulty,
        candidateName: session.config.candidateName ?? null,
        examinerName: session.config.examinerName ?? null,
        allowInterruptions: session.config.allowInterruptions,
        personaId: session.config.persona?.id ?? null,
        model: session.config.model ?? null,
        createdAt: session.createdAt,
        endedAt: session.endedAt ?? null,
        verdict: session.verdict ?? null,
        rubricScores: session.rubricScores ? JSON.stringify(session.rubricScores) : null,
      },
      update: {
        endedAt: session.endedAt ?? null,
        verdict: session.verdict ?? null,
        rubricScores: session.rubricScores ? JSON.stringify(session.rubricScores) : null,
      },
    });

    if (session.turns.length > 0) {
      await prisma.vivaTurn.deleteMany({ where: { sessionId: session.id } });
      await prisma.vivaTurn.createMany({
        data: session.turns.map((t) => ({
          id: t.id,
          sessionId: session.id,
          role: t.role,
          text: t.text,
          timestamp: t.timestamp,
          interrupted: t.interrupted ?? false,
        })),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });
  }
}
