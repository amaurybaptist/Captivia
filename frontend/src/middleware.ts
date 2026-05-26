import createMiddleware from 'next-intl/middleware';
import { routing } from '../i18n/routing';

export default createMiddleware(routing);

// Match all pathnames except api, _next, _vercel (path-to-regexp compatible for Next.js 16/Turbopack)
// Omitting .*\..* from lookahead to avoid "The string did not match the expected pattern"
export const config = {
  matcher: ['/((?!api|_next|_vercel).*)'],
};
