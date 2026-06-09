import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json([]);

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const rows = await prisma.vivaAnnotation.findMany({ where: { sessionId, userId } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { turnId, sessionId, note } = await req.json();
  if (!turnId || !sessionId || !note?.trim()) {
    return NextResponse.json({ error: 'turnId, sessionId, note required' }, { status: 400 });
  }

  const id = `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = await prisma.vivaAnnotation.create({
    data: { id, turnId, sessionId, userId, note: note.trim(), createdAt: Date.now() },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  await prisma.vivaAnnotation.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
