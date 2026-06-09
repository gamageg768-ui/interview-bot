import { NextRequest, NextResponse } from 'next/server';
import { extractPdfText } from '@/lib/resume';
import { parseResumeText } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const resumeText = await extractPdfText(buffer);

    if (!resumeText.trim()) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    const profile = await parseResumeText(resumeText);
    return NextResponse.json({ profile, resumeText: resumeText.slice(0, 2000) });
  } catch (err) {
    console.error('[POST /api/resume/parse]', err);
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 });
  }
}
