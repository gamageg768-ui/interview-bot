'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import StageRunner from '@/components/StageRunner';
import type { StageResult } from '@/components/StageRunner';
import { CalendarDays, Loader2, ChevronRight } from 'lucide-react';
import type { Question, InterviewType, Difficulty } from '@/lib/types';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Stage {
  label: string;
  type: InterviewType;
  count: number;
  durationMin: number;
}

const STAGES: Stage[] = [
  { label: 'Phone Screen', type: 'hr', count: 3, durationMin: 5 },
  { label: 'Technical', type: 'technical', count: 5, durationMin: 10 },
  { label: 'System Design', type: 'system-design', count: 3, durationMin: 8 },
  { label: 'Behavioral', type: 'behavioral', count: 3, durationMin: 6 },
  { label: 'Culture Fit', type: 'hr', count: 2, durationMin: 4 },
];

type PagePhase = 'setup' | 'running' | 'done';

export default function MockDayPage() {
  const [phase, setPhase] = useState<PagePhase>('setup');
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [stageIdx, setStageIdx] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [error, setError] = useState('');
  const [allResults, setAllResults] = useState<{ stage: Stage; results: StageResult[] }[]>([]);

  async function startMockDay() {
    if (!role.trim()) { setError('Please enter a role.'); return; }
    setError('');
    setAllResults([]);
    setStageIdx(0);
    setPhase('running');
    await loadStageQuestions(0);
  }

  async function loadStageQuestions(idx: number) {
    const stage = STAGES[idx];
    setLoadingQ(true);
    setError('');
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: stage.type, role, context: '', difficulty, count: stage.count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load questions');
      setQuestions(data.questions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingQ(false);
    }
  }

  function handleStageComplete(results: StageResult[]) {
    const updated = [...allResults, { stage: STAGES[stageIdx], results }];
    setAllResults(updated);

    const next = stageIdx + 1;
    if (next >= STAGES.length) {
      setPhase('done');
      return;
    }
    setStageIdx(next);
    setQuestions([]);
    loadStageQuestions(next);
  }

  // Per-stage average scores for radar
  const radarData = allResults.map(({ stage, results }) => ({
    stage: stage.label,
    score: results.length
      ? Math.round((results.reduce((s, r) => s + r.feedback.score, 0) / results.length) * 10) / 10
      : 0,
  }));

  const overallAvg = allResults.length
    ? (allResults.flatMap(s => s.results).reduce((s, r) => s + r.feedback.score, 0) /
       allResults.flatMap(s => s.results).length).toFixed(1)
    : '0';

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mock Full-Day Interview</h1>
            <p className="text-sm text-gray-500">5-stage complete interview loop simulation</p>
          </div>
        </div>

        {/* Setup */}
        {phase === 'setup' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            {/* Stage overview */}
            <div className="space-y-2">
              {STAGES.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="font-medium text-gray-900">{s.label}</span>
                  </div>
                  <span className="text-xs text-gray-400">{s.count} questions · ~{s.durationMin} min</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Software Engineer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as Difficulty)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={startMockDay}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Start Mock Interview Day
            </button>
          </div>
        )}

        {/* Running */}
        {phase === 'running' && (
          <div>
            {/* Stage progress bar */}
            <div className="flex gap-1 mb-6">
              {STAGES.map((s, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${
                    i < stageIdx ? 'bg-green-500' : i === stageIdx ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-4">Stage {stageIdx + 1} of {STAGES.length}: <strong>{STAGES[stageIdx].label}</strong></p>

            {loadingQ && (
              <div className="text-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading {STAGES[stageIdx].label} questions…</p>
              </div>
            )}
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
            {!loadingQ && questions.length > 0 && (
              <StageRunner
                stageLabel={STAGES[stageIdx].label}
                questions={questions}
                interviewType={STAGES[stageIdx].type}
                role={role}
                difficulty={difficulty}
                onComplete={handleStageComplete}
              />
            )}
          </div>
        )}

        {/* Done — final report */}
        {phase === 'done' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
              <p className="text-sm text-gray-500">Overall Score</p>
              <p className="text-5xl font-black text-indigo-600 mt-1">{overallAvg}<span className="text-2xl text-gray-400">/10</span></p>
              <p className="text-xs text-gray-400 mt-1">{role} · {difficulty}</p>
            </div>

            {radarData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-gray-900 mb-4">Performance by Stage</p>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <Radar name="Score" dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Per-stage breakdown */}
            {allResults.map(({ stage, results }, si) => (
              <div key={si} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-gray-900 text-sm">{stage.label}</p>
                  <span className="text-sm font-bold text-indigo-600">
                    {results.length ? (results.reduce((s, r) => s + r.feedback.score, 0) / results.length).toFixed(1) : '—'}/10
                  </span>
                </div>
                <div className="space-y-2">
                  {results.map((r, ri) => (
                    <div key={ri} className="flex items-start gap-2 text-xs text-gray-600">
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="flex-1 line-clamp-1">{r.question.question}</span>
                      <span className="font-medium text-gray-900 flex-shrink-0">{r.feedback.score}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={() => { setPhase('setup'); setAllResults([]); setStageIdx(0); setQuestions([]); }}
              className="w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Start Over
            </button>
          </div>
        )}
      </main>
    </>
  );
}
