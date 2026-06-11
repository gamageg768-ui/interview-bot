'use client';

import type { AnswerMetrics } from '@/lib/types';

interface Props {
  metrics: AnswerMetrics;
}

function MetricBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-indigo-500' : 'bg-amber-500';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span className="font-medium text-gray-900">{value}{unit}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AnswerMetricsPanel({ metrics }: Props) {
  const mins = Math.floor(metrics.estimatedSpeakingTimeSec / 60);
  const secs = metrics.estimatedSpeakingTimeSec % 60;
  const timeLabel = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Answer Quality Metrics</p>
      <div className="space-y-3">
        <MetricBar label="Word count" value={metrics.wordCount} max={200} unit=" words" />
        <MetricBar label="Speaking time" value={metrics.estimatedSpeakingTimeSec} max={120} unit="s" />
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Topic coverage</span>
            <span className="font-medium text-gray-900">{metrics.topicCoveragePercent}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metrics.topicCoveragePercent >= 70 ? 'bg-green-500' : metrics.topicCoveragePercent >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`}
              style={{ width: `${metrics.topicCoveragePercent}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Structure score</span>
            <span className="font-medium text-gray-900">{metrics.structureScore}/100</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${metrics.structureScore >= 70 ? 'bg-green-500' : metrics.structureScore >= 40 ? 'bg-indigo-500' : 'bg-amber-500'}`}
              style={{ width: `${metrics.structureScore}%` }}
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-3">Estimated speaking time: {timeLabel}</p>
    </div>
  );
}
