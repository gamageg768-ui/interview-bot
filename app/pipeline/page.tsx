'use client';

import { useState } from 'react';
import {
  GitBranch, Plus, Trash2, Play, ChevronRight, Send,
  Loader2, CheckCircle2, RotateCcw, Eye, EyeOff,
  Lightbulb, AlertTriangle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ScoreBadge from '@/components/ScoreBadge';
import type { InterviewType, Difficulty, Question, AnswerFeedback } from '@/lib/types';
import clsx from 'clsx';

interface StageConfig {
  type: InterviewType;
  role: string;
  difficulty: Difficulty;
  count: number;
}

interface StageQA {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
}

interface CompletedStage {
  config: StageConfig;
  qas: StageQA[];
  averageScore: number;
}

type PipelinePhase = 'config' | 'running' | 'summary';
type StageRunPhase = 'loading' | 'answering' | 'feedback' | 'stageDone';

const TYPE_OPTIONS: { id: InterviewType; label: string }[] = [
  { id: 'technical', label: 'Technical' },
  { id: 'behavioral', label: 'Behavioral' },
  { id: 'system-design', label: 'System Design' },
  { id: 'hr', label: 'HR / Culture' },
];

const DIFFICULTY_OPTIONS: Difficulty[] = ['easy', 'medium', 'hard'];

function defaultStage(i: number): StageConfig {
  const types: InterviewType[] = ['technical', 'behavioral', 'system-design', 'hr'];
  return { type: types[i % types.length], role: 'Software Engineer', difficulty: 'medium', count: 3 };
}

export default function PipelinePage() {
  // ── Config phase ───────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<PipelinePhase>('config');
  const [pipelineName, setPipelineName] = useState('My Interview Pipeline');
  const [stages, setStages] = useState<StageConfig[]>([defaultStage(0), defaultStage(1)]);

  // ── Running phase ──────────────────────────────────────────────────────────
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [completedStages, setCompletedStages] = useState<CompletedStage[]>([]);
  const [stageRunPhase, setStageRunPhase] = useState<StageRunPhase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState<AnswerFeedback | null>(null);
  const [stageQAs, setStageQAs] = useState<StageQA[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [lastAnswer, setLastAnswer] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Config helpers ─────────────────────────────────────────────────────────
  function updateStage(i: number, patch: Partial<StageConfig>) {
    setStages(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }

  function addStage() {
    if (stages.length >= 5) return;
    setStages(prev => [...prev, defaultStage(prev.length)]);
  }

  function removeStage(i: number) {
    if (stages.length <= 1) return;
    setStages(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Start pipeline ─────────────────────────────────────────────────────────
  async function startPipeline() {
    setCompletedStages([]);
    setCurrentStageIdx(0);
    setPhase('running');
    await loadStageQuestions(0);
  }

  async function loadStageQuestions(stageIdx: number) {
    setStageRunPhase('loading');
    setError('');
    setQuestions([]);
    setCurrentQIdx(0);
    setStageQAs([]);
    setAnswer('');
    setCurrentFeedback(null);
    setHintsVisible(false);

    const stage = stages[stageIdx];
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stage.type,
          role: stage.role,
          difficulty: stage.difficulty,
          count: stage.count,
          context: '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load questions');
      setQuestions(data.questions);
      setStageRunPhase('answering');
    } catch (e) {
      setError(String(e));
      setStageRunPhase('loading'); // stays in loading but shows error
    }
  }

  async function submitStageAnswer() {
    if (!answer.trim() && !window.confirm('Submit without an answer?')) return;
    setIsFetching(true);
    const submitted = answer;
    setLastAnswer(answer);

    try {
      const stage = stages[currentStageIdx];
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stage.type,
          role: stage.role,
          context: '',
          question: questions[currentQIdx],
          answer: submitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to get feedback');

      const fb = data.feedback as AnswerFeedback;
      setCurrentFeedback(fb);
      setStageQAs(prev => [...prev, { question: questions[currentQIdx], answer: submitted, feedback: fb }]);
      setStageRunPhase('feedback');
    } catch (e) {
      alert(String(e));
    } finally {
      setIsFetching(false);
    }
  }

  function nextStageQuestion() {
    const nextQ = currentQIdx + 1;
    if (nextQ >= questions.length) {
      setStageRunPhase('stageDone');
    } else {
      setCurrentQIdx(nextQ);
      setAnswer('');
      setCurrentFeedback(null);
      setHintsVisible(false);
      setStageRunPhase('answering');
    }
  }

  async function finishStageAndAdvance() {
    const avg = stageQAs.reduce((s, q) => s + q.feedback.score, 0) / stageQAs.length;
    const done: CompletedStage = { config: stages[currentStageIdx], qas: stageQAs, averageScore: avg };
    const newCompleted = [...completedStages, done];
    setCompletedStages(newCompleted);

    const nextIdx = currentStageIdx + 1;
    if (nextIdx >= stages.length) {
      // All stages done — save and show summary
      setSaving(true);
      try {
        await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pipelineName,
            stages: stages.map((s, i) => ({ ...s, questionCount: s.count, stageOrder: i })),
            status: 'completed',
            averageScores: newCompleted.map(c => Math.round(c.averageScore * 10) / 10),
          }),
        });
      } catch { /* silently fail */ } finally {
        setSaving(false);
      }
      setPhase('summary');
    } else {
      setCurrentStageIdx(nextIdx);
      await loadStageQuestions(nextIdx);
    }
  }

  function resetAll() {
    setPhase('config');
    setCompletedStages([]);
    setCurrentStageIdx(0);
    setError('');
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── CONFIG ── */}
        {phase === 'config' && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-4">
                <GitBranch className="w-4 h-4" />
                Interview Pipeline
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Multi-Stage Pipeline</h1>
              <p className="text-gray-500 text-sm">Run multiple interview stages back-to-back and track your overall performance.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
              {/* Pipeline name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Pipeline Name</label>
                <input
                  type="text"
                  value={pipelineName}
                  onChange={e => setPipelineName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Stages */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-900">Stages ({stages.length}/5)</label>
                  <button
                    onClick={addStage}
                    disabled={stages.length >= 5}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Stage
                  </button>
                </div>

                <div className="space-y-3">
                  {stages.map((stage, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Stage {i + 1}</span>
                        <button
                          onClick={() => removeStage(i)}
                          disabled={stages.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                          <select
                            value={stage.type}
                            onChange={e => updateStage(i, { type: e.target.value as InterviewType })}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            {TYPE_OPTIONS.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Difficulty</label>
                          <select
                            value={stage.difficulty}
                            onChange={e => updateStage(i, { difficulty: e.target.value as Difficulty })}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white capitalize"
                          >
                            {DIFFICULTY_OPTIONS.map(d => (
                              <option key={d} value={d} className="capitalize">{d}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Role</label>
                          <input
                            type="text"
                            value={stage.role}
                            onChange={e => updateStage(i, { role: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Questions</label>
                          <select
                            value={stage.count}
                            onChange={e => updateStage(i, { count: parseInt(e.target.value, 10) })}
                            className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          >
                            {[3, 4, 5].map(n => <option key={n} value={n}>{n} questions</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={startPipeline}
                disabled={stages.some(s => !s.role.trim())}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Play className="w-4 h-4" />
                Start Pipeline ({stages.reduce((s, st) => s + st.count, 0)} questions total)
              </button>
            </div>
          </div>
        )}

        {/* ── RUNNING ── */}
        {phase === 'running' && (
          <div>
            {/* Pipeline progress */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-shrink-0">
                  <div className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
                    i < currentStageIdx
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : i === currentStageIdx
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                  )}>
                    {i < currentStageIdx && <CheckCircle2 className="w-3.5 h-3.5" />}
                    Stage {i + 1}: {s.type.replace(/-/g, ' ')}
                  </div>
                  {i < stages.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                </div>
              ))}
            </div>

            {/* Stage header */}
            <div className="bg-indigo-600 text-white rounded-2xl p-5 mb-5">
              <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
                Stage {currentStageIdx + 1} of {stages.length}
              </div>
              <div className="text-lg font-extrabold capitalize">
                {stages[currentStageIdx]?.type.replace(/-/g, ' ')} Interview
              </div>
              <div className="text-sm opacity-80 mt-0.5">
                {stages[currentStageIdx]?.role} · {stages[currentStageIdx]?.difficulty}
              </div>
            </div>

            {/* Loading */}
            {stageRunPhase === 'loading' && (
              <div className="text-center py-16">
                {error ? (
                  <div className="space-y-4">
                    <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                    <p className="text-sm text-gray-600">{error}</p>
                    <button
                      onClick={() => loadStageQuestions(currentStageIdx)}
                      className="flex items-center gap-2 mx-auto bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      <RotateCcw className="w-4 h-4" /> Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Generating questions for Stage {currentStageIdx + 1}…</p>
                  </>
                )}
              </div>
            )}

            {/* Answering */}
            {(stageRunPhase === 'answering' || stageRunPhase === 'feedback') && questions[currentQIdx] && (
              <div className="space-y-4">
                {/* Progress within stage */}
                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                  <span>Question {currentQIdx + 1} of {questions.length}</span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${((currentQIdx + (stageRunPhase === 'feedback' ? 1 : 0)) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                  <div className="inline-flex items-center text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 mb-4">
                    {questions[currentQIdx].category}
                  </div>
                  <h2 className="text-gray-900 font-semibold text-lg leading-snug mb-4">
                    {questions[currentQIdx].question}
                  </h2>

                  {questions[currentQIdx].hints.length > 0 && (
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
                          {questions[currentQIdx].hints.map((hint, i) => (
                            <p key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">💡</span> {hint}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Answer input */}
                {stageRunPhase === 'answering' && (
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Your Answer</label>
                    <textarea
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Type your answer here…"
                      rows={6}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={submitStageAnswer}
                        disabled={isFetching}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-70"
                      >
                        {isFetching
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
                          : <><Send className="w-4 h-4" /> Submit</>
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {stageRunPhase === 'feedback' && currentFeedback && (
                  <div className="space-y-3">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 mb-1">YOUR ANSWER</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{lastAnswer || <em>No answer</em>}</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <span className="font-semibold text-gray-900 text-sm">Feedback — Q{currentQIdx + 1}</span>
                        <ScoreBadge score={currentFeedback.score} size="sm" />
                      </div>
                      <div className="p-5 space-y-3">
                        <p className="text-sm text-gray-700">{currentFeedback.overallFeedback}</p>
                        {currentFeedback.strengths.length > 0 && (
                          <ul className="space-y-1">
                            {currentFeedback.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                                <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{s}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="bg-indigo-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-indigo-600 mb-1">MODEL ANSWER</p>
                          <p className="text-sm text-indigo-900">{currentFeedback.modelAnswer}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={nextStageQuestion}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
                    >
                      {currentQIdx + 1 >= questions.length
                        ? 'Finish Stage'
                        : <><span>Next Question</span><ChevronRight className="w-4 h-4" /></>
                      }
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Stage done */}
            {stageRunPhase === 'stageDone' && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center space-y-4">
                <div className="text-4xl">
                  {(stageQAs.reduce((s, q) => s + q.feedback.score, 0) / stageQAs.length) >= 7 ? '🎉' : '📚'}
                </div>
                <h2 className="text-lg font-extrabold text-gray-900">
                  Stage {currentStageIdx + 1} Complete
                </h2>
                <div className="text-3xl font-extrabold text-indigo-600">
                  {(stageQAs.reduce((s, q) => s + q.feedback.score, 0) / stageQAs.length).toFixed(1)}
                  <span className="text-base font-normal text-gray-400"> / 10</span>
                </div>
                <button
                  onClick={finishStageAndAdvance}
                  disabled={saving}
                  className="flex items-center gap-2 mx-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-70"
                >
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : currentStageIdx + 1 >= stages.length
                    ? '🏁 See Final Results'
                    : <><span>Start Stage {currentStageIdx + 2}</span><ChevronRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SUMMARY ── */}
        {phase === 'summary' && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center">
              <div className="text-5xl mb-3">
                {(completedStages.reduce((s, c) => s + c.averageScore, 0) / completedStages.length) >= 7 ? '🏆' : '📚'}
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Pipeline Complete!</h1>
              <p className="text-gray-500 text-sm mb-5">{pipelineName}</p>

              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {(completedStages.reduce((s, c) => s + c.averageScore, 0) / completedStages.length).toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Overall Score</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-gray-900">{completedStages.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Stages</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-2xl font-extrabold text-gray-900">
                    {completedStages.reduce((s, c) => s + c.qas.length, 0)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Questions</div>
                </div>
              </div>
            </div>

            {/* Per-stage results */}
            <div className="space-y-3">
              {completedStages.map((stage, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">
                        Stage {i + 1}
                      </div>
                      <div className="font-semibold text-gray-900 text-sm capitalize">
                        {stage.config.type.replace(/-/g, ' ')} · {stage.config.role} · {stage.config.difficulty}
                      </div>
                    </div>
                    <ScoreBadge score={stage.averageScore} size="sm" />
                  </div>

                  <div className="divide-y divide-gray-100">
                    {stage.qas.map((qa, qi) => (
                      <div key={qi} className="px-5 py-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Q{qi + 1}: {qa.question.question}</p>
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            qa.feedback.score >= 7 ? 'bg-emerald-50 text-emerald-700' :
                            qa.feedback.score >= 5 ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          )}>
                            {qa.feedback.score}/10
                          </span>
                          <p className="text-xs text-gray-500 truncate">{qa.feedback.overallFeedback}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetAll}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
              >
                <RotateCcw className="w-4 h-4" /> New Pipeline
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-700 py-3 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition"
              >
                Download Report
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
