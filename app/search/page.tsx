'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Search, BookMarked, History, SlidersHorizontal } from 'lucide-react';
import type { SavedSession } from '@/lib/types';

interface Bookmark {
  id: string;
  questionText: string;
  type: string;
  category: string;
  role: string;
  savedAt: string;
}

type FilterSource = 'all' | 'sessions' | 'bookmarks';

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-100 text-yellow-900 rounded px-0.5">{p}</mark>
      : p
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<FilterSource>('all');
  const [typeFilter, setTypeFilter] = useState('');

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sRes, bRes] = await Promise.all([
          fetch('/api/sessions?all=1'),
          fetch('/api/bookmarks'),
        ]);
        const sData = sRes.ok ? await sRes.json() : { sessions: [] };
        const bData = bRes.ok ? await bRes.json() : { bookmarks: [] };
        setSessions(sData.sessions ?? []);
        setBookmarks(bData.bookmarks ?? []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const q = debouncedQuery.toLowerCase().trim();

  const filteredSessions = useCallback(() => {
    if (source === 'bookmarks') return [];
    return sessions.filter(s => {
      if (typeFilter && s.type !== typeFilter) return false;
      if (!q) return true;
      return (
        s.role.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.answers.some(a =>
          a.question.toLowerCase().includes(q) || a.userAnswer.toLowerCase().includes(q)
        )
      );
    });
  }, [sessions, q, source, typeFilter]);

  const filteredBookmarks = useCallback(() => {
    if (source === 'sessions') return [];
    return bookmarks.filter(b => {
      if (typeFilter && b.type !== typeFilter) return false;
      if (!q) return true;
      return (
        b.questionText.toLowerCase().includes(q) ||
        b.role.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }, [bookmarks, q, source, typeFilter]);

  const allTypes = Array.from(new Set([
    ...sessions.map(s => s.type),
    ...bookmarks.map(b => b.type),
  ])).sort();

  const fSessions = filteredSessions();
  const fBookmarks = filteredBookmarks();
  const totalResults = fSessions.length + fBookmarks.length;

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Global Search</h1>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search questions, answers, roles…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters:
          </div>
          {(['all', 'sessions', 'bookmarks'] as FilterSource[]).map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors capitalize ${
                source === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
          {allTypes.length > 0 && (
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 focus:outline-none"
            >
              <option value="">All types</option>
              {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>

        {loading && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && (
          <>
            {q && <p className="text-xs text-gray-400 mb-4">{totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{debouncedQuery}&rdquo;</p>}

            {/* Sessions */}
            {fSessions.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Sessions
                </h2>
                <div className="space-y-2">
                  {fSessions.map(s => (
                    <Link
                      key={s.id}
                      href={`/history`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{highlight(s.role, debouncedQuery)}</span>
                        <span className="text-xs text-gray-400">{s.type} · {s.difficulty}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {s.totalQuestions} questions · avg {s.averageScore?.toFixed(1)}/10 · {new Date(s.completedAt).toLocaleDateString()}
                      </p>
                      {q && s.answers.filter(a =>
                        a.question.toLowerCase().includes(q) || a.userAnswer.toLowerCase().includes(q)
                      ).slice(0, 2).map(a => (
                        <p key={a.id} className="text-xs text-gray-600 mt-1.5 line-clamp-1">
                          Q: {highlight(a.question, debouncedQuery)}
                        </p>
                      ))}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Bookmarks */}
            {fBookmarks.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <BookMarked className="w-3.5 h-3.5" /> Saved Questions
                </h2>
                <div className="space-y-2">
                  {fBookmarks.map(b => (
                    <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-4">
                      <p className="text-sm text-gray-900">{highlight(b.questionText, debouncedQuery)}</p>
                      <p className="text-xs text-gray-400 mt-1">{b.type} · {b.role} · {b.category}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!loading && totalResults === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">{q ? 'No results found.' : 'Start typing to search.'}</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
