'use client';

import { useRef, useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { startVivaListening, isVivaSpeechSupported } from '@/lib/viva-speech';
import type { VivaListenerHandle } from '@/lib/viva-speech';
import clsx from 'clsx';

interface Props {
  onTranscript: (text: string) => void;
  onPartial?: (text: string) => void;
  disabled?: boolean;
}

export default function MicButton({ onTranscript, onPartial, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => {
    if (typeof window === 'undefined') return true;
    return isVivaSpeechSupported();
  });
  const handle = useRef<VivaListenerHandle | null>(null);

  function toggle() {
    if (listening) {
      handle.current?.stop();
      handle.current = null;
      setListening(false);
    } else {
      setListening(true);
      handle.current = startVivaListening({
        onPartial: (t) => onPartial?.(t),
        onFinal: (t) => { onTranscript(t); setListening(false); },
        onEnd: () => setListening(false),
        onError: () => setListening(false),
      });
    }
  }

  if (!supported) {
    return (
      <button disabled className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-400 bg-gray-100 cursor-not-allowed border border-gray-200">
        <MicOff className="w-4 h-4" /> No mic
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors border',
        listening
          ? 'bg-red-50 text-red-700 border-red-200 animate-pulse-slow'
          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {listening ? 'Stop' : 'Speak'}
    </button>
  );
}
