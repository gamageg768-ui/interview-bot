import clsx from 'clsx';

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 6) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (score >= 4) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function getScoreLabel(score: number) {
  if (score >= 9) return 'Excellent';
  if (score >= 7) return 'Good';
  if (score >= 5) return 'Fair';
  if (score >= 3) return 'Weak';
  return 'Poor';
}

export default function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1 font-semibold rounded-full border',
        colorClass,
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-3 py-1',
        size === 'lg' && 'text-lg px-4 py-1.5'
      )}
    >
      <span>{score}/10</span>
      <span className="opacity-70">·</span>
      <span>{label}</span>
    </div>
  );
}

export { getScoreColor, getScoreLabel };
