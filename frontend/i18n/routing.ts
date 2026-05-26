import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['fr', 'en', 'es', 'de', 'it', 'pt'],

  // Used when no locale matches
  defaultLocale: 'fr',
  
  // Use 'as-needed' to only add locale prefix when not using default locale
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];

// Export individual values for convenience
export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;
