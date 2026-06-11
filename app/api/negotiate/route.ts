import { NextRequest, NextResponse } from 'next/server';
import { runNegotiationTurn } from '@/lib/groq';
import type { NegotiationScenario, NegotiationTurn } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: { scenario: NegotiationScenario; history: NegotiationTurn[]; userMessage: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { scenario, history, userMessage } = body;
  if (!scenario || !userMessage) {
    return NextResponse.json({ error: 'Missing scenario or userMessage' }, { status: 400 });
  }

  try {
    const result = await runNegotiationTurn(scenario, history ?? [], userMessage);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'Negotiation failed' }, { status: 500 });
  }
}
