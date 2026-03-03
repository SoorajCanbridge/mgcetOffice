'use client';

import { GraduationCap, BookOpen, Sparkles } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function RootLoading() {
  const { theme } = useTheme();
  const currentTheme = theme || 'system';
  const isDark = currentTheme === 'dark';

  return (
    <div
      className={`relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br ${
        isDark
          ? 'from-slate-950 via-slate-900 to-slate-950'
          : 'from-slate-100 via-slate-50 to-slate-100'
      }`}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div
          className={`absolute -top-40 -left-32 h-80 w-80 rounded-full bg-gradient-to-br blur-3xl ${
            isDark
              ? 'from-indigo-500/40 via-sky-500/40 to-emerald-400/40'
              : 'from-indigo-400/35 via-sky-400/35 to-emerald-400/35'
          }`}
        />
        <div
          className={`absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr blur-3xl ${
            isDark
              ? 'from-fuchsia-500/35 via-violet-500/35 to-sky-400/35'
              : 'from-fuchsia-400/30 via-violet-400/30 to-sky-400/30'
          }`}
        />
      </div>

      <div
        className={`relative z-10 flex flex-col items-center gap-6 px-4 text-center ${
          isDark ? 'text-slate-100' : 'text-slate-900'
        }`}
      >
        {/* Animated badge */}
        <div
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] shadow-[0_12px_35px_rgba(15,23,42,0.25)] backdrop-blur-xl animate-pulse ${
            isDark
              ? 'border-white/15 bg-slate-900/70 text-slate-300/80'
              : 'border-slate-200/80 bg-white/80 text-slate-600'
          }`}
        >
          <Sparkles
            className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-300' : 'text-emerald-500'}`}
          />
          <span>Loading your campus</span>
        </div>

        {/* Education icon + orbiting books */}
        <div className="relative h-32 w-32">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br blur-xl ${
              isDark
                ? 'from-indigo-500/40 via-violet-500/40 to-emerald-400/40'
                : 'from-indigo-400/35 via-violet-400/35 to-emerald-400/35'
            }`}
          />
          <div
            className={`relative flex h-full w-full items-center justify-center rounded-full border bg-opacity-90 shadow-[0_16px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl ${
              isDark ? 'border-white/15 bg-slate-950/90' : 'border-slate-200/80 bg-white/90'
            }`}
          >
            <GraduationCap
              className={`h-12 w-12 ${isDark ? 'text-sky-200' : 'text-sky-500'}`}
            />
          </div>

          {/* Orbiting book icons */}
          <div className="pointer-events-none absolute inset-0 animate-[spin_9s_linear_infinite]">
            <div
              className={`absolute -top-1 left-1/2 h-6 w-6 -translate-x-1/2 rounded-full border shadow-sm backdrop-blur flex items-center justify-center ${
                isDark ? 'border-white/10 bg-slate-900/90' : 'border-slate-200/80 bg-white/90'
              }`}
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${isDark ? 'text-indigo-200' : 'text-indigo-500'}`}
              />
            </div>
            <div
              className={`absolute bottom-1 right-0 h-6 w-6 rounded-full border shadow-sm backdrop-blur flex items-center justify-center ${
                isDark ? 'border-white/10 bg-slate-900/90' : 'border-slate-200/80 bg-white/90'
              }`}
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-200' : 'text-emerald-500'}`}
              />
            </div>
            <div
              className={`absolute bottom-1 left-0 h-6 w-6 rounded-full border shadow-sm backdrop-blur flex items-center justify-center ${
                isDark ? 'border-white/10 bg-slate-900/90' : 'border-slate-200/80 bg-white/90'
              }`}
            >
              <BookOpen
                className={`h-3.5 w-3.5 ${isDark ? 'text-fuchsia-200' : 'text-fuchsia-500'}`}
              />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            <span
              className={`bg-gradient-to-r bg-clip-text text-transparent ${
                isDark
                  ? 'from-indigo-300 via-sky-300 to-emerald-300'
                  : 'from-indigo-600 via-sky-500 to-emerald-500'
              }`}
            >
              Preparing your learning hub
            </span>
          </h1>
          <p
            className={`mx-auto max-w-md text-sm leading-relaxed ${
              isDark ? 'text-slate-300/85' : 'text-slate-600'
            }`}
          >
            We&apos;re syncing your college data, finance dashboards, and classroom insights so everything is ready
            the moment you arrive.
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-2 w-full max-w-sm">
          <div
            className={`h-2.5 w-full overflow-hidden rounded-full border backdrop-blur ${
              isDark ? 'border-white/15 bg-slate-900/70' : 'border-slate-200/90 bg-white/80'
            }`}
          >
            <div
              className={`h-full w-1/3 rounded-full bg-gradient-to-r shadow-[0_0_25px_rgba(56,189,248,0.8)] animate-[loading-bar_3s_ease-in-out_infinite] ${
                isDark
                  ? 'from-indigo-400 via-sky-400 to-emerald-300'
                  : 'from-indigo-500 via-sky-500 to-emerald-400'
              }`}
            />
          </div>
          <p
            className={`mt-2 text-[11px] uppercase tracking-[0.22em] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Loading timetable · analytics · teams
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(20%);
          }
          100% {
            transform: translateX(120%);
          }
        }
      `}</style>
    </div>
  );
}

