'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Mail, Copy, Check, Loader2 } from 'lucide-react';
import type { EmailTemplateType, EmailContext } from '@/lib/types';

const TEMPLATE_TYPES: { value: EmailTemplateType; label: string; desc: string }[] = [
  { value: 'thank-you', label: 'Thank You', desc: 'After an interview' },
  { value: 'follow-up', label: 'Follow-Up', desc: 'No response yet' },
  { value: 'counter-offer', label: 'Counter Offer', desc: 'Negotiate salary' },
  { value: 'acceptance', label: 'Acceptance', desc: 'Accept the offer' },
  { value: 'withdrawal', label: 'Withdrawal', desc: 'Withdraw from process' },
];

export default function EmailTemplatesPage() {
  const [templateType, setTemplateType] = useState<EmailTemplateType>('thank-you');
  const [ctx, setCtx] = useState<EmailContext>({
    interviewerName: '',
    companyName: '',
    role: '',
    yourName: '',
    additionalContext: '',
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (!ctx.interviewerName || !ctx.companyName || !ctx.role || !ctx.yourName) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    setEmail('');
    try {
      const res = await fetch('/api/email-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType, context: ctx }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setEmail(data.email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function field(label: string, key: keyof EmailContext, placeholder: string, required = true) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type="text"
          value={ctx[key] ?? ''}
          onChange={e => setCtx(p => ({ ...p, [key]: e.target.value }))}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="text-sm text-gray-500">AI-generated professional interview emails</p>
          </div>
        </div>

        {/* Template type tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TEMPLATE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setTemplateType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                templateType === t.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 ${templateType === t.value ? 'text-indigo-200' : 'text-gray-400'}`}>
                · {t.desc}
              </span>
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Interviewer Name', 'interviewerName', 'Jane Smith')}
            {field('Your Name', 'yourName', 'Alex Johnson')}
            {field('Company', 'companyName', 'Acme Corp')}
            {field('Role', 'role', 'Software Engineer')}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Additional Context</label>
            <textarea
              value={ctx.additionalContext ?? ''}
              onChange={e => setCtx(p => ({ ...p, additionalContext: e.target.value }))}
              placeholder="e.g. counter-offer: current offer $90k, target $105k based on market data"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button
          onClick={generate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition mb-6"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : 'Generate Email'}
        </button>

        {email && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Generated Email</p>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition"
              >
                {copied ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{email}</pre>
          </div>
        )}
      </main>
    </>
  );
}
