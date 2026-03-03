'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const { theme } = useTheme();
  
  // Handle theme being undefined initially
  const currentTheme = theme || 'light';

  useEffect(() => {
    if (isAuthenticated) {
      // After a successful login, do a full page load of /app
      if (typeof window !== 'undefined') {
        window.location.replace('/app');
      } else {
        router.push('/app');
      }
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
    setLoading(true);

    try {
      const response = await loginUser(formData);
      login(response.user || { email: formData.email }, response.token);
      // Use a hard reload so all app data & layouts re-initialize with the new auth state
      if (typeof window !== 'undefined') {
        window.location.replace('/app');
      } else {
        router.push('/app');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-500/40 via-purple-500/40 to-sky-500/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-tr from-emerald-400/30 via-teal-400/30 to-cyan-500/30 blur-3xl" />
      </div>

      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="grid w-full max-w-5xl gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          {/* Left / brand side */}
          <div className="space-y-6 text-left text-slate-100">
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-200/80 shadow-sm backdrop-blur">
              Ready to manage smarter
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
                Welcome back,
              </span>{' '}
              <br className="hidden sm:inline" />
              <span className="text-slate-50">let’s get you signed in.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-300/80">
              Access your finance dashboards, team settings, and reports with a single, secure login. Your data is
              encrypted and synced across all your devices.
            </p>
            <div className="grid gap-3 text-sm text-slate-200/80 sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-300 flex items-center justify-center">
                  ✓
                </span>
                <div>
                  <p className="font-medium text-slate-50">Secure by default</p>
                  <p className="text-xs text-slate-300/80">Protected sessions and college-scoped access.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-indigo-500/15 text-[11px] font-semibold text-indigo-300 flex items-center justify-center">
                  ⚡
                </span>
                <div>
                  <p className="font-medium text-slate-50">Fast navigation</p>
                  <p className="text-xs text-slate-300/80">Jump straight into your dashboards in one click.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / form card */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-indigo-500/40 via-purple-500/25 to-sky-500/40 opacity-80 blur-2xl" />
            <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-slate-950/95 p-[1px] shadow-[0_18px_60px_rgba(15,23,42,0.85)] backdrop-blur-xl">
              <div className="rounded-[1.45rem] bg-slate-950/90 px-7 py-8 sm:px-9 sm:py-9">
                <div className="mb-7 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Sign in
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-50">
                      Login to your account
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Use the email and password set by your admin.
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className={`mb-5 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-3 text-xs text-red-100 shadow-sm`}
                  >
                    <span className="mt-0.5 text-sm">!</span>
                    <p>{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-0"
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
                        className="peer w-full rounded-xl border border-slate-700/80 bg-slate-900/70 px-3.5 py-3.5 text-sm text-slate-50 shadow-sm outline-none transition-all placeholder:text-slate-500/60 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/60 focus:ring-offset-0"
                        placeholder="••••••••"
                      />
                      <div className="pointer-events-none absolute inset-px rounded-[0.7rem] border border-white/5 opacity-0 transition-opacity peer-focus:opacity-100" />
                    </div>
                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                      <span>Minimum 6 characters.</span>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`relative mt-1 inline-flex items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-semibold tracking-wide text-slate-50 shadow-[0_14px_40px_rgba(79,70,229,0.55)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-indigo-400 ${
                      loading
                        ? 'cursor-not-allowed bg-slate-700/80 text-slate-300/80 shadow-none'
                        : 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 hover:scale-[1.02] hover:shadow-[0_18px_55px_rgba(79,70,229,0.8)] active:scale-[0.99]'
                    }`}
                  >
                    <span className="relative z-10">
                      {loading ? 'Logging in…' : 'Continue to dashboard'}
                    </span>
                    {!loading && (
                      <span className="ml-2 text-base" aria-hidden="true">
                        →
                      </span>
                    )}
                    {!loading && (
                      <span className="pointer-events-none absolute inset-[1px] -z-0 rounded-[1.05rem] bg-gradient-to-r from-indigo-400/30 via-violet-400/20 to-emerald-300/20 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-slate-400">
                  Don&apos;t have an account yet?{' '}
                  <Link
                    href="/register"
                    className="font-semibold text-indigo-300 underline-offset-4 transition hover:text-indigo-200 hover:underline"
                  >
                    Create one in seconds
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
