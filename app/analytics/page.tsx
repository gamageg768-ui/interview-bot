'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Loader2, TrendingUp, Target, Flame, Zap, BarChart2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

interface AnalyticsData {
  scoreOverTime: { date: string; score: number; type: string }[];
  scoreByType: { type: string; avgScore: number; count: number }[];
  streak: number;
  stats: { totalSessions: number; totalQuestions: number; avgScore: number; bestScore: number };
}

const TYPE_COLORS: Record<string, string> = {
  technical: '#6366f1',
  behavioral: '#8b5cf6',
  'system design': '#f97316',
  hr: '#10b981',
  'university admissions': '#3b82f6',
  scholarship: '#eab308',
  club: '#8b5cf6',
  sports: '#f97316',
  volunteer: '#f43f5e',
  presentation: '#06b6d4',
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.stats.totalSessions === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No data yet</h3>
          <p className="text-sm text-gray-500 mb-4">Complete some interview sessions to see your analytics.</p>
          <button onClick={() => router.push('/')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 transition">
            Start Practicing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900">Progress Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Track your interview practice performance over time</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Sessions" value={data.stats.totalSessions} icon={Target} color="bg-indigo-50 text-indigo-600" />
          <StatCard label="Questions" value={data.stats.totalQuestions} icon={Zap} color="bg-violet-50 text-violet-600" />
          <StatCard label="Avg Score" value={`${data.stats.avgScore}/10`} icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
          <StatCard label="Best Score" value={`${data.stats.bestScore}/10`} icon={Flame} color="bg-amber-50 text-amber-600" />
        </div>

        {data.streak > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <div>
              <div className="font-bold text-gray-900">{data.streak}-day streak!</div>
              <div className="text-xs text-gray-500">Keep practicing every day</div>
            </div>
          </div>
        )}

        {/* Score over time */}
        {data.scoreOverTime.length > 1 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Score Trend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.scoreOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [v != null ? `${Number(v).toFixed(1)}/10` : '—', 'Score']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Score by type */}
        {data.scoreByType.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Average Score by Type</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.scoreByType} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [v != null ? `${Number(v).toFixed(1)}/10` : '—', 'Avg Score']}
                />
                <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
                  {data.scoreByType.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={TYPE_COLORS[entry.type] ?? '#6366f1'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 space-y-2">
              {data.scoreByType.map(({ type, avgScore, count }) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 capitalize w-32 flex-shrink-0">{type}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${avgScore * 10}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-12 text-right">{avgScore}/10</span>
                  <span className="text-xs text-gray-400 w-16 text-right">{count} session{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
