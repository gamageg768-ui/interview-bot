import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { GraduationCap, Mic, BookOpen, Users, ArrowRight, BarChart3 } from 'lucide-react';

const FEATURES = [
  { icon: Mic,          title: 'Voice-First',      desc: 'Speak your answers aloud — just like a real oral exam.' },
  { icon: GraduationCap, title: '6 Disciplines',   desc: 'PhD defense, medical viva, law oral exam, MBA capstone & more.' },
  { icon: Users,        title: 'Custom Personas',   desc: 'Create custom AI examiners with specific backgrounds.' },
  { icon: BookOpen,     title: 'Study Materials',   desc: 'Auto-generated flashcards and outlines after each session.' },
  { icon: BarChart3,    title: 'Rubric Scoring',    desc: 'Scored on clarity, depth, defensibility, and composure.' },
];

export default function VivaLandingPage() {
  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-4">
            <GraduationCap className="w-3.5 h-3.5" />
            Viva Exam Simulator
          </span>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Prepare for your oral defense</h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Face an AI examiner modeled on PhD panels, medical vivals, law oral exams, and more.
            Real-time voice, streaming responses, and rubric scoring.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              href="/viva/setup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Start a Viva
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/viva/history"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Past Sessions
            </Link>
            <Link
              href="/viva/personas"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Users className="w-4 h-4" />
              Personas
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
