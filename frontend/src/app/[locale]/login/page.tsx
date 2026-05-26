'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileLink, setMobileLink] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) return;
    fetch('/api/mobile-link')
      .then((r) => r.json())
      .then((d) => setMobileLink(d.urlFr || d.url))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.login(email, password);

      if (response.accessToken && response.user) {
        login(response.accessToken, response.user);
        router.push('/mes-animaux');
      } else {
        setError(t('auth.invalidCredentials'));
      }
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm md:max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 lg:p-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 text-gray-800 dark:text-white">
          {t('auth.loginTitle')}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5 w-full">
          <div className="w-full">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('auth.emailLabel')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="w-full">
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.passwordLabel')}
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('common.loading') : t('auth.loginButton')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t('auth.noAccount')}{' '}
            <Link
              href="/register"
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              {t('auth.registerButton')}
            </Link>
          </p>
        </div>

        <div className="mt-3 sm:mt-4 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm sm:text-base touch-manipulation">
            {t('common.back')} {t('common.home')}
          </Link>
        </div>

        {mobileLink && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
              Lien pour tester sur votre téléphone (même Wi‑Fi)
            </p>
            <a
              href={mobileLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {mobileLink}
            </a>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Gardez le backend lancé sur ce PC (port 3001).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
