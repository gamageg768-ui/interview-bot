import { NextRequest, NextResponse } from 'next/server';
import { generateEmailTemplate } from '@/lib/groq';
import type { EmailTemplateType, EmailContext } from '@/lib/types';

export async function POST(req: NextRequest) {
  let body: { templateType: EmailTemplateType; context: EmailContext };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { templateType, context } = body;
  if (!templateType || !context) {
    return NextResponse.json({ error: 'Missing templateType or context' }, { status: 400 });
  }

  try {
    const email = await generateEmailTemplate(templateType, context);
    return NextResponse.json({ email });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json({ error: e?.message || 'Generation failed' }, { status: 500 });
  }
}
