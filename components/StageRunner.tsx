'use client';

import { useState } from 'react';
import { Loader2, ChevronRight, Send } from 'lucide-react';
import FeedbackCard from '@/components/FeedbackCard';
import type { Question, AnswerFeedback, InterviewType, Difficulty } from '@/lib/types';

export interface StageResult {
  question: Question;
  answer: string;
  feedback: AnswerFeedback;
}

interface Props {
  stageLabel: string;
  questions: Question[];
  interviewType: InterviewType;
  role: string;
  difficulty: Difficulty;
  onComplete: (results: StageResult[]) => void;
}

type StagePhase = 'answering' | 'feedback';

export default function StageRunner({ stageLabel, questions, interviewType, role, difficulty, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [phase, setPhase] = useState<StagePhase>('answering');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<StageResult[]>([]);

  const current = questions[idx];

  async function submit() {
    if (!answer.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: interviewType, role, context: '', question: current, answer, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setFeedback(data.feedback);
      setPhase('feedback');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function next() {
    const newResults = [...results, { question: current, answer, feedback: feedback! }];
    if (idx + 1 >= questions.length) {
      onComplete(newResults);
      return;
    }
    setResults(newResults);
    setIdx(i => i + 1);
    setAnswer('');
    setFeedback(null);
    setPhase('answering');
    setError('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{stageLabel}</span>
        <span className="text-xs text-gray-400">Q{idx + 1}/{questions.length}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-900 leading-relaxed">{current.question}</p>
        <p className="text-xs text-gray-400 mt-1">{current.category}</p>
      </div>

      {phase === 'answering' && (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Type your answer…"
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={submit}
            disabled={loading || !answer.trim()}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating…</>
              : <><Send className="w-4 h-4" /> Submit Answer</>
            }
          </button>
        </div>
      )}

      {phase === 'feedback' && feedback && (
        <div className="space-y-4">
          <FeedbackCard feedback={feedback} questionNumber={idx + 1} />
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
          >
            {idx + 1 >= questions.length ? 'Complete Stage' : <>Next Question <ChevronRight className="w-4 h-4" /></>}
          </button>
        </div>
      )}
    </div>
  );
}
