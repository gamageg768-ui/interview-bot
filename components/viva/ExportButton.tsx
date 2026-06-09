'use client';

import { Download } from 'lucide-react';
import { downloadVivaTranscript } from '@/lib/viva-export';
import type { VivaSession } from '@/lib/viva-types';

interface Props {
  session: VivaSession;
  className?: string;
}

export default function ExportButton({ session, className }: Props) {
  return (
    <button
      onClick={() => downloadVivaTranscript(session)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ${className ?? ''}`}
    >
      <Download className="w-3.5 h-3.5" />
      Export
    </button>
  );
}
