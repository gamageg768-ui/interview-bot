'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock, Loader2, ChevronRight, Zap,
  Target, Flame, RotateCcw, CheckCircle2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import type { PlanDay, Difficulty } from '@/lib/types';
import clsx from 'clsx';

interface Plan {
  role: string;
  company: string;
  interviewDate: string;
  days: PlanDay[];
  createdAt: string;
}

const DIFF_ICONS: Record<Difficulty, React.ElementType> = { easy: Zap, medium: Target, hard: Flame };
const DIFF_COLORS: Record<Difficulty, string> = {
  easy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  medium: 'text-blue-600 bg-blue-50 border-blue-200',
  hard: 'text-red-600 bg-red-50 border-red-200',
};

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatCountdown(dateStr: string): string {
  const days = daysUntil(dateStr);
  if (days === 0) return 'Today!';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export default function PlannerPage() {
  const router = useRouter();
  const [view, setView] = useState<'setup' | 'generating' | 'plan'>('setup');
  const [plan, setPlan] = useState<Plan | null>(null);

  // Form state
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [interviewDate, setInterviewDate] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    const saved = localStorage.getItem('interview-plan');
    if (saved) {
      try {
        const p = JSON.parse(saved) as Plan;
        if (daysUntil(p.interviewDate) > 0) {
          setPlan(p);
          setView('plan');
        }
      } catch {}
    }
  }, []);

  async function generatePlan() {
    if (!role.trim() || !interviewDate) return;
    const days = daysUntil(interviewDate);
    if (days < 1) return;

    setView('generating');
    try {
      const res = await fetch('/api/planner/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role.trim(), company: company.trim(), daysUntil: days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newPlan: Plan = {
        role: role.trim(),
        company: company.trim(),
        interviewDate,
        days: data.plan,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('interview-plan', JSON.stringify(newPlan));
      setPlan(newPlan);
      setView('plan');
    } catch {
      setView('setup');
      alert('Failed to generate plan. Please try again.');
    }
  }

  function startDay(day: PlanDay) {
    const params = new URLSearchParams({
      type: day.type,
      role: plan?.role ?? 'Software Engineer',
      difficulty: day.difficulty,
      count: String(day.count),
    });
    router.push(`/interview?${params.toString()}`);
  }

  function resetPlan() {
    localStorage.removeItem('interview-plan');
    setPlan(null);
    setView('setup');
    setRole('');
    setCompany('');
    setInterviewDate('');
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (view === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900">Interview Planner</h1>
            <p className="text-gray-500 text-sm mt-1">Set your interview date and get a day-by-day prep schedule.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Interview Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={interviewDate}
                onChange={e => setInterviewDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                max={maxDate}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {interviewDate && (
                <p className="text-xs text-indigo-600 mt-1 font-medium">
                  {formatCountdown(interviewDate)} · {Math.min(daysUntil(interviewDate), 14)} days of prep
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Software Engineer, Product Manager..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, your startup..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>

            <button
              onClick={generatePlan}
              disabled={!role.trim() || !interviewDate || daysUntil(interviewDate) < 1}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarClock className="w-5 h-5" />
              Generate Prep Plan
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Generating ─────────────────────────────────────────────────────────────
  if (view === 'generating') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Building your plan…</h2>
          <p className="text-gray-500 text-sm">AI is creating a personalized day-by-day schedule</p>
        </div>
      </div>
    );
  }

  // ── Plan view ──────────────────────────────────────────────────────────────
  if (!plan) return null;
  const remaining = daysUntil(plan.interviewDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Countdown header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-extrabold mb-1">{plan.role}</h1>
              {plan.company && <p className="text-indigo-200 text-sm mb-2">at {plan.company}</p>}
              <div className="text-3xl font-extrabold mt-2">{formatCountdown(plan.interviewDate)}</div>
              <p className="text-indigo-200 text-xs mt-1">
                {new Date(plan.interviewDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button onClick={resetPlan} className="text-indigo-200 hover:text-white transition p-1">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day-by-day schedule */}
        <div className="space-y-3">
          {plan.days.map((day, i) => {
            const DiffIcon = DIFF_ICONS[day.difficulty];
            const isPast = i < (plan.days.length - remaining);
            const isToday = i === (plan.days.length - remaining);

            return (
              <div
                key={day.day}
                className={clsx(
                  'bg-white border rounded-xl p-4 transition-all',
                  isToday ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200' : 'border-gray-200',
                  isPast && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isPast ? 'bg-gray-100 text-gray-400' : isToday ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                  )}>
                    {isPast ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : day.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{day.focus}</span>
                      {isToday && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Today</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1', DIFF_COLORS[day.difficulty])}>
                        <DiffIcon className="w-3 h-3" /> {day.difficulty}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{day.type.replace(/-/g, ' ')}</span>
                      <span className="text-xs text-gray-400">{day.count} questions</span>
                    </div>
                    <p className="text-xs text-gray-500 italic">💡 {day.tip}</p>
                  </div>
                  {!isPast && (
                    <button
                      onClick={() => startDay(day)}
                      className="flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition flex-shrink-0"
                    >
                      Start <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
