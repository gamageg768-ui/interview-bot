import type { VivaRubricScores } from '@/lib/viva-types';

interface Props {
  scores: VivaRubricScores;
}

const LABELS: [keyof VivaRubricScores, string][] = [
  ['clarity', 'Clarity'],
  ['depth', 'Depth'],
  ['defensibility', 'Defensibility'],
  ['composure', 'Composure'],
  ['timeManagement', 'Time Management'],
];

function barColor(n: number): string {
  if (n >= 8) return 'bg-green-500';
  if (n >= 6) return 'bg-indigo-500';
  if (n >= 4) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function RubricCard({ scores }: Props) {
  const avg = (Object.values(scores).reduce((a, b) => a + b, 0) / 5).toFixed(1);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Rubric Scores</h3>
        <span className="text-lg font-bold text-indigo-700">
          {avg}<span className="text-xs font-normal text-gray-500">/10</span>
        </span>
      </div>
      <div className="space-y-2">
        {LABELS.map(([key, label]) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>{label}</span>
              <span>{scores[key]}/10</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor(scores[key])} rounded-full`}
                style={{ width: `${scores[key] * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
