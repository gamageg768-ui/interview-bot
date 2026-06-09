import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      orderBy: { savedAt: 'desc' },
    });
    return NextResponse.json({ bookmarks });
  } catch (err) {
    console.error('[GET /api/bookmarks]', err);
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { questionText, type, category, role } = await req.json();
    if (!questionText || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const bookmark = await prisma.bookmark.create({
      data: { questionText, type, category: category ?? '', role: role ?? '' },
    });
    return NextResponse.json({ bookmark });
  } catch (err) {
    console.error('[POST /api/bookmarks]', err);
    return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await prisma.bookmark.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/bookmarks]', err);
    return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 });
  }
}
