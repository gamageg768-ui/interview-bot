'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookMarked, Loader2, Trash2, ChevronRight,
  Tag, Briefcase,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import clsx from 'clsx';

interface Bookmark {
  id: string;
  questionText: string;
  type: string;
  category: string;
  role: string;
  savedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  technical: 'bg-blue-50 text-blue-700 border-blue-200',
  behavioral: 'bg-violet-50 text-violet-700 border-violet-200',
  'system-design': 'bg-orange-50 text-orange-700 border-orange-200',
  hr: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  presentation: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

export default function QuestionBankPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bookmarks')
      .then(r => r.json())
      .then(d => setBookmarks(d.bookmarks ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function removeBookmark(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/bookmarks?id=${id}`, { method: 'DELETE' });
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  function practiceQuestion(bookmark: Bookmark) {
    const params = new URLSearchParams({
      type: bookmark.type,
      role: bookmark.role || 'Software Engineer',
      difficulty: 'medium',
      count: '1',
    });
    router.push(`/interview?${params.toString()}`);
  }

  // Group by type
  const grouped = bookmarks.reduce<Record<string, Bookmark[]>>((acc, b) => {
    const key = b.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Question Bank</h1>
            <p className="text-gray-500 text-sm mt-1">
              {bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
          >
            <ChevronRight className="w-4 h-4" /> New Session
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookMarked className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No saved questions yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Bookmark questions during practice sessions using the{' '}
              <BookMarked className="w-3.5 h-3.5 inline" /> icon.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
            >
              Start Practicing
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => (
              <div key={type}>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {type.replace(/-/g, ' ')} · {items.length} question{items.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-2">
                  {items.map(bookmark => (
                    <div
                      key={bookmark.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug mb-2">
                          {bookmark.questionText}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {bookmark.category && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Tag className="w-3 h-3" /> {bookmark.category}
                            </span>
                          )}
                          {bookmark.role && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Briefcase className="w-3 h-3" /> {bookmark.role}
                            </span>
                          )}
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', TYPE_COLORS[type] ?? 'bg-gray-50 text-gray-600 border-gray-200')}>
                            {type.replace(/-/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => practiceQuestion(bookmark)}
                          className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition"
                        >
                          Practice
                        </button>
                        <button
                          onClick={() => removeBookmark(bookmark.id)}
                          disabled={deletingId === bookmark.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          {deletingId === bookmark.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
