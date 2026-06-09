import Groq from 'groq-sdk';
import type {
  InterviewType, Difficulty, Question, AnswerFeedback,
  PresentationAssessment, CoachingReport, PlanDay, ResumeProfile,
} from './types';
import type { SlideContent } from './pptx';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = 'llama-3.3-70b-versatile';

const TYPE_LABELS: Record<InterviewType, string> = {
  technical: 'Technical / Coding',
  behavioral: 'Behavioral (STAR method)',
  'system-design': 'System Design',
  hr: 'HR / Culture Fit',
  'school-admissions': 'School Admissions',
  'university-admissions': 'University / College Admissions',
  scholarship: 'Scholarship',
  club: 'Club / Organization Membership',
  sports: 'Sports Team / Activity',
  volunteer: 'Volunteer / Community Service',
  custom: 'Custom',
  presentation: 'Presentation Q&A',
};

const PROFESSIONAL_TYPES = new Set<InterviewType>(['technical', 'behavioral', 'system-design', 'hr']);

function typeGuidelines(type: InterviewType, role: string): string {
  switch (type) {
    case 'technical':
      return `- Focus on algorithms, data structures, and coding concepts relevant to ${role}`;
    case 'behavioral':
      return `- Use real-world STAR-method scenarios that reveal problem-solving and character`;
    case 'system-design':
      return `- Ask about designing scalable, reliable systems relevant to ${role}`;
    case 'hr':
      return `- Ask about motivation, teamwork, culture fit, and career goals`;
    case 'school-admissions':
      return `- Focus on academic interests, extracurriculars, personal growth, and why they want to attend\n- Ask about challenges overcome and what they would contribute to the school community`;
    case 'university-admissions':
      return `- Ask about academic passion, intellectual curiosity, research interests, and long-term vision\n- Explore fit with the institution and unique contributions the candidate brings`;
    case 'scholarship':
      return `- Focus on academic merit, leadership, community impact, and alignment with the scholarship's mission\n- Ask about demonstrated excellence and future plans`;
    case 'club':
      return `- Ask about relevant skills, commitment level, knowledge of the club's mission, and what they bring\n- Include questions about collaboration and past involvement`;
    case 'sports':
      return `- Focus on dedication, coachability, teamwork, athletic background, and handling pressure\n- Ask about balancing sports with other commitments`;
    case 'volunteer':
      return `- Ask about motivation to serve, relevant skills, empathy, and understanding of the organization's mission`;
    case 'custom':
      return `- Generate questions highly relevant to the specific opportunity described\n- Focus on motivation, relevant skills, and what the candidate uniquely brings`;
    case 'presentation':
      return `- Test whether the presenter truly understands their own content\n- Ask about methodology, data sources, conclusions, and reasoning behind key claims`;
  }
}

// ── Standard interview ───────────────────────────────────────────────────────

export async function generateQuestions(
  type: InterviewType,
  role: string,
  context: string,
  difficulty: Difficulty,
  count: number
): Promise<Question[]> {
  const label = TYPE_LABELS[type];
  const isPro = PROFESSIONAL_TYPES.has(type);
  const roleDesc = isPro ? `a ${role} position` : role;
  const contextLine = context.trim() ? `\nCandidate background: ${context.trim()}` : '';
  const personalizeNote = context.trim()
    ? "- Personalize at least 2 questions directly referencing the candidate's background"
    : '';

  const prompt = `You are an expert interviewer conducting a ${label} interview for ${roleDesc}.${contextLine}

Generate exactly ${count} ${difficulty}-level interview questions.

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "questions": [
    {
      "id": 1,
      "question": "The full interview question text",
      "category": "A short category label",
      "hints": ["Hint 1", "Hint 2"],
      "expectedTopics": ["Topic 1", "Topic 2", "Topic 3"]
    }
  ]
}

Guidelines:
${typeGuidelines(type, role)}
- ${difficulty === 'easy' ? 'Keep questions approachable and foundational' : difficulty === 'medium' ? 'Questions should require genuine thought and reflection' : 'Questions should be probing, nuanced, and reveal depth'}
- Make each question distinct and avoid repetition
${personalizeNote}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(clean) as { questions: Question[] };
  return parsed.questions;
}

export async function evaluateAnswer(
  type: InterviewType,
  role: string,
  context: string,
  question: Question,
  answer: string
): Promise<AnswerFeedback> {
  const label = TYPE_LABELS[type];
  const isPro = PROFESSIONAL_TYPES.has(type);
  const roleDesc = isPro ? `a ${role} position` : role;
  const contextLine = context.trim() ? `\nCandidate background: ${context.trim()}` : '';

  const prompt = `You are an expert ${label} interviewer evaluating a candidate for ${roleDesc}.${contextLine}

Question: ${question.question}
Expected Topics: ${question.expectedTopics.join(', ')}

Candidate's Answer:
"""
${answer.trim() || '(No answer provided)'}
"""

Evaluate the answer and return ONLY a valid JSON object (no markdown, no explanation):
{
  "score": <integer 1-10>,
  "strengths": ["What the candidate did well (2-3 points, each 1 sentence)"],
  "improvements": ["What could be better (2-3 actionable points, each 1 sentence)"],
  "modelAnswer": "A concise ideal answer (3-5 sentences) that a strong candidate would give",
  "overallFeedback": "A 2-3 sentence holistic assessment of the response"
}

Scoring: 1-3 weak, 4-5 partial, 6-7 solid, 8-9 strong, 10 exceptional. Be honest and specific.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as AnswerFeedback;
}

