'use client';

type AnyWindow = typeof globalThis & {
  webkitSpeechRecognition?: unknown;
  SpeechRecognition?: unknown;
};

export function isVivaSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as AnyWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function isVivaTTSSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window;
}

export interface VivaListenerHandle {
  stop: () => void;
  abort: () => void;
}

export interface VivaListenOptions {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd: () => void;
  onError: (err: string) => void;
}

export function startVivaListening(opts: VivaListenOptions): VivaListenerHandle {
  const w = window as AnyWindow;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as any;
  if (!Ctor) {
    opts.onError('Speech recognition not supported. Use Chrome or Edge on desktop.');
    return { stop: () => {}, abort: () => {} };
  }
  const recog = new Ctor();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = 'en-US';

  let finalBuf = '';

  recog.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalBuf += r[0].transcript;
      else interim += r[0].transcript;
    }
    const combined = (finalBuf + ' ' + interim).trim();
    if (combined) opts.onPartial(combined);
  };

  recog.onerror = (e: { error: string }) => {
    if (e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
      opts.onError(`Mic error: ${e.error}`);
    }
  };

  recog.onend = () => {
    if (finalBuf.trim()) opts.onFinal(finalBuf.trim());
    opts.onEnd();
  };

  try { recog.start(); } catch (err: unknown) {
    opts.onError(`Failed to start mic: ${(err as Error)?.message || err}`);
  }

  return {
    stop: () => { try { recog.stop(); } catch {} },
    abort: () => { try { recog.abort(); } catch {} },
  };
}

let _cachedVoice: SpeechSynthesisVoice | null = null;

function getExaminerVoice(): SpeechSynthesisVoice | null {
  if (!isVivaTTSSupported()) return null;
  if (_cachedVoice) return _cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred = [
    /Daniel/i, /Google UK English Male/i, /Microsoft George/i,
    /Microsoft Ryan/i, /en-GB/i, /en-US/i,
  ];
  for (const pat of preferred) {
    const v = voices.find((v) => pat.test(v.name) || pat.test(v.lang));
    if (v) { _cachedVoice = v; return v; }
  }
  _cachedVoice = voices[0];
  return _cachedVoice;
}

export interface VivaSpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
  rate?: number;
  pitch?: number;
}

export function vivaSpeak(text: string, opts: VivaSpeakOptions = {}): () => void {
  if (!isVivaTTSSupported()) { opts.onEnd?.(); return () => {}; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = getExaminerVoice();
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.98;
  u.pitch = opts.pitch ?? 0.85;
  u.volume = 1;
  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = () => { opts.onError?.('TTS error'); opts.onEnd?.(); };
  window.speechSynthesis.speak(u);
  return () => { try { window.speechSynthesis.cancel(); } catch {} };
}

export function stopVivaSpeak(): void {
  if (isVivaTTSSupported()) try { window.speechSynthesis.cancel(); } catch {}
}

export function warmUpVivaVoices(): Promise<void> {
  return new Promise((resolve) => {
    if (!isVivaTTSSupported()) return resolve();
    if (window.speechSynthesis.getVoices().length > 0) return resolve();
    const h = () => { window.speechSynthesis.removeEventListener('voiceschanged', h); resolve(); };
    window.speechSynthesis.addEventListener('voiceschanged', h);
    setTimeout(() => resolve(), 1500);
  });
}
