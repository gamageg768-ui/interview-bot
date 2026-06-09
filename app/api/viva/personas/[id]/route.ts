import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const persona = await prisma.vivaPersona.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!persona) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (persona.userId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.vivaPersona.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