// ── Follow-up question ───────────────────────────────────────────────────────

export async function generateFollowUp(
  type: InterviewType,
  role: string,
  context: string,
  question: Question,
  answer: string
): Promise<string> {
  const label = TYPE_LABELS[type];
  const contextLine = context.trim() ? `\nContext: ${context.trim()}` : '';

  const prompt = `You are an expert ${label} interviewer.${contextLine}

The candidate was asked: "${question.question}"
Their answer: "${answer.trim() || '(no answer provided)'}"

Generate ONE natural follow-up question that digs deeper into something specific they said (or conspicuously omitted). Keep it concise and conversational.

Return ONLY the follow-up question text. No JSON, no explanation.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 120,
  });

  return response.choices[0]?.message?.content?.trim() ?? '';
}

// ── Coaching report ──────────────────────────────────────────────────────────

export async function generateCoachingReport(
  type: InterviewType,
  role: string,
  context: string,
  completedQAs: { question: string; answer: string; score: number }[]
): Promise<CoachingReport> {
  const label = TYPE_LABELS[type];
  const contextLine = context.trim() ? `\nContext: ${context.trim()}` : '';
  const avgScore = (completedQAs.reduce((s, q) => s + q.score, 0) / completedQAs.length).toFixed(1);
  const qaText = completedQAs
    .map((qa, i) => `Q${i + 1} (Score: ${qa.score}/10): ${qa.question}\nAnswer: ${qa.answer || '(no answer)'}`)
    .join('\n\n');

  const prompt = `You are a professional interview coach reviewing a ${label} session for a ${role} candidate.${contextLine}

Session average: ${avgScore}/10

Q&A breakdown:
${qaText}

Provide strategic coaching. Return ONLY valid JSON (no markdown):
{
  "summary": "2-3 sentence overall assessment of this session performance",
  "strengths": ["Specific strength with evidence from their actual answers (2-3 items)"],
  "areasToImprove": ["Specific weak area with what was missing or weak (2-3 items)"],
  "studyTopics": ["Concrete topic/concept to study before next session (2-3 items)"],
  "nextSteps": ["Actionable recommendation for next practice session (2-3 items)"],
  "predictedScore": <number 1-10 representing predicted real interview performance>
}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 1200,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as CoachingReport;
}

// ── Resume parsing ───────────────────────────────────────────────────────────

export async function parseResumeText(resumeText: string): Promise<ResumeProfile> {
  const prompt = `Extract key information from this resume and return ONLY valid JSON (no markdown):
{
  "name": "Candidate's full name or empty string if not found",
  "currentRole": "Most recent or current job title",
  "skills": ["up to 10 key technical and professional skills"],
  "experienceSummary": "2-3 sentence summary of experience highlighting key achievements, under 250 chars"
}

Resume text:
${resumeText.slice(0, 3500)}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as ResumeProfile;
}

// ── Interview planner ────────────────────────────────────────────────────────

export async function generateInterviewPlan(
  role: string,
  company: string,
  daysUntil: number
): Promise<PlanDay[]> {
  const days = Math.min(Math.max(daysUntil, 1), 14);
  const companyLine = company.trim() ? ` at ${company.trim()}` : '';

  const prompt = `You are an interview preparation coach. Create a ${days}-day prep plan for someone interviewing for ${role}${companyLine}.

Return ONLY a valid JSON array (no markdown):
[
  {
    "day": 1,
    "focus": "Short descriptive focus title",
    "type": "<one of: technical|behavioral|system-design|hr>",
    "difficulty": "<easy|medium|hard>",
    "count": <3, 4, or 5>,
    "tip": "One specific, actionable study tip for this day (1 sentence)"
  }
]

Generate exactly ${days} items. Progress from easier to harder. Mix question types appropriately for the role. End the final 2 days with harder questions.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content ?? '[]';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as PlanDay[];
}

