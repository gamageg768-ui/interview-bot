import { CheckCircle2, AlertCircle, Lightbulb, MessageSquare, TrendingUp } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import type { AnswerFeedback } from '@/lib/types';

interface FeedbackCardProps {
  feedback: AnswerFeedback;
  questionNumber: number;
  improvement?: { suggestions: string[]; improvedDraft: string } | null;
}

export default function FeedbackCard({ feedback, questionNumber, improvement }: FeedbackCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-gray-900 text-sm">
            Feedback — Q{questionNumber}
          </span>
        </div>
        <ScoreBadge score={feedback.score} size="sm" />
      </div>

      <div className="p-5 space-y-4">
        {/* Overall feedback */}
        <p className="text-gray-700 text-sm leading-relaxed">{feedback.overallFeedback}</p>

        {/* Strengths */}
        {feedback.strengths.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">Strengths</span>
            </div>
            <ul className="space-y-1.5">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {feedback.improvements.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">Areas to Improve</span>
            </div>
            <ul className="space-y-1.5">
              {feedback.improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {imp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Model Answer */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">Model Answer</span>
          </div>
          <p className="text-sm text-indigo-900 leading-relaxed">{feedback.modelAnswer}</p>
        </div>

        {/* Improved draft (from Improve Editor) */}
        {improvement && (
          <div className="bg-violet-50 border border-violet-100 rounded-lg p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">Your Improved Draft</span>
            </div>
            <p className="text-sm text-violet-900 leading-relaxed">{improvement.improvedDraft}</p>
          </div>
        )}
      </div>
    </div>
  );
}
