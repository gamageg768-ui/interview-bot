'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { vivaLoadSessions, vivaDeleteSession } from '@/lib/viva-storage';
import { VIVA_DISCIPLINE_LABELS } from '@/lib/viva-types';
import type { VivaSession } from '@/lib/viva-types';
import { Trash2, BookOpen, Share2, Plus } from 'lucide-react';

export default function VivaHistoryPage() {
  const [sessions, setSessions] = useState<VivaSession[]>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    setSessions(vivaLoadSessions());
  }, []);

  function remove(id: string) {
    vivaDeleteSession(id);
    setSessions((p) => p.filter((s) => s.id !== id));
  }

  async function share(session: VivaSession) {
    setSharing(session.id);
    try {
      await fetch('/api/viva/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
      const res = await fetch('/api/viva/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const data: { token?: string } = await res.json();
      if (data.token) {
        const url = `${window.location.origin}/viva/share/${data.token}`;
        setShareLinks((p) => ({ ...p, [session.id]: url }));
        await navigator.clipboard.writeText(url).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSharing(null);
    }
  }

  const completed = sessions.filter((s) => s.endedAt);
  const avgScore = completed.length
    ? (
        completed
          .filter((s) => s.rubricScores)
          .reduce((sum, s) => {
            const vals = Object.values(s.rubricScores!);
            return sum + vals.reduce((a, b) => a + b, 0) / vals.length;
          }, 0) / Math.max(completed.filter((s) => s.rubricScores).length, 1)
      ).toFixed(1)
    : null;

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Viva History</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/viva/setup" className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Viva
          </Link>
        </div>

        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{sessions.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Sessions</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{completed.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Completed</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{avgScore ?? '—'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
            </div>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="mb-4">No viva sessions yet.</p>
            <Link href="/viva/setup" className="text-indigo-600 hover:underline text-sm">
              Start your first viva →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => {
              const rubricVals = s.rubricScores ? Object.values(s.rubricScores) : null;
              const avg = rubricVals
                ? (rubricVals.reduce((a, b) => a + b, 0) / rubricVals.length).toFixed(1)
                : null;
              const turnCount = s.turns.filter((t) => t.role !== 'system').length;

              return (
                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{s.config.topic}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {VIVA_DISCIPLINE_LABELS[s.config.discipline]} · {s.config.difficulty} · {turnCount} turns
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {avg && (
                      <span className="flex-shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                        {avg}/10
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <Link
                      href={`/viva/study/${s.id}`}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Study
                    </Link>
                    <button
                      onClick={() => share(s)}
                      disabled={sharing === s.id}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {sharing === s.id ? 'Sharing…' : 'Share'}
                    </button>
                    {shareLinks[s.id] && (
                      <span className="text-xs text-green-600 font-medium">Link copied!</span>
                    )}
                    <button
                      onClick={() => remove(s.id)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
