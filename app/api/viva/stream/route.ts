import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { buildVivaSystemPrompt, VIVA_OPENING_MESSAGE, VIVA_END_MARKER } from '@/lib/viva-prompts';
import { VivaSessionConfig, VivaTurn } from '@/lib/viva-types';

export const dynamic = 'force-dynamic';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

interface Body {
  config: VivaSessionConfig;
  turns: VivaTurn[];
  pendingUserMessage?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { config, turns, pendingUserMessage } = body;
  if (!config) return NextResponse.json({ error: 'Missing config' }, { status: 400 });

  const system = buildVivaSystemPrompt(config);

  const messages: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const t of turns) {
    if (t.role === 'examiner') {
      messages.push({ role: 'assistant', content: t.text });
    } else if (t.role === 'candidate') {
      const content = t.interrupted ? t.text + ' [Note: candidate was interrupted]' : t.text;
      messages.push({ role: 'user', content });
    }
  }
  if (pendingUserMessage) {
    messages.push({ role: 'user', content: pendingUserMessage });
  }

  const model = config.model || 'llama-3.3-70b-versatile';

  try {
    const stream = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.85,
      max_tokens: 300,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          if (text) controller.enqueue(new TextEncoder().encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'LLM error' }, { status: 500 });
  }
}

