'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPasswordInvalidLink'));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError(t('auth.resetPasswordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth.passwordMin'));
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const res = await api.resetPassword(token, password);
      setMessage(res?.message || t('auth.resetPasswordSuccess'));
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || t('auth.resetPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <p className="text-red-600 dark:text-red-400 mb-4">{t('auth.resetPasswordInvalidLink')}</p>
          <Link href="/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium">
            {t('auth.forgotPasswordTitle')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm md:max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">
          {t('auth.resetPasswordTitle')}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          {t('auth.resetPasswordDescription')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('auth.newPasswordLabel')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {t('auth.confirmPasswordLabel')}
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {message && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.loading') : t('auth.resetPasswordSubmit')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
