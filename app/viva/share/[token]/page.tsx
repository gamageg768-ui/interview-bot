'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import TranscriptView from '@/components/viva/TranscriptView';
import RubricCard from '@/components/viva/RubricCard';
import ExportButton from '@/components/viva/ExportButton';
import { VIVA_DISCIPLINE_LABELS } from '@/lib/viva-types';
import type { VivaSession } from '@/lib/viva-types';

export default function VivaSharePage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';

  const [session, setSession] = useState<VivaSession | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('Invalid link.'); setLoading(false); return; }

    async function load() {
      try {
        const tokenRes = await fetch(`/api/viva/share?token=${token}`);
        if (!tokenRes.ok) { setError('This link has expired or is invalid.'); return; }
        const { sessionId }: { sessionId: string } = await tokenRes.json();

        const sessionRes = await fetch(`/api/viva/sessions/${sessionId}`);
        if (!sessionRes.ok) { setError('Session not found.'); return; }
        setSession(await sessionRes.json());
      } catch {
        setError('Failed to load shared session.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">{error}</p>
          </div>
        )}

        {session && !loading && (
          <>
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 truncate">{session.config.topic}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {VIVA_DISCIPLINE_LABELS[session.config.discipline]} · {session.config.difficulty}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(session.createdAt).toLocaleString()}
                </p>
              </div>
              <ExportButton session={session} />
            </div>

            {session.rubricScores && (
              <div className="mb-6">
                <RubricCard scores={session.rubricScores} />
              </div>
            )}

            {session.verdict && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <h3 className="text-xs font-semibold text-indigo-800 uppercase tracking-wide mb-2">Verdict</h3>
                <p className="text-sm text-indigo-900">{session.verdict}</p>
              </div>
            )}

            <TranscriptView turns={session.turns} />
          </>
        )}
      </main>
    </>
  );
}
