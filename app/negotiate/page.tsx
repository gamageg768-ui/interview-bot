'use client';

import { useState, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { DollarSign, Send, Loader2, RotateCcw } from 'lucide-react';
import type { NegotiationScenario, NegotiationTurn } from '@/lib/types';

type Phase = 'setup' | 'chat' | 'done';

function gradeResult(achieved: number, target: number, offered: number): { grade: string; color: string } {
  const pct = target > offered ? (achieved - offered) / (target - offered) : 1;
  if (pct >= 0.9) return { grade: 'A', color: 'text-green-600' };
  if (pct >= 0.6) return { grade: 'B', color: 'text-indigo-600' };
  return { grade: 'C', color: 'text-amber-600' };
}

export default function NegotiatePage() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [scenario, setScenario] = useState<NegotiationScenario>({
    role: '',
    company: '',
    offeredSalary: 90000,
    targetSalary: 110000,
    yearsExperience: 3,
  });
  const [history, setHistory] = useState<NegotiationTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [finalOffer, setFinalOffer] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function startNegotiation() {
    if (!scenario.role || !scenario.company) {
      setError('Please fill in role and company.');
      return;
    }
    setError('');
    setHistory([]);
    setFinalOffer(null);
    setPhase('chat');
    await sendMessage("Hi, I'm excited about the offer. I'd like to discuss the compensation package.");
  }

  async function sendMessage(msg?: string) {
    const userMsg = (msg ?? input).trim();
    if (!userMsg) return;
    if (!msg) setInput('');

    const newHistory: NegotiationTurn[] = [
      ...history,
      { role: 'user', message: userMsg },
    ];
    setHistory(newHistory);
    setLoading(true);

    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, history, userMessage: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      setHistory([...newHistory, { role: 'recruiter', message: data.aiMessage }]);
      if (data.isComplete) {
        setFinalOffer(data.finalOffer ?? scenario.offeredSalary);
        setPhase('done');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhase('setup');
    setHistory([]);
    setFinalOffer(null);
    setError('');
  }

  const numInput = (label: string, key: keyof NegotiationScenario, min: number) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        value={scenario[key] as number}
        onChange={e => setScenario(p => ({ ...p, [key]: Number(e.target.value) }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Salary Negotiation Simulator</h1>
            <p className="text-sm text-gray-500">Practice negotiating with an AI recruiter</p>
          </div>
        </div>

        {/* Setup */}
        {phase === 'setup' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={scenario.role}
                  onChange={e => setScenario(p => ({ ...p, role: e.target.value }))}
                  placeholder="Software Engineer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={scenario.company}
                  onChange={e => setScenario(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {numInput('Offered Salary ($)', 'offeredSalary', 30000)}
              {numInput('Target Salary ($)', 'targetSalary', 30000)}
              {numInput('Years Experience', 'yearsExperience', 0)}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={startNegotiation}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Start Negotiation
            </button>
          </div>
        )}

        {/* Chat */}
        {phase === 'chat' && (
          <div className="flex flex-col">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 text-xs text-indigo-800">
              Offer: <strong>${scenario.offeredSalary.toLocaleString()}</strong> · Target: <strong>${scenario.targetSalary.toLocaleString()}</strong> · Role: {scenario.role} at {scenario.company}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-64 max-h-96 overflow-y-auto space-y-3 mb-4">
              {history.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-xl px-4 py-2.5 text-sm ${
                    t.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${t.role === 'user' ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {t.role === 'user' ? 'You' : 'Recruiter'}
                    </p>
                    {t.message}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && sendMessage()}
                placeholder="Your response…"
                disabled={loading}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && finalOffer !== null && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-500 mb-1">Final Offer</p>
              <p className="text-4xl font-bold text-gray-900 mb-1">${finalOffer.toLocaleString()}</p>
              <p className="text-sm text-gray-400">
                Started at ${scenario.offeredSalary.toLocaleString()} · Target was ${scenario.targetSalary.toLocaleString()}
              </p>
              <div className={`text-5xl font-black mt-4 ${gradeResult(finalOffer, scenario.targetSalary, scenario.offeredSalary).color}`}>
                {gradeResult(finalOffer, scenario.targetSalary, scenario.offeredSalary).grade}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 max-h-72 overflow-y-auto space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transcript</p>
              {history.map((t, i) => (
                <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-xl px-3 py-2 text-xs ${
                    t.role === 'user' ? 'bg-indigo-100 text-indigo-900' : 'bg-gray-100 text-gray-700'
                  }`}>{t.message}</div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <RotateCcw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}
      </main>
    </>
  );
}
