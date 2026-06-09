'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MicButton from '@/components/viva/MicButton';
import TranscriptView from '@/components/viva/TranscriptView';
import RubricCard from '@/components/viva/RubricCard';
import ExportButton from '@/components/viva/ExportButton';
import { vivaGetActiveConfig, vivaSaveSession, newVivaTurnId } from '@/lib/viva-storage';
import { vivaSpeak, stopVivaSpeak } from '@/lib/viva-speech';
import type { VivaSession, VivaTurn, VivaRubricScores } from '@/lib/viva-types';
import { VIVA_OPENING_MESSAGE, VIVA_END_MARKER } from '@/lib/viva-prompts';
import clsx from 'clsx';

function SessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get('id') ?? '';

  const [session, setSession] = useState<VivaSession | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [partial, setPartial] = useState('');
  const [ended, setEnded] = useState(false);
  const [scores, setScores] = useState<VivaRubricScores | null>(null);
  const [scoring, setScoring] = useState(false);
  const [draft, setDraft] = useState('');
  const [tts, setTts] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchExaminer = useCallback(async (s: VivaSession, opening?: string) => {
    setStreaming(true);
    setPartial('');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const body = opening
      ? { config: s.config, turns: s.turns, pendingUserMessage: opening }
      : { config: s.config, turns: s.turns };

    let text = '';
    try {
      const res = await fetch('/api/viva/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error('Stream failed');

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setPartial(text);
      }

      const turn: VivaTurn = {
        id: newVivaTurnId(),
        role: 'examiner',
        text: text.trim(),
        timestamp: Date.now(),
      };
      setSession((prev) => {
        if (!prev) return prev;
        const next = { ...prev, turns: [...prev.turns, turn] };
        vivaSaveSession(next);
        return next;
      });
      setPartial('');
      if (tts && text.trim()) vivaSpeak(text.trim());
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('[viva/stream]', err);
    } finally {
      setStreaming(false);
    }
  }, [tts]);

  useEffect(() => {
    const config = vivaGetActiveConfig();
    if (!config || !id) { router.replace('/viva/setup'); return; }
    const s: VivaSession = { id, config, turns: [], createdAt: Date.now() };
    setSession(s);
    fetchExaminer(s, VIVA_OPENING_MESSAGE);
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(text: string) {
    if (!text.trim() || !session || streaming || ended) return;
    setDraft('');
    stopVivaSpeak();
    const turn: VivaTurn = { id: newVivaTurnId(), role: 'candidate', text: text.trim(), timestamp: Date.now() };
    const next = { ...session, turns: [...session.turns, turn] };
    setSession(next);
    vivaSaveSession(next);
    fetchExaminer(next);
  }

  async function endViva() {
    if (!session || ended) return;
    stopVivaSpeak();
    setEnded(true);

    const turn: VivaTurn = {
      id: newVivaTurnId(),
      role: 'candidate',
      text: VIVA_END_MARKER,
      timestamp: Date.now(),
    };
    const withEnd = { ...session, turns: [...session.turns, turn], endedAt: Date.now() };
    setSession(withEnd);
    vivaSaveSession(withEnd);

    await fetchExaminer(withEnd);

    setScoring(true);
    try {
      const res = await fetch('/api/viva/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: session.config, turns: session.turns }),
      });
      const data: { scores?: VivaRubricScores } = await res.json();
      if (data.scores) {
        setScores(data.scores);
        setSession((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, rubricScores: data.scores };
          vivaSaveSession(updated);
          fetch('/api/viva/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated),
          }).catch(() => {});
          return updated;
        });
      }
    } catch (err) {
      console.error('[viva/score]', err);
    } finally {
      setScoring(false);
    }
  }

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-2 flex items-center gap-4 justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 capitalize">
            {session.config.discipline.replace(/_/g, ' ')} · {session.config.difficulty}
          </p>
          <p className="text-sm font-semibold text-gray-900 truncate">{session.config.topic}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => { stopVivaSpeak(); setTts((p) => !p); }}
            className={clsx(
              'text-xs px-2.5 py-1 rounded-md border transition-colors',
              tts ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500',
            )}
          >
            {tts ? 'TTS on' : 'TTS off'}
          </button>
          <ExportButton session={session} />
          {!ended && (
            <button
              onClick={endViva}
              disabled={streaming || session.turns.length < 3}
              className="text-xs px-2.5 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors"
            >
              End Viva
            </button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <TranscriptView turns={session.turns} />
          {streaming && partial && (
            <div className="flex gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                E
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-700 max-w-[78%] italic">
                {partial}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rubric panel after end */}
      {ended && scores && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <RubricCard scores={scores} />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => router.push(`/viva/study/${session.id}`)}
                className="flex-1 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Study Materials
              </button>
              <button
                onClick={() => router.push('/viva/history')}
                className="py-2 px-4 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      {!ended && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="max-w-2xl mx-auto flex gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(draft); }
              }}
              placeholder={streaming ? 'Examiner speaking…' : 'Type or use mic… (Enter to send, Shift+Enter for newline)'}
              disabled={streaming}
              rows={2}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
            />
            <div className="flex flex-col gap-2">
              <MicButton
                onTranscript={(t) => setDraft((p) => (p.trim() ? `${p} ${t}` : t))}
                onPartial={(t) => { if (!draft) setDraft(t); }}
                disabled={streaming}
              />
              <button
                onClick={() => submit(draft)}
                disabled={!draft.trim() || streaming}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {scoring && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-xl">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">Calculating scores…</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VivaSessionPage() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Loading…
          </div>
        }
      >
        <SessionContent />
      </Suspense>
    </div>
  );
}
