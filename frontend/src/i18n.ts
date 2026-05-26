// This file is deprecated - configuration has been moved to i18n/routing.ts and i18n/request.ts
// Kept for backward compatibility, but use the new structure instead

export { routing } from '../i18n/routing';
export type { Locale } from '../i18n/routing';
export { locales, defaultLocale } from '../i18n/routing';

// Re-export the request config
export { default } from '../i18n/request';
