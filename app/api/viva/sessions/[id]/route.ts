import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { VivaSession } from '@/lib/viva-types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const s = await prisma.vivaSession.findUnique({
    where: { id: params.id },
    include: { turns: { orderBy: { timestamp: 'asc' } } },
  });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const session: VivaSession = {
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
  };
  return NextResponse.json(session);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;

  const s = await prisma.vivaSession.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (userId && s.userId && s.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.vivaTurn.deleteMany({ where: { sessionId: params.id } });
  await prisma.vivaSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
