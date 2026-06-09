'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import { Plus, Trash2 } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  background: string;
  specialization?: string | null;
  institution?: string | null;
}

export default function VivaPersonasPage() {
  const { data: auth } = useSession();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [institution, setInstitution] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) return;
    fetch('/api/viva/personas')
      .then((r) => r.json())
      .then((data: Persona[]) => setPersonas(data))
      .catch(() => {});
  }, [auth]);

  async function create() {
    if (!name.trim() || !background.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/viva/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, background, specialization, institution }),
      });
      if (!res.ok) {
        const d: { error?: string } = await res.json();
        setError(d.error ?? 'Failed to create persona');
        return;
      }
      const p: Persona = await res.json();
      setPersonas((prev) => [p, ...prev]);
      setName(''); setBackground(''); setSpecialization(''); setInstitution('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Examiner Personas</h1>
        <p className="text-sm text-gray-500 mb-8">
          Create custom AI examiners with specific backgrounds and specializations.
        </p>

        {!auth && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
            Sign in to save and manage custom personas.
          </div>
        )}

        {auth && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">New Persona</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prof. Zhang"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Institution</label>
                <input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="MIT"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Background *</label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Senior professor with 30 years in molecular biology, known for probing methodology and demanding precise definitions…"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Specialization</label>
              <input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="CRISPR gene editing"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              onClick={create}
              disabled={saving || !name.trim() || !background.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Saving…' : 'Create Persona'}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {personas.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  {p.institution && <p className="text-xs text-gray-500">{p.institution}</p>}
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{p.background}</p>
                  {p.specialization && (
                    <p className="text-xs text-indigo-600 mt-0.5">Specializes in: {p.specialization}</p>
                  )}
                </div>
                <button
                  onClick={() => setPersonas((pp) => pp.filter((x) => x.id !== p.id))}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {personas.length === 0 && auth && (
            <p className="text-sm text-gray-400 text-center py-8">
              No personas yet. Create your first examiner above.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
