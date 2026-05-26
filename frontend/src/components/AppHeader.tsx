'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';

export function AppHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const { user, isLoading: authLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2 min-w-0">
            {/* Logo */}
            <Link
              href="/"
              className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0 truncate"
              onClick={closeMobileMenu}
            >
              {t('common.appName')}
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              <Link
                href="/"
                className={`text-sm lg:text-base ${
                  pathname === '/' || /^\/[a-z]{2}$/.test(pathname)
                    ? 'text-emerald-600 font-semibold dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                {t('common.home')}
              </Link>
              <Link
                href="/magasin"
                className={`text-sm lg:text-base ${
                  pathname?.includes('/magasin')
                    ? 'text-emerald-600 font-semibold dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                {t('common.shop')}
              </Link>
              {user && (
                <>
                  <Link
                    href="/mes-animaux"
                    className="text-sm lg:text-base text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    {t('common.myAnimals')}
                  </Link>
                  <Link
                    href="/parametres"
                    className="text-sm lg:text-base text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    {t('common.settings')}
                  </Link>
                </>
              )}
              <Link
                href="/transparency"
                className="text-sm lg:text-base text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                {t('footer.transparency')}
              </Link>
            </nav>

            {/* Right: language + auth (desktop) */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4 shrink-0">
              <LanguageSelector />
              {!authLoading &&
                (user ? (
                  <>
                    <span className="text-xs lg:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[120px] lg:max-w-[180px]">
                      {user.email}
                    </span>
                    <Link
                      href="/parametres"
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600"
                    >
                      {t('common.profile')}
                    </Link>
                    <button
                      onClick={logout}
                      className="text-sm text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      {t('common.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-3 py-1.5 lg:px-4 lg:py-2 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-sm lg:text-base"
                    >
                      {t('common.login')}
                    </Link>
                    <Link
                      href="/register"
                      className="px-3 py-1.5 lg:px-4 lg:py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm lg:text-base"
                    >
                      {t('common.register')}
                    </Link>
                  </>
                ))}
            </div>

            {/* Mobile: hamburger + language */}
            <div className="flex md:hidden items-center gap-2 shrink-0">
              <LanguageSelector />
              <button
                type="button"
                onClick={() => setMobileMenuOpen((o) => !o)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            role="dialog"
            aria-label="Navigation"
          >
            <nav className="px-4 py-4 flex flex-col gap-1 max-h-[70vh] overflow-y-auto">
              <Link
                href="/"
                className="py-3 px-2 text-emerald-600 font-semibold dark:text-emerald-400"
                onClick={closeMobileMenu}
              >
                {t('common.home')}
              </Link>
              <Link
                href="/magasin"
                className="py-3 px-2 text-gray-700 dark:text-gray-300"
                onClick={closeMobileMenu}
              >
                {t('common.shop')}
              </Link>
              {user && (
                <>
                  <Link
                    href="/mes-animaux"
                    className="py-3 px-2 text-gray-700 dark:text-gray-300"
                    onClick={closeMobileMenu}
                  >
                    {t('common.myAnimals')}
                  </Link>
                  <Link
                    href="/parametres"
                    className="py-3 px-2 text-gray-700 dark:text-gray-300"
                    onClick={closeMobileMenu}
                  >
                    {t('common.settings')}
                  </Link>
                </>
              )}
              <Link
                href="/transparency"
                className="py-3 px-2 text-gray-700 dark:text-gray-300"
                onClick={closeMobileMenu}
              >
                {t('footer.transparency')}
              </Link>
              <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-3">
                {!authLoading &&
                  (user ? (
                    <>
                      <p className="py-2 px-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      <Link
                        href="/parametres"
                        className="block py-3 px-2 text-gray-700 dark:text-gray-300"
                        onClick={closeMobileMenu}
                      >
                        {t('common.profile')}
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          closeMobileMenu();
                        }}
                        className="block w-full text-left py-3 px-2 text-red-600 dark:text-red-400"
                      >
                        {t('common.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="block py-3 px-2 text-emerald-600 font-medium dark:text-emerald-400"
                        onClick={closeMobileMenu}
                      >
                        {t('common.login')}
                      </Link>
                      <Link
                        href="/register"
                        className="block py-3 px-2 bg-emerald-600 text-white rounded-lg text-center font-medium mt-2"
                        onClick={closeMobileMenu}
                      >
                        {t('common.register')}
                      </Link>
                    </>
                  ))}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
