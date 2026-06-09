'use client';

import { VivaSession, VivaSessionConfig } from './viva-types';

const SESSIONS_KEY = 'interview-bot::viva-sessions';
const ACTIVE_KEY   = 'interview-bot::viva-config';

export function vivaLoadSessions(): VivaSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as VivaSession[]) : [];
  } catch { return []; }
}

export function vivaSaveSession(session: VivaSession): void {
  if (typeof window === 'undefined') return;
  const all = vivaLoadSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) all[idx] = session; else all.unshift(session);
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, 50)));
}

export function vivaDeleteSession(id: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(vivaLoadSessions().filter((s) => s.id !== id))
  );
}

export function vivaLoadSession(id: string): VivaSession | null {
  return vivaLoadSessions().find((s) => s.id === id) || null;
}

export function vivaSetActiveConfig(config: VivaSessionConfig): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(config));
}

export function vivaGetActiveConfig(): VivaSessionConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as VivaSessionConfig) : null;
  } catch { return null; }
}

export function newVivaSessionId(): string {
  return `viva_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newVivaTurnId(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}
