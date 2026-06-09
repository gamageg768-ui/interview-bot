'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Code2, Users, Server, Handshake,
  Zap, Target, Flame, ChevronRight,
  BrainCircuit, Sparkles, GraduationCap,
  BookOpen, Award, Trophy, Heart, Wand2, Briefcase,
  Layers, Timer, Upload, X, FileText, Loader2, ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import type { InterviewType, Difficulty, ResumeProfile } from '@/lib/types';
import clsx from 'clsx';

type Mode = 'professional' | 'life';

const TIME_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
];

const PROFESSIONAL_TYPES = [
  { id: 'technical' as InterviewType, label: 'Technical', description: 'Algorithms, data structures, coding', icon: Code2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'behavioral' as InterviewType, label: 'Behavioral', description: 'STAR-method situational questions', icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { id: 'system-design' as InterviewType, label: 'System Design', description: 'Architecture, scalability, trade-offs', icon: Server, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { id: 'hr' as InterviewType, label: 'HR / Culture', description: 'Motivation, teamwork, culture fit', icon: Handshake, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

const LIFE_TYPES = [
  { id: 'school-admissions' as InterviewType, label: 'School', description: 'High school, academy, program', icon: GraduationCap, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', placeholder: 'e.g. MIT STEM Academy, Phillips Exeter...' },
  { id: 'university-admissions' as InterviewType, label: 'University', description: 'College admissions & transfers', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', placeholder: 'e.g. Harvard Computer Science, Stanford MBA...' },
  { id: 'scholarship' as InterviewType, label: 'Scholarship', description: 'Merit awards & fellowships', icon: Award, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', placeholder: 'e.g. Gates Scholarship, Rhodes Fellowship...' },
  { id: 'club' as InterviewType, label: 'Club / Org', description: 'Student groups & organizations', icon: Users, color: 'text-violet-600 bg-violet-50 border-violet-200', placeholder: 'e.g. Robotics Club, Student Council...' },
  { id: 'sports' as InterviewType, label: 'Sports', description: 'Teams, tryouts & activities', icon: Trophy, color: 'text-orange-600 bg-orange-50 border-orange-200', placeholder: 'e.g. Varsity Soccer, Swimming Team...' },
  { id: 'volunteer' as InterviewType, label: 'Volunteer', description: 'Community service & NGOs', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-200', placeholder: 'e.g. Red Cross, Habitat for Humanity...' },
  { id: 'custom' as InterviewType, label: 'Other', description: 'Any custom scenario', icon: Wand2, color: 'text-gray-600 bg-gray-50 border-gray-200', placeholder: 'e.g. Research Assistant, Youth Program...' },
];

const JOB_ROLES = [
  'Software Engineer', 'Frontend Engineer', 'Backend Engineer', 'Full-Stack Engineer',
  'Senior Software Engineer', 'Staff Engineer', 'Data Scientist', 'ML Engineer',
  'DevOps / SRE', 'Product Manager', 'Engineering Manager', 'Mobile Developer',
];

const DIFFICULTIES: { id: Difficulty; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'easy', label: 'Easy', icon: Zap, description: 'Foundational & approachable' },
  { id: 'medium', label: 'Medium', icon: Target, description: 'Genuine thought required' },
  { id: 'hard', label: 'Hard', icon: Flame, description: 'Probing & in-depth' },
];

const QUESTION_COUNTS = [3, 5, 7, 10];

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('professional');

  // Professional state
  const [proType, setProType] = useState<InterviewType>('technical');
  const [role, setRole] = useState('Software Engineer');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);

  // Life & Education state
  const [lifeType, setLifeType] = useState<InterviewType>('university-admissions');
  const [applyingFor, setApplyingFor] = useState('');
  const [background, setBackground] = useState('');

  // Shared
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);

  // Session options
  const [timedMode, setTimedMode] = useState(false);
  const [timeLimitSec, setTimeLimitSec] = useState(180);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [stressMode, setStressMode] = useState(false);

  // Resume upload (professional mode)
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [resumeContext, setResumeContext] = useState('');
  const [resumeError, setResumeError] = useState('');

  const selectedLifeTypeDef = LIFE_TYPES.find(t => t.id === lifeType)!;

  const canStart = mode === 'professional'
    ? (isCustomRole ? customRole.trim().length > 0 : true)
    : applyingFor.trim().length > 0;

  async function handleResumeUpload(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setResumeError('Only PDF files are supported');
      return;
    }
    setResumeUploading(true);
    setResumeError('');
    setResumeProfile(null);
    setResumeContext('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resume/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to parse resume');
      setResumeProfile(data.profile);
      setResumeContext(data.profile.experienceSummary ?? '');
    } catch (e) {
      setResumeError(String(e));
    } finally {
      setResumeUploading(false);
    }
  }

  function clearResume() {
    setResumeProfile(null);
    setResumeContext('');
    setResumeError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleStart = () => {
    if (!canStart) return;

    const type = mode === 'professional' ? proType : lifeType;
    const finalRole = mode === 'professional'
      ? (isCustomRole ? customRole.trim() : role)
      : applyingFor.trim();
    const context = mode === 'professional' ? resumeContext : background.trim();

    const params = new URLSearchParams({
      type,
      role: finalRole,
      difficulty,
      count: String(questionCount),
      ...(context && { context }),
      ...(timedMode && { timed: '1', timeLimit: String(timeLimitSec) }),
      ...(followUpMode && { followUp: '1' }),
      ...(stressMode && { stressMode: '1' }),
    });
    router.push(`/interview?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by Groq + Llama 3.3
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">
            AI Interview Practice
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Prep for any interview — jobs, universities, clubs, scholarships, and more.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-8">

          {/* Mode toggle */}
          <div className="flex gap-1.5 bg-gray-100 p-1.5 rounded-xl">
            <button
              onClick={() => setMode('professional')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
                mode === 'professional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Briefcase className="w-4 h-4" />
              Job Interview
            </button>
            <button
              onClick={() => setMode('life')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all',
                mode === 'life' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <GraduationCap className="w-4 h-4" />
              Life & Education
            </button>
          </div>

          {/* ── PROFESSIONAL MODE ── */}
          {mode === 'professional' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Interview Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {PROFESSIONAL_TYPES.map(({ id, label, description, icon: Icon, color }) => (
                    <button
                      key={id}
                      onClick={() => setProType(id)}
                      className={clsx(
                        'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                        proType === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0', color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Job Role</label>
                {!isCustomRole ? (
                  <div className="space-y-2">
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button
                      onClick={() => setIsCustomRole(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Enter a custom role
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customRole}
                      onChange={e => setCustomRole(e.target.value)}
                      placeholder="e.g. React Native Developer, AI Research Scientist..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                    />
                    <button
                      onClick={() => { setIsCustomRole(false); setCustomRole(''); }}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      ← Back to presets
                    </button>
                  </div>
                )}
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Resume{' '}
                  <span className="text-gray-400 font-normal">(optional — AI will personalize questions)</span>
                </label>

                {!resumeProfile ? (
                  <div>
                    <label
                      htmlFor="resume-upload"
                      className={clsx(
                        'flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition-all',
                        resumeUploading
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      )}
                    >
                      {resumeUploading
                        ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin flex-shrink-0" />
                        : <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      }
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {resumeUploading ? 'Parsing resume…' : 'Upload PDF resume'}
                        </div>
                        <div className="text-xs text-gray-400">PDF only · Questions will reference your background</div>
                      </div>
                    </label>
                    <input
                      id="resume-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleResumeUpload(f); }}
                    />
                    {resumeError && (
                      <p className="text-xs text-red-600 mt-1.5">{resumeError}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                    <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900">
                        {resumeProfile.name || resumeProfile.currentRole || 'Resume uploaded'}
                      </div>
                      {resumeProfile.currentRole && resumeProfile.name && (
                        <div className="text-xs text-indigo-700 mt-0.5">{resumeProfile.currentRole}</div>
                      )}
                      {resumeProfile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {resumeProfile.skills.slice(0, 5).map(s => (
                            <span key={s} className="text-xs bg-white border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {resumeProfile.skills.length > 5 && (
                            <span className="text-xs text-indigo-500">+{resumeProfile.skills.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button onClick={clearResume} className="p-1 text-gray-400 hover:text-red-500 transition flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── LIFE & EDUCATION MODE ── */}
          {mode === 'life' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Scenario</label>
                <div className="grid grid-cols-2 gap-3">
                  {LIFE_TYPES.map(({ id, label, description, icon: Icon, color }, index) => (
                    <button
                      key={id}
                      onClick={() => setLifeType(id)}
                      className={clsx(
                        'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                        index === LIFE_TYPES.length - 1 && LIFE_TYPES.length % 2 !== 0 && 'col-span-2',
                        lifeType === id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <div className={clsx('w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0', color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Applying For <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={applyingFor}
                  onChange={e => setApplyingFor(e.target.value)}
                  placeholder={selectedLifeTypeDef.placeholder}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">
                  Your Background{' '}
                  <span className="text-gray-400 font-normal">(optional — AI will personalize questions)</span>
                </label>
                <textarea
                  value={background}
                  onChange={e => setBackground(e.target.value.slice(0, 500))}
                  placeholder="Tell us about yourself — academic history, achievements, relevant experiences, why you're interested…"
                  rows={4}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 resize-none"
                />
                <p className="text-xs text-gray-400 text-right mt-1">{background.length} / 500</p>
              </div>
            </>
          )}

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Difficulty</label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTIES.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => setDifficulty(id)}
                  className={clsx(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                    difficulty === id
                      ? id === 'easy' ? 'border-emerald-500 bg-emerald-50'
                      : id === 'medium' ? 'border-blue-500 bg-blue-50'
                      : 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  )}
                >
                  <Icon className={clsx(
                    'w-5 h-5',
                    difficulty === id
                      ? id === 'easy' ? 'text-emerald-600' : id === 'medium' ? 'text-blue-600' : 'text-red-600'
                      : 'text-gray-400'
                  )} />
                  <span className={clsx('text-sm font-semibold', difficulty === id ? 'text-gray-900' : 'text-gray-600')}>{label}</span>
                  <span className="text-xs text-gray-500 text-center">{description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Number of Questions</label>
            <div className="flex gap-3">
              {QUESTION_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setQuestionCount(n)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all',
                    questionCount === n ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Session Options */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Session Options</label>
            <div className="grid grid-cols-2 gap-3">
              {/* Timed Mode */}
              <button
                onClick={() => setTimedMode(v => !v)}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                  timedMode ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0',
                  timedMode ? 'text-amber-600 bg-amber-100 border-amber-300' : 'text-gray-400 bg-gray-50 border-gray-200'
                )}>
                  <Timer className="w-4 h-4" />
                </div>
                <div>
                  <div className={clsx('font-semibold text-sm', timedMode ? 'text-gray-900' : 'text-gray-600')}>Timed Mode</div>
                  <div className="text-xs text-gray-500 mt-0.5">Auto-submit when time runs out</div>
                </div>
              </button>

              {/* Follow-up Questions */}
              <button
                onClick={() => setFollowUpMode(v => !v)}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                  followUpMode ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0',
                  followUpMode ? 'text-violet-600 bg-violet-100 border-violet-300' : 'text-gray-400 bg-gray-50 border-gray-200'
                )}>
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <div className={clsx('font-semibold text-sm', followUpMode ? 'text-gray-900' : 'text-gray-600')}>Follow-up Questions</div>
                  <div className="text-xs text-gray-500 mt-0.5">AI digs deeper after each answer</div>
                </div>
              </button>

              {/* Stress Mode */}
              <button
                onClick={() => setStressMode(v => !v)}
                className={clsx(
                  'flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all col-span-2',
                  stressMode ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <div className={clsx(
                  'w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0',
                  stressMode ? 'text-red-600 bg-red-100 border-red-300' : 'text-gray-400 bg-gray-50 border-gray-200'
                )}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className={clsx('font-semibold text-sm', stressMode ? 'text-red-700' : 'text-gray-600')}>
                    Stress Mode {stressMode && <span className="text-xs font-normal ml-1">— Active</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">AI pushes back with tough challenges after each answer</div>
                </div>
              </button>
            </div>

            {/* Time limit selector */}
            {timedMode && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">Time per question:</p>
                <div className="flex gap-2">
                  {TIME_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setTimeLimitSec(value)}
                      className={clsx(
                        'flex-1 py-1.5 rounded-lg border font-medium text-xs transition-all',
                        timeLimitSec === value
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <BrainCircuit className="w-5 h-5" />
            Start Interview Session
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Presentation Practice banner */}
        <Link
          href="/presentation"
          className="mt-4 flex items-center gap-4 bg-white border border-gray-200 rounded-2xl shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm">Presentation Practice</div>
            <div className="text-xs text-gray-500 mt-0.5">Upload a .pptx — AI analyzes your slides and runs a Q&amp;A session</div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition flex-shrink-0" />
        </Link>

        <p className="text-center text-xs text-gray-400 mt-6">
          Questions are generated fresh for every session using Groq&apos;s ultra-fast inference.
        </p>
      </main>
    </div>
  );
}
