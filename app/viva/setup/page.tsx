'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  VivaDiscipline, VivaDifficulty, VivaModelId, VivaSessionConfig,
  VIVA_DISCIPLINE_LABELS, VIVA_DIFFICULTY_LABELS, VIVA_MODEL_LABELS,
} from '@/lib/viva-types';
import { vivaSetActiveConfig, newVivaSessionId } from '@/lib/viva-storage';

const DISCIPLINES = Object.entries(VIVA_DISCIPLINE_LABELS) as [VivaDiscipline, string][];
const DIFFICULTIES = Object.entries(VIVA_DIFFICULTY_LABELS) as [VivaDifficulty, string][];
const MODELS = Object.entries(VIVA_MODEL_LABELS) as [VivaModelId, string][];

export default function VivaSetupPage() {
  const router = useRouter();
  const [discipline, setDiscipline] = useState<VivaDiscipline>('phd_thesis_defense');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<VivaDifficulty>('firm');
  const [candidateName, setCandidateName] = useState('');
  const [examinerName, setExaminerName] = useState('');
  const [allowInterruptions, setAllowInterruptions] = useState(true);
  const [model, setModel] = useState<VivaModelId>('llama-3.3-70b-versatile');

  function start() {
    if (!topic.trim()) return;
    const config: VivaSessionConfig = {
      discipline,
      topic: topic.trim(),
      difficulty,
      candidateName: candidateName.trim() || undefined,
      examinerName: examinerName.trim() || undefined,
      allowInterruptions,
      model,
    };
    vivaSetActiveConfig(config);
    router.push(`/viva/session?id=${newVivaSessionId()}`);
  }

  return (
    <>
      <Navbar />
      <main className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Configure your Viva</h1>
        <p className="text-sm text-gray-500 mb-8">Set up the exam before facing the examiner.</p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Discipline</label>
            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value as VivaDiscipline)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DISCIPLINES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Topic / Thesis Title <span className="text-red-500">*</span>
            </label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Machine learning-based drug discovery in oncology"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Examiner difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setDifficulty(v)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                    difficulty === v
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name (optional)</label>
              <input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Examiner name (optional)</label>
              <input
                value={examinerName}
                onChange={(e) => setExaminerName(e.target.value)}
                placeholder="e.g. Prof. Smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">AI Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as VivaModelId)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="interruptions"
              checked={allowInterruptions}
              onChange={(e) => setAllowInterruptions(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="interruptions" className="text-sm text-gray-700">
              Allow examiner interruptions
            </label>
          </div>

          <button
            onClick={start}
            disabled={!topic.trim()}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Begin Viva
          </button>
        </div>
      </main>
    </>
  );
}
