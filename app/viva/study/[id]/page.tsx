'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { vivaLoadSession } from '@/lib/viva-storage';
import type { VivaFlashcard, VivaStudyMaterials } from '@/lib/viva-types';
import { BookOpen, RefreshCw } from 'lucide-react';

export default function VivaStudyPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [materials, setMaterials] = useState<VivaStudyMaterials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [topic, setTopic] = useState('');

  useEffect(() => {
    const s = vivaLoadSession(id);
    if (s) setTopic(s.config.topic);
  }, [id]);

  async function load(force = false) {
    setLoading(true);
    setError('');
    try {
      if (force) {
        const res = await fetch('/api/viva/study-materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id }),
        });
        if (!res.ok) throw new Error(res.status === 401 ? 'Sign in to generate study materials' : 'Generation failed');
        setMaterials(await res.json());
        return;
      }

      const res = await fetch(`/api/viva/study-materials?sessionId=${id}`);
      if (res.ok) {
        const data: VivaStudyMaterials | null = await res.json();
        if (data && !('error' in data)) { setMaterials(data); return; }
      }

      // Not cached — generate
      const res2 = await fetch('/api/viva/study-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res2.ok) {
        throw new Error(res2.status === 401 ? 'Sign in to generate study materials' : 'Generation failed');
      }
      setMaterials(await res2.json());
    } catch (err) {
      setError((err as Error).message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
            {topic && <p className="text-sm text-gray-500 mt-0.5">{topic}</p>}
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Generating study materials…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {materials && !loading && (
          <div className="space-y-8">
            {/* Flashcards */}
            {materials.flashcards?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Flashcards
                  <span className="text-xs font-normal text-gray-400">(click to flip)</span>
                </h2>
                <div className="grid gap-3">
                  {materials.flashcards.map((card: VivaFlashcard, i: number) => (
                    <button
                      key={i}
                      onClick={() => setFlipped((p) => ({ ...p, [i]: !p[i] }))}
                      className={`text-left p-4 rounded-xl border transition-colors ${
                        flipped[i]
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs font-medium text-gray-400 mb-1.5">
                        {flipped[i] ? 'Answer' : 'Question'}
                      </p>
                      <p className="text-sm text-gray-900">{flipped[i] ? card.a : card.q}</p>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Outline */}
            {materials.outline && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Topic Outline</h2>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {materials.outline}
                  </pre>
                </div>
              </section>
            )}

            {/* Recommendations */}
            {materials.recommendations?.length > 0 && (
              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-3">Recommendations</h2>
                <ul className="space-y-2">
                  {(materials.recommendations as string[]).map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}
