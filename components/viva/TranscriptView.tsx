'use client';

import { useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { VivaTurn } from '@/lib/viva-types';

interface Props {
  turns: VivaTurn[];
  annotations?: Record<string, string>;
  onAnnotate?: (turnId: string) => void;
}

export default function TranscriptView({ turns, annotations, onAnnotate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns.length]);

  const visible = turns.filter((t) => t.role !== 'system');

  if (!visible.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        The viva will begin here…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((turn) => {
        const isExaminer = turn.role === 'examiner';
        const annotation = annotations?.[turn.id];

        return (
          <div key={turn.id} className={clsx('flex gap-3', !isExaminer && 'flex-row-reverse')}>
            <div
              className={clsx(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                isExaminer ? 'bg-gray-800 text-white' : 'bg-indigo-600 text-white',
              )}
            >
              {isExaminer ? 'E' : 'C'}
            </div>

            <div className={clsx('max-w-[78%]', !isExaminer && 'items-end flex flex-col')}>
              <div
                className={clsx(
                  'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  isExaminer
                    ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
                    : 'bg-indigo-600 text-white rounded-tr-sm',
                )}
              >
                {turn.text}
                {turn.interrupted && (
                  <span className="ml-2 text-xs opacity-60 italic">(interrupted)</span>
                )}
              </div>

              {annotation && (
                <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded italic">
                  {annotation}
                </p>
              )}

              {onAnnotate && (
                <button
                  onClick={() => onAnnotate(turn.id)}
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  {annotation ? 'Edit note' : '+ note'}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
