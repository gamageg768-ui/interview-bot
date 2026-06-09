import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { VivaSessionConfig, VivaTurn, VivaRubricScores } from '@/lib/viva-types';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: NextRequest) {
  const { config, turns }: { config: VivaSessionConfig; turns: VivaTurn[] } = await req.json();
  const candidateTurns = turns.filter((t) => t.role === 'candidate');
  if (candidateTurns.length < 2) {
    return NextResponse.json({ error: 'Not enough turns to score' }, { status: 400 });
  }

  const transcript = turns
    .filter((t) => t.role !== 'system')
    .map((t) => `[${t.role.toUpperCase()}]: ${t.text}`)
    .join('\n');

  const systemPrompt = `You are an assessment rubric engine. Return ONLY a valid JSON object with exactly these five keys, each a number 1–10:
clarity, depth, defensibility, composure, timeManagement. No other fields. No explanation. Raw JSON only.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Discipline: ${config.discipline}\nTopic: ${config.topic}\n\nTranscript:\n${transcript}` },
      ],
      temperature: 0.2,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
    const clamp = (v: unknown) => Math.min(10, Math.max(1, Math.round(Number(v) || 5)));

    const scores: VivaRubricScores = {
      clarity:        clamp(parsed.clarity),
      depth:          clamp(parsed.depth),
      defensibility:  clamp(parsed.defensibility),
      composure:      clamp(parsed.composure),
      timeManagement: clamp(parsed.timeManagement),
    };
    return NextResponse.json({ scores });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'Scoring failed' }, { status: 500 });
  }
}
