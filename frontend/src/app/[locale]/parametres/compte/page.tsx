'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { api } from '@/lib/api';

const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt'];

export default function ComptePage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const [selectedLocale, setSelectedLocale] = useState('fr');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.locale) {
      setSelectedLocale(user.locale);
    }
  }, [user]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLocaleChange = (newLocale: string) => {
    setSelectedLocale(newLocale);
    
    // Navigate to new locale path
    const currentLocaleMatch = pathname.match(/^\/([a-z]{2})\//);
    const currentLocale = currentLocaleMatch ? currentLocaleMatch[1] : 'fr';
    
    if (newLocale === 'fr') {
      // French is default, remove locale prefix
      const newPath = pathname.replace(`/${currentLocale}/`, '/');
      router.push(newPath);
    } else {
      const newPath = currentLocale === 'fr' 
        ? `/${newLocale}${pathname}`
        : pathname.replace(`/${currentLocale}/`, `/${newLocale}/`);
      router.push(newPath);
    }
    
    setToast(t('common.languageSaved'));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword.trim()) {
      setPasswordError(t('profile.currentPasswordRequired'));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t('auth.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('auth.resetPasswordMismatch'));
      return;
    }
    if (!token) {
      setPasswordError(t('profile.mustBeLoggedIn'));
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword(token, currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setToast(t('common.passwordChanged'));
    } catch (err: any) {
      setPasswordError(err.message || t('profile.changePasswordError'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Breadcrumb */}
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 min-w-0">
        <nav className="text-sm text-gray-500">
          <Link href="/parametres" className="hover:text-emerald-600">
            {t('settings.title')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800 dark:text-white">{t('settings.account')}</span>
        </nav>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 sm:mb-8">
          {t('settings.account')}
        </h1>

        {/* Account info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('common.email')}
            </label>
            <p className="text-lg text-gray-800 dark:text-white">
              {user?.email}
            </p>
          </div>

          {/* Member since - optional if API returns it */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {t('common.memberSince')}
            </label>
            <p className="text-gray-800 dark:text-white">
              {formatDate((user as { createdAt?: string })?.createdAt)}
            </p>
          </div>

          {/* Language selector */}
          <div>
            <label htmlFor="account-locale" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              {t('common.language')}
            </label>
            <select
              id="account-locale"
              value={selectedLocale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="fr">Francais</option>
              <option value="en">English</option>
              <option value="es">Espanol</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Portugues</option>
            </select>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Password section — visible only when connected */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              {t('common.password')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('profile.passwordNotDisplayed')}{' '}
              <Link href="/forgot-password" className="text-emerald-600 hover:text-emerald-700">
                {t('auth.forgotPassword')}
              </Link>
            </p>

            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.changePassword')}
              </button>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.currentPassword')}
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.newPassword')}
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('common.confirmPassword')}
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                {passwordError && (
                  <p className="text-red-600 dark:text-red-400 text-sm">{passwordError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {passwordLoading ? t('common.loading') : t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Logout */}
          <div>
            <button
              onClick={logout}
              className="px-6 py-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors font-medium"
            >
              {t('common.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
