'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();
  
  // Handle theme being undefined initially
  const currentTheme = theme || 'light';

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/app');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...userData } = formData;
      await registerUser(userData);
      router.push('/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-gradient-to-br ${
        currentTheme === 'dark'
          ? 'from-slate-900 via-slate-950 to-slate-900'
          : 'from-slate-950 via-slate-900 to-slate-950'
      }`}
    >
      {/* Accent blobs */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -top-40 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-fuchsia-500/40 via-purple-500/40 to-sky-500/40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-400/30 via-teal-400/30 to-cyan-500/30 blur-3xl" />
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)]">
          {/* Left / brand copy */}
          <div className="space-y-6 text-left text-slate-100">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200/80 shadow-sm backdrop-blur">
              Create your workspace
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-sky-300 bg-clip-text text-transparent">
                Join your finance suite
              </span>{' '}
              <br className="hidden sm:inline" />
              <span className="text-slate-50">in just a few steps.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-300/80">
              Create an account to collaborate with your team, track incomes and expenses, and unlock powerful
              college-level insights.
            </p>
            <div className="grid gap-3 text-sm text-slate-200/80 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-slate-50">No setup hassle</p>
                  <p className="text-xs text-slate-300/80">Sign up and you’re ready to go in minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-500/15 text-[11px] font-semibold text-fuchsia-300">
                  ✦
                </span>
                <div>
                  <p className="font-medium text-slate-50">Designed for teams</p>
                  <p className="text-xs text-slate-300/80">Roles, permissions, and college scoping built in.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / form card */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-fuchsia-500/40 via-violet-500/25 to-sky-500/40 opacity-80 blur-2xl" />
            <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950/95 p-[1px] shadow-[0_18px_60px_rgba(15,23,42,0.85)] backdrop-blur-xl">
              <div className="rounded-[1.45rem] bg-slate-950/90 px-7 py-8 sm:px-9 sm:py-9">
                <div className="mb-7 space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Get started
                  </p>
                  <h2 className="text-xl font-semibold text-slate-50">
                    Create your account
                  </h2>
                  <p className="text-xs text-slate-400">
                    Use your work or college email so your team can find you easily.
                  </p>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-3 text-xs text-red-100 shadow-sm">
                    <span className="mt-0.5 text-sm">!</span>
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="name"
                      className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                    >
                      Full name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/60 focus:ring-offset-0"
                        placeholder="Enter your full name"
                      />
                      <div className="pointer-events-none absolute inset-px rounded-[0.7rem] border border-white/5 opacity-0 transition-opacity peer-focus:opacity-100" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/60 focus:ring-offset-0"
                        placeholder="you@example.com"
                      />
                      <div className="pointer-events-none absolute inset-px rounded-[0.7rem] border border-white/5 opacity-0 transition-opacity peer-focus:opacity-100" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/60 focus:ring-offset-0"
                        placeholder="••••••••"
                      />
                      <div className="pointer-events-none absolute inset-px rounded-[0.7rem] border border-white/5 opacity-0 transition-opacity peer-focus:opacity-100" />
                    </div>
                    <p className="pt-1 text-[11px] text-slate-400">
                      Minimum 6 characters. Use a mix of letters and numbers.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="confirmPassword"
                      className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/60 focus:ring-offset-0"
                        placeholder="Re-type your password"
                      />
                      <div className="pointer-events-none absolute inset-px rounded-[0.7rem] border border-white/5 opacity-0 transition-opacity peer-focus:opacity-100" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`relative mt-1 inline-flex items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-semibold tracking-wide text-slate-50 shadow-[0_14px_40px_rgba(236,72,153,0.55)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-fuchsia-400 ${
                      loading
                        ? 'cursor-not-allowed bg-slate-700/80 text-slate-300/80 shadow-none'
                        : 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-400 hover:scale-[1.02] hover:shadow-[0_18px_55px_rgba(236,72,153,0.8)] active:scale-[0.99]'
                    }`}
                  >
                    <span className="relative z-10">
                      {loading ? 'Creating account…' : 'Create account'}
                    </span>
                    {!loading && (
                      <span className="ml-2 text-base" aria-hidden="true">
                        →
                      </span>
                    )}
                    {!loading && (
                      <span className="pointer-events-none absolute inset-[1px] -z-0 rounded-[1.05rem] bg-gradient-to-r from-fuchsia-400/30 via-violet-400/20 to-sky-300/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="font-semibold text-fuchsia-300 underline-offset-4 transition hover:text-fuchsia-200 hover:underline"
                  >
                    Log in instead
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