// ── Stress challenge ─────────────────────────────────────────────────────────

export async function generateStressChallenge(
  type: InterviewType,
  role: string,
  context: string,
  question: Question,
  answer: string
): Promise<string> {
  const label = TYPE_LABELS[type];
  const contextLine = context.trim() ? `\nContext: ${context.trim()}` : '';

  const prompt = `You are a tough, skeptical ${label} interviewer deliberately stress-testing a candidate for ${role}.${contextLine}

The candidate was asked: "${question.question}"
Their answer: "${answer.trim() || '(no answer provided)'}"

Generate ONE sharp, challenging pushback or devil's advocate question to pressure-test their response. Be direct and slightly skeptical — focus on: an assumption they made, something they left out, a contradiction, or a harder edge case.

Return ONLY the challenge question text. No JSON, no explanation.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.85,
    max_tokens: 150,
  });

  return response.choices[0]?.message?.content?.trim() ?? '';
}

// ── Answer improvement ───────────────────────────────────────────────────────

export async function improveAnswer(
  type: InterviewType,
  role: string,
  context: string,
  question: Question,
  answer: string
): Promise<{ suggestions: string[]; improvedDraft: string }> {
  const label = TYPE_LABELS[type];
  const contextLine = context.trim() ? `\nContext: ${context.trim()}` : '';

  const prompt = `You are a ${label} interview coach helping a candidate improve their draft answer before submitting.${contextLine}

Question: ${question.question}
Expected Topics: ${question.expectedTopics.join(', ')}

Current Answer:
"""
${answer.trim() || '(No answer yet — write a strong opening)'}
"""

Provide specific, actionable suggestions. Return ONLY valid JSON:
{
  "suggestions": ["Specific improvement 1", "Specific improvement 2", "Specific improvement 3"],
  "improvedDraft": "A complete improved version of the answer incorporating all suggestions (3-5 sentences)"
}`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    max_tokens: 800,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean) as { suggestions: string[]; improvedDraft: string };
}

// ── Presentation analysis ────────────────────────────────────────────────────

export async function analyzePresentationAndGenerateQuestions(
  slides: SlideContent[],
  context: string,
  difficulty: Difficulty,
  count: number
): Promise<{
  title: string;
  summary: string;
  contentAssessment: PresentationAssessment;
  questions: Question[];
}> {
  const slideText = slides
    .slice(0, 30)
    .map(s => `[Slide ${s.number}] ${s.text}`)
    .join('\n')
    .slice(0, 5000);

  const contextLine = context.trim() ? `\nContext: ${context.trim()}` : '';

  const difficultyNote =
    difficulty === 'easy'
      ? 'ask straightforward questions about the key points and main message'
      : difficulty === 'medium'
      ? 'probe the reasoning, evidence, and decisions behind the content'
      : 'challenge assumptions, ask about limitations, edge cases, and what was left out';

  const prompt = `You are an expert presentation coach and evaluator.

Presentation content (${slides.length} slides):
${slideText}
${contextLine}

Perform a complete analysis and return ONLY a valid JSON object (no markdown):
{
  "title": "Concise presentation title",
  "summary": "2-3 sentence summary of the key message, structure, and main takeaways",
  "contentAssessment": {
    "structureScore": <1-10>,
    "contentDepthScore": <1-10>,
    "clarityScore": <1-10>,
    "overallScore": <1-10>,
    "strengths": ["Specific presentation strength 1", "Specific presentation strength 2"],
    "improvements": ["Specific content improvement 1", "Specific content improvement 2"],
    "verdict": "2-3 sentence overall assessment of the presentation quality and impact"
  },
  "questions": [
    {
      "id": 1,
      "question": "Question text — reference specific slides where relevant",
      "category": "e.g. 'Methodology', 'Results', 'Justification', 'Audience Fit'",
      "hints": ["One helpful hint"],
      "expectedTopics": ["Expected topic 1", "Expected topic 2"]
    }
  ]
}

Generate exactly ${count} ${difficulty}-level Q&A questions. ${difficultyNote}.`;

  const response = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}
