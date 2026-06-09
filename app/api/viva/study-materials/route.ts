import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

const PROMPT = `You are an academic study assistant. Analyse this oral exam transcript and return ONLY a valid JSON object with:
- "flashcards": array of 8 objects each with "q" and "a" — focus on hardest topics
- "outline": markdown outline of key topics covered
- "recommendations": array of exactly 5 improvement recommendations as strings
No extra fields. Raw JSON only.`;

async function generate(sessionId: string, userId: string) {
  const session = await prisma.vivaSession.findUnique({
    where: { id: sessionId },
    include: { turns: { orderBy: { timestamp: 'asc' } } },
  });
  if (!session) return null;

  const transcript = session.turns
    .filter((t) => t.role !== 'system')
    .map((t) => `[${t.role.toUpperCase()}]: ${t.text}`)
    .join('\n');

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: PROMPT },
      { role: 'user', content: `Discipline: ${session.discipline}\nTopic: ${session.topic}\n\nTranscript:\n${transcript}` },
    ],
    temperature: 0.3,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content?.trim() || '{}';
  const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, ''));

  const id = `sm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return prisma.vivaStudyMaterial.upsert({
    where: { sessionId },
    create: {
      id, sessionId, userId,
      flashcards: JSON.stringify(parsed.flashcards || []),
      outline: parsed.outline || '',
      recommendations: JSON.stringify(parsed.recommendations || []),
      createdAt: Date.now(),
    },
    update: {
      flashcards: JSON.stringify(parsed.flashcards || []),
      outline: parsed.outline || '',
      recommendations: JSON.stringify(parsed.recommendations || []),
    },
  });
}

export async function GET(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  const existing = await prisma.vivaStudyMaterial.findUnique({ where: { sessionId } });
  if (existing) {
    return NextResponse.json({
      ...existing,
      flashcards: JSON.parse(existing.flashcards),
      recommendations: JSON.parse(existing.recommendations),
    });
  }

  if (!userId) return NextResponse.json(null);

  try {
    const row = await generate(sessionId, userId);
    if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({
      ...row,
      flashcards: JSON.parse(row.flashcards),
      recommendations: JSON.parse(row.recommendations),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

  try {
    const row = await generate(sessionId, userId);
    if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    return NextResponse.json({
      ...row,
      flashcards: JSON.parse(row.flashcards),
      recommendations: JSON.parse(row.recommendations),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
