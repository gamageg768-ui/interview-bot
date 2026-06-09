import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const sessions = await prisma.interviewSession.findMany({
      orderBy: { completedAt: 'asc' },
      include: { answers: true },
    });

    // Score over time (last 30 sessions)
    const scoreOverTime = sessions.slice(-30).map(s => ({
      date: new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.averageScore,
      type: s.type,
    }));

    // Average score by type
    const typeMap: Record<string, { total: number; count: number }> = {};
    for (const s of sessions) {
      if (!typeMap[s.type]) typeMap[s.type] = { total: 0, count: 0 };
      typeMap[s.type].total += s.averageScore;
      typeMap[s.type].count += 1;
    }
    const scoreByType = Object.entries(typeMap).map(([type, { total, count }]) => ({
      type: type.replace(/-/g, ' '),
      avgScore: Math.round((total / count) * 10) / 10,
      count,
    })).sort((a, b) => b.avgScore - a.avgScore);

    // Streak — consecutive days with at least one session
    const sessionDays = new Set(
      sessions.map(s => new Date(s.completedAt).toDateString())
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (sessionDays.has(d.toDateString())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Summary stats
    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((s, sess) => s + sess.totalQuestions, 0);
    const avgScore = totalSessions > 0
      ? Math.round((sessions.reduce((s, sess) => s + sess.averageScore, 0) / totalSessions) * 10) / 10
      : 0;
    const bestScore = totalSessions > 0
      ? Math.max(...sessions.map(s => s.averageScore))
      : 0;

    return NextResponse.json({
      scoreOverTime,
      scoreByType,
      streak,
      stats: { totalSessions, totalQuestions, avgScore, bestScore: Math.round(bestScore * 10) / 10 },
    });
  } catch (err) {
    console.error('[GET /api/analytics]', err);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
