import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json([]);

  const rows = await prisma.vivaPersona.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, background, specialization, institution } = await req.json();
  if (!name?.trim() || !background?.trim()) {
    return NextResponse.json({ error: 'name and background are required' }, { status: 400 });
  }

  const id = `ps_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const row = await prisma.vivaPersona.create({
    data: { id, userId, name: name.trim(), background: background.trim(), specialization: specialization?.trim() || null, institution: institution?.trim() || null },
  });
  return NextResponse.json(row);
}
