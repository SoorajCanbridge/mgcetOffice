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
    <div className={`min-h-screen flex justify-center items-center p-5 relative ${
      currentTheme === 'dark' 
        ? 'bg-gradient-to-br from-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-indigo-500 to-purple-600'
    }`}>
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className="bg-card rounded-xl p-12 shadow-xl max-w-[450px] w-full border border-border transition-all">
        <h1 className={`text-3xl mb-2.5 text-center font-bold bg-clip-text text-transparent ${
          currentTheme === 'dark'
            ? 'bg-gradient-to-br from-indigo-400 to-purple-400'
            : 'bg-gradient-to-br from-indigo-600 to-purple-600'
        }`}>
          Login
        </h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Welcome back! Please login to your account.
        </p>

        {error && (
          <div className={`p-3.5 rounded-md mb-5 text-sm border border-destructive ${
            currentTheme === 'dark' ? 'bg-destructive/20 text-destructive' : 'bg-destructive/10 text-destructive'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="mb-6">
            <label htmlFor="email" className="block mb-2 text-sm font-semibold text-foreground">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full py-3.5 px-4 text-base border border-input rounded-md outline-none transition-all bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
              placeholder="Enter your email"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block mb-2 text-sm font-semibold text-foreground">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full py-3.5 px-4 text-base border border-input rounded-md outline-none transition-all bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`py-3.5 px-4 text-base text-primary-foreground border-none rounded-md cursor-pointer font-semibold mt-2.5 transition-all shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
              loading 
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60' 
                : 'bg-primary'
            }`}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary font-semibold no-underline transition-all hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
