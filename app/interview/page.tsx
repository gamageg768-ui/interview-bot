'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lightbulb, Send, Loader2, ChevronRight, Clock,
  Eye, EyeOff, AlertTriangle, RotateCcw,
  BookmarkPlus, BookmarkCheck, Printer,
  ChevronDown, ChevronUp, ShieldAlert, Wand2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import FeedbackCard from '@/components/FeedbackCard';
import VoiceInput from '@/components/VoiceInput';
import AnswerMetricsPanel from '@/components/AnswerMetricsPanel';
import { computeAnswerMetrics } from '@/lib/answer-metrics';
import type { Question, AnswerFeedback, InterviewType, CoachingReport } from '@/lib/types';
import clsx from 'clsx';

interface SessionQuestion {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
  timeSpent: number;
  followUpQuestion?: string;
  followUpAnswer?: string;
  stressChallenge?: string;
  stressChallengeAnswer?: string;
}

type Phase = 'loading' | 'answering' | 'follow-up' | 'feedback' | 'stress' | 'done' | 'error';

function InterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const config = {
    type: (searchParams.get('type') ?? 'technical') as InterviewType,
    role: searchParams.get('role') ?? 'Software Engineer',
    context: searchParams.get('context') ?? '',
    difficulty: searchParams.get('difficulty') ?? 'medium',
    count: parseInt(searchParams.get('count') ?? '5', 10),
    timed: searchParams.get('timed') === '1',
    timeLimit: parseInt(searchParams.get('timeLimit') ?? '180', 10),
    followUp: searchParams.get('followUp') === '1',
    stressMode: searchParams.get('stressMode') === '1',
  };

  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [completed, setCompleted] = useState<SessionQuestion[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());
  const [bookmarking, setBookmarking] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [lastAnswer, setLastAnswer] = useState('');
  const [coachingReport, setCoachingReport] = useState<CoachingReport | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingExpanded, setCoachingExpanded] = useState(false);

  // Stress mode
  const [stressChallenge, setStressChallenge] = useState('');
  const [stressChallengeAnswer, setStressChallengeAnswer] = useState('');
  const [stressLoading, setStressLoading] = useState(false);

  // Improve editor
  const [improveLoading, setImproveLoading] = useState(false);
  const [improvement, setImprovement] = useState<{ suggestions: string[]; improvedDraft: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => { loadQuestions(); }, []);

  // Timer — resets per question via elapsedSeconds reset in nextQuestion()
  useEffect(() => {
    if (phase === 'answering') {
      autoSubmittedRef.current = false;
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (
      config.timed &&
      phase === 'answering' &&
      elapsedSeconds >= config.timeLimit &&
      !autoSubmittedRef.current &&
      !isFetching
    ) {
      autoSubmittedRef.current = true;
      submitAnswer(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, isFetching]);

  async function loadQuestions() {
    setPhase('loading');
    setError('');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          role: config.role,
          context: config.context,
          difficulty: config.difficulty,
          count: config.count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load questions');
      setQuestions(data.questions);
      setPhase('answering');
      setQuestionStartTime(Date.now());
    } catch (e) {
      setError(String(e));
      setPhase('error');
    }
  }

  async function submitAnswer(autoSubmit = false) {
    if (!autoSubmit && !answer.trim() && !window.confirm('Submit without an answer?')) return;
    setIsFetching(true);
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);
    const submittedAnswer = answer;
    setLastAnswer(answer);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          role: config.role,
          context: config.context,
          question: questions[currentIdx],
          answer: submittedAnswer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get feedback');

      const feedback = data.feedback as AnswerFeedback;
      setCurrentFeedback(feedback);

      const sessionQ: SessionQuestion = {
        question: questions[currentIdx],
        answer: submittedAnswer,
        feedback,
        timeSpent,
      };

      if (config.followUp) {
        try {
          const fuRes = await fetch('/api/follow-up', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: config.type,
              role: config.role,
              context: config.context,
              question: questions[currentIdx],
              answer: submittedAnswer,
            }),
          });
          const fuData = await fuRes.json();
          if (fuRes.ok && fuData.followUpQuestion) {
            setFollowUpQuestion(fuData.followUpQuestion);
            setFollowUpAnswer('');
            setCompleted(prev => [...prev, sessionQ]);
            setPhase('follow-up');
            return;
          }
        } catch {
          // fall through to normal feedback
        }
      }

      setCompleted(prev => [...prev, sessionQ]);

      if (config.stressMode) {
        setStressLoading(true);
        setStressChallenge('');
        setStressChallengeAnswer('');
        setPhase('feedback');
        try {
          const stRes = await fetch('/api/stress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: config.type, role: config.role, context: config.context,
              question: questions[currentIdx], answer: submittedAnswer,
            }),
          });
          const stData = await stRes.json();
          if (stRes.ok && stData.challenge) setStressChallenge(stData.challenge);
        } catch { /* silently fail */ } finally {
          setStressLoading(false);
        }
      } else {
        setPhase('feedback');
      }
    } catch (e) {
      alert(`Error: ${e}`);
    } finally {
      setIsFetching(false);
    }
  }

  async function handleImprove() {
    if (!answer.trim() || improveLoading) return;
    setImproveLoading(true);
    setImprovement(null);
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type, role: config.role, context: config.context,
          question: questions[currentIdx], answer,
        }),
      });
      const data = await res.json();
      if (res.ok && data.improvement) setImprovement(data.improvement);
    } catch { /* silently fail */ } finally {
      setImproveLoading(false);
    }
  }

  function submitFollowUp() {
    setCompleted(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          followUpQuestion,
          followUpAnswer,
        };
      }
      return updated;
    });
    setPhase('feedback');
  }

  async function nextQuestion() {
    // Attach stress challenge data to last completed question if present
    if (config.stressMode && stressChallenge) {
      setCompleted(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            stressChallenge,
            stressChallengeAnswer,
          };
        }
        return updated;
      });
    }

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
      setFollowUpQuestion('');
      setFollowUpAnswer('');
      setStressChallenge('');
      setStressChallengeAnswer('');
      setImprovement(null);
      setPhase('answering');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }

  async function saveSession() {
    setPhase('done');
    const snapshot = completed;

    try {
      const avgScore = snapshot.reduce((s, q) => s + q.feedback.score, 0) / snapshot.length;
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          role: config.role,
          context: config.context,
          difficulty: config.difficulty,
          totalQuestions: snapshot.length,
          averageScore: Math.round(avgScore * 10) / 10,
          answers: snapshot.map(c => ({
            question: c.question.question,
            userAnswer: c.answer,
            score: c.feedback.score,
            feedback: JSON.stringify(c.feedback),
          })),
        }),
      });
    } catch {
      // silently fail
    }

    // Generate coaching report asynchronously
    setCoachingLoading(true);
    try {
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          role: config.role,
          context: config.context,
          completedQAs: snapshot.map(c => ({
            question: c.question.question,
            answer: c.answer,
            score: c.feedback.score,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok && data.report) setCoachingReport(data.report);
    } catch {
      // silently fail
    } finally {
      setCoachingLoading(false);
    }
  }

  async function toggleBookmark(idx: number) {
    if (bookmarked.has(idx) || bookmarking) return;
    setBookmarking(true);
    try {
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: questions[idx].question,
          type: config.type,
          category: questions[idx].category,
          role: config.role,
        }),
      });
      setBookmarked(prev => { const s = new Set(prev); s.add(idx); return s; });
    } catch {
      // silently fail
    } finally {
      setBookmarking(false);
    }
  }

  const timeRemaining = config.timed ? Math.max(0, config.timeLimit - elapsedSeconds) : null;
  const timerUrgency =
    timeRemaining === null ? 'normal'
    : timeRemaining <= config.timeLimit * 0.2 ? 'red'
    : timeRemaining <= config.timeLimit * 0.5 ? 'amber'
    : 'normal';

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Generating your questions…</h2>
          <p className="text-gray-500 text-sm">
            Creating {config.count} {config.difficulty} {config.type} questions for <strong>{config.role}</strong>
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={loadQuestions} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition text-sm">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button onClick={() => router.push('/')} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Done / Results ─────────────────────────────────────────────────────────
  if (phase === 'done') {
    const avgScore = completed.reduce((s, q) => s + q.feedback.score, 0) / completed.length;
    const totalTime = completed.reduce((s, q) => s + q.timeSpent, 0);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-10">
          {/* Summary Header */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6 text-center">
            <div className="text-5xl mb-3">
              {avgScore >= 8 ? '🏆' : avgScore >= 6 ? '👍' : avgScore >= 4 ? '📚' : '💪'}
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Interview Complete!</h1>
            <p className="text-gray-500 text-sm mb-5">{config.role} · {config.type} · {config.difficulty}</p>
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-2xl font-extrabold text-indigo-600">{avgScore.toFixed(1)}</div>
                <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
              </div>
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

          {/* Coaching Report */}
          {(coachingLoading || coachingReport) && (
            <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm mb-6 overflow-hidden no-print">
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition"
                onClick={() => setCoachingExpanded(v => !v)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-lg">🎯</div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900 text-sm">AI Coaching Report</div>
                    <div className="text-xs text-gray-500">
                      {coachingLoading ? 'Generating personalized insights…' : 'Personalized feedback & study plan'}
                    </div>
                  </div>
                </div>
                {coachingLoading
                  ? <Loader2 className="w-4 h-4 text-indigo-600 animate-spin flex-shrink-0" />
                  : coachingExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
              </button>

              {coachingExpanded && coachingReport && (
                <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
                  <p className="text-sm text-gray-700">{coachingReport.summary}</p>
                  {coachingReport.strengths.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Strengths</div>
                      <ul className="space-y-1">
                        {coachingReport.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {coachingReport.areasToImprove.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Areas to Improve</div>
                      <ul className="space-y-1">
                        {coachingReport.areasToImprove.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-amber-500 mt-0.5 flex-shrink-0">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {coachingReport.studyTopics.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Study Topics</div>
                      <div className="flex flex-wrap gap-2">
                        {coachingReport.studyTopics.map((t, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {coachingReport.nextSteps.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Next Steps</div>
                      <ol className="space-y-1">
                        {coachingReport.nextSteps.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-indigo-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>{s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* All Q&A */}
          <div className="space-y-4 mb-6">
            {completed.map((item, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print-break">
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
                {item.followUpQuestion && (
                  <div className="px-5 py-3 bg-indigo-50 border-b border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-400 mb-1">FOLLOW-UP</p>
                    <p className="text-sm text-indigo-900 font-medium mb-2">{item.followUpQuestion}</p>
                    {item.followUpAnswer && (
                      <>
                        <p className="text-xs font-semibold text-gray-400 mb-1">YOUR FOLLOW-UP ANSWER</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.followUpAnswer}</p>
                      </>
                    )}
                  </div>
                )}
                <div className="px-5 py-4">
                  <FeedbackCard feedback={item.feedback} questionNumber={i + 1} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 no-print">
            <button
              onClick={() => router.push('/')}
              className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl font-semibold border border-gray-200 hover:bg-gray-50 transition"
            >
              <Printer className="w-4 h-4" /> Download Report
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

  // ─── Answering / Follow-up / Feedback ───────────────────────────────────────
  const currentQuestion = questions[currentIdx];
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-6">
          <ProgressBar current={currentIdx + 1} total={questions.length} />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span className="font-medium capitalize">{config.type} · {config.role}</span>
            <div className={clsx(
              'flex items-center gap-1 font-mono font-semibold',
              timerUrgency === 'red' ? 'text-red-600' : timerUrgency === 'amber' ? 'text-amber-600' : 'text-gray-500'
            )}>
              <Clock className="w-3.5 h-3.5" />
              {config.timed && timeRemaining !== null ? formatTime(timeRemaining) : formatTime(elapsedSeconds)}
              {config.timed && timerUrgency === 'red' && (
                <span className="ml-1 animate-pulse">⚠</span>
              )}
            </div>
          </div>
          {config.timed && timeRemaining !== null && (
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-1000',
                  timerUrgency === 'red' ? 'bg-red-500' : timerUrgency === 'amber' ? 'bg-amber-400' : 'bg-indigo-500'
                )}
                style={{ width: `${(timeRemaining / config.timeLimit) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Stress Mode banner */}
        {config.stressMode && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-red-700 font-medium">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            Stress Mode — the AI will challenge your answers after each submission
          </div>
        )}

        {/* Question Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-4 animate-slide-up">
          <div className="flex items-start justify-between mb-4">
            <div className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {currentQuestion.category}
            </div>
            {phase === 'answering' && (
              <button
                onClick={() => toggleBookmark(currentIdx)}
                disabled={bookmarking || bookmarked.has(currentIdx)}
                title="Bookmark this question"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-indigo-600 disabled:opacity-50"
              >
                {bookmarked.has(currentIdx)
                  ? <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  : <BookmarkPlus className="w-4 h-4" />
                }
              </button>
            )}
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

        {/* Answering phase */}
        {phase === 'answering' && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-4 animate-fade-in">
            {config.timed && timerUrgency === 'red' && (
              <div className="text-xs text-red-600 font-semibold mb-2 animate-pulse">
                ⚠ Running low on time — wrap up your answer!
              </div>
            )}
            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer</label>
            <textarea
              ref={textareaRef}
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here… Be detailed, use examples, and structure your thoughts clearly."
              rows={7}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{answer.length} chars</span>
                <VoiceInput
                  onTranscript={text => setAnswer(prev => prev ? prev + ' ' + text : text)}
                  disabled={isFetching}
                />
                <button
                  onClick={handleImprove}
                  disabled={improveLoading || !answer.trim() || isFetching}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-40 transition"
                  title="Get AI suggestions to improve your answer"
                >
                  {improveLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Wand2 className="w-3.5 h-3.5" />
                  }
                  {improveLoading ? 'Improving…' : 'Improve'}
                </button>
              </div>
              <button
                onClick={() => submitAnswer(false)}
                disabled={isFetching}
                className={clsx(
                  'flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition',
                  isFetching && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isFetching
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
                  : <><Send className="w-4 h-4" /> Submit Answer</>
                }
              </button>
            </div>

            {/* Improve Answer Panel */}
            {improvement && (
              <div className="mt-3 bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3 animate-slide-up">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-800">AI Suggestions</span>
                </div>
                <ul className="space-y-1.5">
                  {improvement.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-violet-900">
                      <span className="text-violet-500 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ul>
                {improvement.improvedDraft && (
                  <div className="bg-white border border-violet-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-violet-500 mb-1.5">IMPROVED DRAFT</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{improvement.improvedDraft}</p>
                  </div>
                )}
                <button
                  onClick={() => { setAnswer(improvement.improvedDraft); setImprovement(null); }}
                  className="flex items-center gap-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-lg transition"
                >
                  Apply Improved Draft
                </button>
              </div>
            )}
          </div>
        )}

        {/* Follow-up phase */}
        {phase === 'follow-up' && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">Follow-up Question</div>
              <p className="text-gray-900 font-semibold text-base">{followUpQuestion}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer</label>
              <textarea
                value={followUpAnswer}
                onChange={e => setFollowUpAnswer(e.target.value)}
                placeholder="Dig deeper into your previous answer…"
                rows={5}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setPhase('feedback')}
                  className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Skip →
                </button>
                <div className="flex items-center gap-2">
                  <VoiceInput
                    onTranscript={text => setFollowUpAnswer(prev => prev ? prev + ' ' + text : text)}
                    disabled={false}
                  />
                  <button
                    onClick={submitFollowUp}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
                  >
                    <Send className="w-4 h-4" /> Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback phase */}
        {phase === 'feedback' && currentFeedback && (
          <div className="space-y-4 animate-slide-up">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 mb-1">YOUR ANSWER</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {lastAnswer || <em className="text-gray-400">No answer provided</em>}
              </p>
            </div>

            <FeedbackCard feedback={currentFeedback} questionNumber={currentIdx + 1} />

            {lastAnswer && questions[currentIdx] && (
              <AnswerMetricsPanel
                metrics={computeAnswerMetrics(lastAnswer, questions[currentIdx].expectedTopics)}
              />
            )}

            {/* Stress Challenge */}
            {config.stressMode && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-700">Stress Challenge</span>
                </div>
                {stressLoading ? (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating challenge…
                  </div>
                ) : stressChallenge ? (
                  <>
                    <p className="text-gray-900 font-medium text-sm">{stressChallenge}</p>
                    <textarea
                      value={stressChallengeAnswer}
                      onChange={e => setStressChallengeAnswer(e.target.value)}
                      placeholder="Defend your position or address the challenge…"
                      rows={3}
                      className="w-full border border-red-200 bg-white rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                    />
                  </>
                ) : null}
              </div>
            )}

            <button
              onClick={nextQuestion}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              {currentIdx + 1 >= questions.length
                ? <>🏁 See Final Results</>
                : <>Next Question <ChevronRight className="w-4 h-4" /></>
              }
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    }>
      <InterviewSession />
    </Suspense>
  );
}
