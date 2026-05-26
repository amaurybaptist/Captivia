'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setMessage(res?.message || t('auth.forgotPasswordSuccess'));
    } catch (err: any) {
      setError(err.message || t('auth.forgotPasswordError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-sm md:max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-gray-800 dark:text-white">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          {t('auth.forgotPasswordDescription')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
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
            {loading ? t('common.loading') : t('auth.forgotPasswordSubmit')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
