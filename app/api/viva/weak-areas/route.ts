import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Groq from 'groq-sdk';
import { VivaTurn, VivaSessionConfig } from '@/lib/viva-types';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function GET() {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json([]);

  const rows = await prisma.vivaWeakArea.findMany({ where: { userId } });

  const map: Record<string, { topic: string; total: number; count: number }> = {};
  for (const r of rows) {
    const k = r.topic.toLowerCase();
    if (!map[k]) map[k] = { topic: r.topic, total: 0, count: 0 };
    map[k].total += r.severity;
    map[k].count += 1;
  }

  const result = Object.values(map)
    .map((v) => ({ topic: v.topic, avgSeverity: Math.round(v.total / v.count), count: v.count }))
    .sort((a, b) => b.avgSeverity - a.avgSeverity)
    .slice(0, 10);

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const auth = await getServerSession(authOptions);
  const userId = (auth?.user as { id?: string })?.id ?? null;
  if (!userId) return NextResponse.json({ ok: true });

  const { sessionId, config, turns }: { sessionId: string; config: VivaSessionConfig; turns: VivaTurn[] } = await req.json();

  const examinerText = turns.filter((t) => t.role === 'examiner').map((t) => t.text).join('\n');
  if (!examinerText) return NextResponse.json({ ok: true });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: `Return ONLY a JSON array of up to 5 objects, each with "topic" (string, max 8 words) and "severity" (1–10). Focus on subject-matter weaknesses revealed by the examiner. No explanation.` },
        { role: 'user', content: `Discipline: ${config.discipline}\nTopic: ${config.topic}\n\nExaminer questions:\n${examinerText}` },
      ],
      temperature: 0.2,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '[]';
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    const areas: { topic: string; severity: number }[] = Array.isArray(parsed) ? parsed : (parsed.areas || parsed.weakAreas || []);

    if (areas.length > 0) {
      await prisma.vivaWeakArea.createMany({
        data: areas.slice(0, 5).map((a) => ({
          id: `wa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sessionId,
          userId,
          topic: a.topic,
          severity: Math.min(10, Math.max(1, Math.round(a.severity || 5))),
          createdAt: Date.now(),
        })),
      });
    }
    return NextResponse.json({ ok: true, count: areas.length });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
