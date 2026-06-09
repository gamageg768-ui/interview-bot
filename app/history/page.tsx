'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, Code2, Users, Server, Handshake,
  ChevronDown, ChevronUp, Loader2,
  BarChart3, Plus, GraduationCap, BookOpen,
  Award, Trophy, Heart, Wand2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ScoreBadge, { getScoreColor } from '@/components/ScoreBadge';
import type { AnswerFeedback } from '@/lib/types';
import clsx from 'clsx';

interface HistoryAnswer {
  id: string;
  question: string;
  userAnswer: string;
  score: number;
  feedback: string;
}

interface HistorySession {
  id: string;
  type: string;
  role: string;
  difficulty: string;
  totalQuestions: number;
  averageScore: number;
  completedAt: string;
  answers: HistoryAnswer[];
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  technical: Code2,
  behavioral: Users,
  'system-design': Server,
  hr: Handshake,
  'school-admissions': GraduationCap,
  'university-admissions': BookOpen,
  scholarship: Award,
  club: Users,
  sports: Trophy,
  volunteer: Heart,
  custom: Wand2,
  presentation: BarChart3,
};

const DIFF_COLORS: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-200',
  hard: 'bg-red-50 text-red-700 border-red-200',
};

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => setSessions(d.sessions ?? []))
      .finally(() => setLoading(false));
  }, []);

  function toggleSession(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Session History</h1>
            <p className="text-gray-500 text-sm mt-1">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} completed
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>

        {/* Stats overview */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold text-indigo-600">{sessions.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Sessions</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold text-gray-900">
                {sessions.reduce((s, sess) => s + sess.totalQuestions, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Questions</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-extrabold text-gray-900">
                {(sessions.reduce((s, sess) => s + sess.averageScore, 0) / sessions.length).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Avg Score</div>
            </div>
          </div>
        )}

        {/* Sessions list */}
        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-sm text-gray-500 mb-4">Complete an interview to see your history here.</p>
            <button
              onClick={() => router.push('/')}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition"
            >
              Start Practicing
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              const TypeIcon = TYPE_ICONS[session.type] ?? Code2;
              const isExpanded = expandedId === session.id;

              return (
                <div key={session.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Session header */}
                  <button
                    onClick={() => toggleSession(session.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{session.role}</span>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full border font-medium', DIFF_COLORS[session.difficulty])}>
                          {session.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 capitalize">{session.type.replace('-', ' ')}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{session.totalQuestions} questions</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(session.completedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ScoreBadge score={Math.round(session.averageScore)} size="sm" />
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Q&A */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4 animate-fade-in">
                      {session.answers.map((ans, i) => {
                        let feedback: AnswerFeedback | null = null;
                        try { feedback = JSON.parse(ans.feedback); } catch {}

                        return (
                          <div key={ans.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Question */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                                  {i + 1}
                                </span>
                                <p className="text-sm font-medium text-gray-900">{ans.question}</p>
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              {/* Answer */}
                              <div>
                                <p className="text-xs font-semibold text-gray-400 mb-1">YOUR ANSWER</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {ans.userAnswer || <em className="text-gray-400">No answer</em>}
                                </p>
                              </div>

                              {/* Score + feedback */}
                              {feedback && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <ScoreBadge score={ans.score} size="sm" />
                                    <span className="text-xs text-gray-500">{feedback.overallFeedback}</span>
                                  </div>

                                  {feedback.modelAnswer && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                                      <p className="text-xs font-semibold text-indigo-700 mb-1">Model Answer</p>
                                      <p className="text-xs text-indigo-900 leading-relaxed">{feedback.modelAnswer}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
