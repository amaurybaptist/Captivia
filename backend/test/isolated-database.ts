/** Refuse integration fixtures against a production or shared development DB. */
export function assertIsolatedDatabase(
  localPort: string,
  localDatabase: string,
) {
  const url = new URL(process.env.DATABASE_URL || '');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const local = url.port === localPort && url.pathname === `/${localDatabase}`;
  const ci = process.env.CI === 'true' && url.pathname === '/captivia_ci_test';
  if (!loopback || (!local && !ci)) {
    throw new Error(
      'Une base locale isolée est obligatoire pour ces fixtures.',
    );
  }
}
