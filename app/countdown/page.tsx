'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { CalendarDays, CheckSquare, Square, RotateCcw } from 'lucide-react';

interface CountdownSetup {
  interviewDate: string;
  company: string;
  role: string;
}

interface ChecklistItem {
  id: string;
  daysThreshold: number;
  label: string;
  category: string;
}

const CHECKLIST_TEMPLATE: ChecklistItem[] = [
  { id: 'research-company', daysThreshold: 14, label: 'Research company history, mission, and recent news', category: 'Research' },
  { id: 'review-jd', daysThreshold: 14, label: 'Re-read the job description and highlight key requirements', category: 'Research' },
  { id: 'technical-review', daysThreshold: 14, label: 'Review core technical concepts for the role', category: 'Technical' },
  { id: 'star-stories', daysThreshold: 10, label: 'Prepare 5 STAR-method behavioral stories', category: 'Behavioral' },
  { id: 'system-design', daysThreshold: 10, label: 'Practice one system design question per day', category: 'Technical' },
  { id: 'mock-interview', daysThreshold: 7, label: 'Complete a full mock interview session', category: 'Practice' },
  { id: 'salary-research', daysThreshold: 7, label: 'Research market salary range for the role', category: 'Negotiation' },
  { id: 'prepare-questions', daysThreshold: 5, label: 'Prepare 5 thoughtful questions to ask the interviewer', category: 'Preparation' },
  { id: 'linkedin-review', daysThreshold: 5, label: 'Update LinkedIn profile and review your resume', category: 'Preparation' },
  { id: 'negotiate-practice', daysThreshold: 4, label: 'Practice salary negotiation responses', category: 'Negotiation' },
  { id: 'logistics', daysThreshold: 2, label: 'Confirm interview time, format (virtual/in-person), and location', category: 'Logistics' },
  { id: 'outfit', daysThreshold: 2, label: 'Prepare interview outfit or check tech setup (camera, mic)', category: 'Logistics' },
  { id: 'final-review', daysThreshold: 1, label: 'Final review of company values and your key talking points', category: 'Final Prep' },
  { id: 'rest', daysThreshold: 1, label: 'Get a good night\'s sleep — no late cramming', category: 'Final Prep' },
];

const STORAGE_KEY = 'countdown-config';
const PROGRESS_KEY = 'countdown-progress';

export default function CountdownPage() {
  const [setup, setSetup] = useState<CountdownSetup | null>(null);
  const [form, setForm] = useState<CountdownSetup>({ interviewDate: '', company: '', role: '' });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSetup(JSON.parse(saved));
      const progress = localStorage.getItem(PROGRESS_KEY);
      if (progress) setChecked(JSON.parse(progress));
    } catch { /* ignore */ }
  }, []);

  function saveSetup() {
    if (!form.interviewDate || !form.company || !form.role) {
      setError('Please fill in all fields.');
      return;
    }
    if (new Date(form.interviewDate).getTime() <= Date.now()) {
      setError('Interview date must be in the future.');
      return;
    }
    setError('');
    setSetup(form);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }

  function reset() {
    setSetup(null);
    setChecked({});
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
  }

  function toggleCheck(id: string) {
    const updated = { ...checked, [id]: !checked[id] };
    setChecked(updated);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  }

  const getCountdown = useCallback(() => {
    if (!setup) return null;
    const target = new Date(setup.interviewDate).getTime();
    const diff = target - now;
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, total: diff };
  }, [setup, now]);

  const countdown = getCountdown();
  const daysUntil = countdown ? Math.ceil(countdown.total / 86400000) : 0;

  const activeItems = setup
    ? CHECKLIST_TEMPLATE.filter(item => item.daysThreshold >= daysUntil || daysUntil >= item.daysThreshold)
    : [];
  const completedCount = activeItems.filter(i => checked[i.id]).length;

  const categories = Array.from(new Set(activeItems.map(i => i.category)));

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interview Countdown</h1>
            <p className="text-sm text-gray-500">Goal-anchored prep with daily tasks</p>
          </div>
        </div>

        {/* Setup form */}
        {!setup && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Interview Date & Time<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="datetime-local"
                value={form.interviewDate}
                onChange={e => setForm(p => ({ ...p, interviewDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  placeholder="Google"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  placeholder="Software Engineer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={saveSetup}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Start Countdown
            </button>
          </div>
        )}

        {/* Dashboard */}
        {setup && countdown && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{setup.role} at {setup.company}</p>
                <p className="text-xs text-gray-400">{new Date(setup.interviewDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition">
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            {/* Countdown clock */}
            {countdown.total > 0 ? (
              <div className="bg-indigo-600 text-white rounded-2xl p-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { value: countdown.days, label: 'Days' },
                    { value: countdown.hours, label: 'Hours' },
                    { value: countdown.minutes, label: 'Min' },
                    { value: countdown.seconds, label: 'Sec' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <div className="text-3xl font-black tabular-nums">{String(value).padStart(2, '0')}</div>
                      <div className="text-xs text-indigo-200 mt-1">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <p className="text-lg font-bold text-green-800">Interview Day!</p>
                <p className="text-sm text-green-600 mt-1">Good luck — you've got this.</p>
              </div>
            )}

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">Prep Checklist</p>
                <p className="text-xs text-gray-500">{completedCount}/{activeItems.length} done</p>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${activeItems.length > 0 ? (completedCount / activeItems.length) * 100 : 0}%` }}
                />
              </div>

              <div className="space-y-4">
                {categories.map(cat => {
                  const items = activeItems.filter(i => i.category === cat);
                  return (
                    <div key={cat}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat}</p>
                      <div className="space-y-2">
                        {items.map(item => (
                          <button
                            key={item.id}
                            onClick={() => toggleCheck(item.id)}
                            className={`w-full flex items-center gap-3 text-left p-3 rounded-xl border transition-colors ${
                              checked[item.id]
                                ? 'bg-green-50 border-green-200'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {checked[item.id]
                              ? <CheckSquare className="w-4 h-4 text-green-600 flex-shrink-0" />
                              : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            }
                            <span className={`text-sm ${checked[item.id] ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
