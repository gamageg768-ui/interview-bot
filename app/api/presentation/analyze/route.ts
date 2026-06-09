import { NextRequest, NextResponse } from 'next/server';
import { extractPptxSlides } from '@/lib/pptx';
import { analyzePresentationAndGenerateQuestions } from '@/lib/groq';
import type { Difficulty } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const context = (formData.get('context') as string) ?? '';
    const difficulty = ((formData.get('difficulty') as string) ?? 'medium') as Difficulty;
    const count = Math.min(parseInt((formData.get('count') as string) ?? '5', 10), 10);

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pptx')) {
      return NextResponse.json({ error: 'Only .pptx files are supported' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const slides = await extractPptxSlides(buffer);

    if (slides.length === 0) {
      return NextResponse.json({ error: 'No readable text found in the presentation' }, { status: 400 });
    }

    const result = await analyzePresentationAndGenerateQuestions(slides, context, difficulty, count);

    return NextResponse.json({ ...result, slideCount: slides.length });
  } catch (err) {
    console.error('[/api/presentation/analyze]', err);
    return NextResponse.json({ error: 'Failed to analyze presentation' }, { status: 500 });
  }
}
