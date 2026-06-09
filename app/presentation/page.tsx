'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Loader2, ChevronRight, RotateCcw,
  AlertTriangle, Lightbulb, Send, Clock, Eye, EyeOff,
  CheckCircle2, TrendingUp, BarChart3, Layers,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import FeedbackCard from '@/components/FeedbackCard';
import ScoreBadge from '@/components/ScoreBadge';
import type { Question, AnswerFeedback, Difficulty, PresentationAssessment } from '@/lib/types';
import clsx from 'clsx';

type Phase = 'upload' | 'analyzing' | 'ready' | 'questioning' | 'feedback' | 'done' | 'error';

interface SessionQuestion {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
  timeSpent: number;
}

const DIFFICULTIES: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'easy', label: 'Easy', desc: 'Key points & main message' },
  { id: 'medium', label: 'Medium', desc: 'Reasoning & evidence' },
  { id: 'hard', label: 'Hard', desc: 'Assumptions & limitations' },
];

const QUESTION_COUNTS = [3, 5, 7, 10];

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-900">{score}/10</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all',
            score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-blue-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500'
          )}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );
}

export default function PresentationPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('upload');
  const [error, setError] = useState('');

  // Upload config
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [context, setContext] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis results
  const [presentationTitle, setPresentationTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [slideCount, setSlideCount] = useState(0);
  const [contentAssessment, setContentAssessment] = useState<PresentationAssessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Q&A state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [completed, setCompleted] = useState<SessionQuestion[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === 'questioning') {
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.toLowerCase().endsWith('.pptx')) setFile(dropped);
  }

  async function analyzePresentation() {
    if (!file) return;
    setPhase('analyzing');
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', context);
      formData.append('difficulty', difficulty);
      formData.append('count', String(questionCount));

      const res = await fetch('/api/presentation/analyze', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed');

      setPresentationTitle(data.title);
      setSummary(data.summary);
      setSlideCount(data.slideCount);
      setContentAssessment(data.contentAssessment);
      setQuestions(data.questions);
      setPhase('ready');
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  }

  async function submitAnswer() {
    if (!answer.trim() && !window.confirm('Submit without an answer?')) return;
    setIsFetching(true);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'presentation',
          role: presentationTitle,
          context: summary,
          question: questions[currentIdx],
          answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get feedback');

      const feedback = data.feedback as AnswerFeedback;
      setCurrentFeedback(feedback);
      setCompleted(prev => [...prev, { question: questions[currentIdx], answer, feedback, timeSpent }]);
      setPhase('feedback');
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setIsFetching(false);
    }
  }

  async function nextQuestion() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= questions.length) {
      await saveSession();
    } else {
      setCurrentIdx(nextIdx);
      setAnswer('');
      setHintsVisible(false);
      setElapsedSeconds(0);
      setQuestionStartTime(Date.now());
      setCurrentFeedback(null);
      setPhase('questioning');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }

  async function saveSession() {
    setPhase('done');
    try {
      const avgScore = completed.reduce((s, q) => s + q.feedback.score, 0) / completed.length;
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'presentation',
          role: presentationTitle,
          context: summary,
          difficulty,
          totalQuestions: completed.length,
          averageScore: Math.round(avgScore * 10) / 10,
          answers: completed.map(c => ({
            question: c.question.question,
            userAnswer: c.answer,
            score: c.feedback.score,
            feedback: JSON.stringify(c.feedback),
          })),
        }),
      });
    } catch {
      // silently fail — results still shown
    }
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="mb-8">
            <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
              ← Back
            </button>
            <h1 className="text-2xl font-extrabold text-gray-900">Presentation Practice</h1>
            <p className="text-gray-500 text-sm mt-1">
              Upload your PPTX — AI will analyze the content and run a Q&amp;A session with you.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            {/* Drop zone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Presentation File <span className="text-red-500">*</span>
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  isDragging ? 'border-indigo-400 bg-indigo-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pptx"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && setFile(e.target.files[0])}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="text-xs text-red-500 hover:text-red-700 font-medium mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="font-medium text-gray-700 text-sm">Drop your .pptx file here</span>
                    <span className="text-xs text-gray-400">or click to browse</span>
                  </div>
                )}
              </div>
            </div>

            {/* Context */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Context{' '}
                <span className="text-gray-400 font-normal">(optional — helps AI ask better questions)</span>
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value.slice(0, 300))}
                placeholder="e.g. Final year project presentation to professors · Sales pitch to investors · Conference talk for developers..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{context.length} / 300</p>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Question Difficulty</label>
              <div className="grid grid-cols-3 gap-3">
                {DIFFICULTIES.map(({ id, label, desc }) => (
                  <button
                    key={id}
                    onClick={() => setDifficulty(id)}
                    className={clsx(
                      'p-3 rounded-xl border-2 text-center transition-all',
                      difficulty === id
                        ? id === 'easy' ? 'border-emerald-500 bg-emerald-50'
                        : id === 'medium' ? 'border-blue-500 bg-blue-50'
                        : 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className={clsx('font-semibold text-sm', difficulty === id ? 'text-gray-900' : 'text-gray-600')}>{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">Number of Questions</label>
              <div className="flex gap-3">
                {QUESTION_COUNTS.map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={clsx(
                      'flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all',
                      questionCount === n ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={analyzePresentation}
              disabled={!file}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Layers className="w-5 h-5" />
              Analyze & Generate Questions
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Analyzing ───────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing your presentation…</h2>
          <p className="text-gray-500 text-sm">Reading slides · Scoring content · Generating Q&amp;A questions</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis failed</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setPhase('upload')}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
            <button onClick={() => router.push('/')} className="text-sm text-gray-600 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready — show analysis results ───────────────────────────────────────────
  if (phase === 'ready' && contentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="space-y-4 mb-6">
            {/* Presentation summary */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-lg leading-tight">{presentationTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{slideCount} slides analyzed</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </div>

            {/* Content assessment */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Content Quality Assessment</h3>
                <div className="ml-auto">
                  <ScoreBadge score={Math.round(contentAssessment.overallScore)} size="sm" />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <ScoreBar label="Structure & Flow" score={contentAssessment.structureScore} />
                <ScoreBar label="Content Depth" score={contentAssessment.contentDepthScore} />
                <ScoreBar label="Clarity" score={contentAssessment.clarityScore} />
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-4">{contentAssessment.verdict}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {contentAssessment.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-800">{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> To Improve
                  </p>
                  <ul className="space-y-1">
                    {contentAssessment.improvements.map((s, i) => (
                      <li key={i} className="text-xs text-amber-800">{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setQuestionStartTime(Date.now());
              setPhase('questioning');
              setTimeout(() => textareaRef.current?.focus(), 100);
            }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Start Q&amp;A Session — {questions.length} Questions
            <ChevronRight className="w-4 h-4" />
          </button>
        </main>
      </div>
    );
  }

  // ── Done / Results ──────────────────────────────────────────────────────────
  if (phase === 'done') {
    const qaScore = completed.reduce((s, q) => s + q.feedback.score, 0) / completed.length;
    const totalTime = completed.reduce((s, q) => s + q.timeSpent, 0);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 text-center">
            <div className="text-5xl mb-3">
              {qaScore >= 8 ? '🏆' : qaScore >= 6 ? '👍' : qaScore >= 4 ? '📚' : '💪'}
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Session Complete!</h1>
            <p className="text-gray-500 text-sm mb-5">{presentationTitle}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-indigo-600">{qaScore.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-0.5">Q&amp;A Score</div>
              </div>
              {contentAssessment && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-emerald-600">{contentAssessment.overallScore}/10</div>
                  <div className="text-xs text-gray-500 mt-0.5">Content</div>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-gray-900">{completed.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">Questions</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-gray-900">{formatTime(totalTime)}</div>
                <div className="text-xs text-gray-500 mt-0.5">Total Time</div>
              </div>
            </div>
          </div>

          {contentAssessment && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Content Quality
              </h3>
              <div className="space-y-2.5">
                <ScoreBar label="Structure & Flow" score={contentAssessment.structureScore} />
                <ScoreBar label="Content Depth" score={contentAssessment.contentDepthScore} />
                <ScoreBar label="Clarity" score={contentAssessment.clarityScore} />
              </div>
            </div>
          )}

          <div className="space-y-4 mb-6">
            {completed.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-gray-900 font-medium text-sm">{item.question.question}</p>
                  </div>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 mb-1">YOUR ANSWER</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {item.answer || <em className="text-gray-400">No answer provided</em>}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <FeedbackCard feedback={item.feedback} questionNumber={i + 1} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push('/presentation')}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              <RotateCcw className="w-4 h-4" /> New Presentation
            </button>
            <button
              onClick={() => router.push('/history')}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Q&A (questioning + feedback) ────────────────────────────────────────────
  const currentQuestion = questions[currentIdx];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <ProgressBar current={currentIdx + 1} total={questions.length} />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span className="font-medium truncate max-w-[60%]">{presentationTitle}</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-4">
          <div className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full mb-4 border border-indigo-100">
            {currentQuestion.category}
          </div>
          <h2 className="text-gray-900 font-semibold text-lg leading-snug mb-4">
            {currentQuestion.question}
          </h2>
          {currentQuestion.hints.length > 0 && (
            <div>
              <button
                onClick={() => setHintsVisible(v => !v)}
                className="flex items-center gap-1.5 text-sm text-amber-600 font-medium hover:text-amber-700 transition"
              >
                {hintsVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <Lightbulb className="w-4 h-4" />
                {hintsVisible ? 'Hide hints' : 'Show hints'}
              </button>
              {hintsVisible && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1.5">
                  {currentQuestion.hints.map((hint, i) => (
                    <p key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                      <span className="text-amber-500 mt-0.5">💡</span> {hint}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Answer area */}
        {phase === 'questioning' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer</label>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Answer as you would in a real Q&A — be specific, reference your slides if helpful."
              rows={7}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{answer.length} chars</span>
              <button
                onClick={submitAnswer}
                disabled={isFetching}
                className={clsx(
                  'flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition',
                  isFetching && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isFetching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
                  : <><Send className="w-4 h-4" /> Submit Answer</>}
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {phase === 'feedback' && currentFeedback && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-1">YOUR ANSWER</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {answer || <em className="text-gray-400">No answer provided</em>}
              </p>
            </div>
            <FeedbackCard feedback={currentFeedback} questionNumber={currentIdx + 1} />
            <button
              onClick={nextQuestion}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              {currentIdx + 1 >= questions.length ? <>🏁 See Final Results</> : <>Next Question <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
