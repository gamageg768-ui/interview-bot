import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

function randomToken(len = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const token = randomToken(48);
  const now = Date.now();
  await prisma.vivaShareToken.create({
    data: { token, sessionId, userId, expiresAt: now + 7 * 86_400_000, createdAt: now },
  });
  return NextResponse.json({ token });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const row = await prisma.vivaShareToken.findUnique({ where: { token } });
  if (!row || Number(row.expiresAt) < Date.now()) {
    return NextResponse.json({ error: 'Token not found or expired' }, { status: 404 });
  }
  return NextResponse.json({ sessionId: row.sessionId });
}
