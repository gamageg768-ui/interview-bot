'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';
import {
  BrainCircuit, History, Home, BarChart2,
  BookMarked, CalendarClock, Layers, GitBranch, GraduationCap, LogIn, LogOut,
  Mail, Search, DollarSign, CalendarDays, Timer,
} from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/presentation', label: 'Slides', icon: Layers },
    { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
    { href: '/planner', label: 'Planner', icon: CalendarClock },
    { href: '/viva', label: 'Viva', icon: GraduationCap },
    { href: '/mock-day', label: 'Mock Day', icon: CalendarDays },
    { href: '/negotiate', label: 'Negotiate', icon: DollarSign },
    { href: '/email-templates', label: 'Emails', icon: Mail },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/countdown', label: 'Countdown', icon: Timer },
    { href: '/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/question-bank', label: 'Saved', icon: BookMarked },
    { href: '/history', label: 'History', icon: History },
  ];

  function isActive(href: string) {
    if (!pathname) return false;
    return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 no-print">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 flex-shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg hidden sm:inline">InterviewAI</span>
          <span className="hidden md:inline text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Groq
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive(href)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          ))}

          {status !== 'loading' && (
            session ? (
              <button
                onClick={() => signOut()}
                title={`Sign out (${session.user?.name ?? session.user?.email})`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ml-1"
              >
                {session.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                <span className="hidden lg:inline">Sign out</span>
              </button>
            ) : (
              <button
                onClick={() => signIn()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors ml-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Sign in</span>
              </button>
            )
          )}
        </div>
      </div>
    </nav>
  );
}
