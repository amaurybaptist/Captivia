import { assertIsolatedDatabase } from './isolated-database';

describe('Integration database isolation', () => {
  const previous = { url: process.env.DATABASE_URL, ci: process.env.CI };
  afterEach(() => {
    for (const [key, value] of Object.entries({
      DATABASE_URL: previous.url,
      CI: previous.ci,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])(
    'accepts the dedicated CI database on %s',
    (host) => {
      process.env.CI = 'true';
      process.env.DATABASE_URL = `postgresql://test:test@${host}:5432/captivia_ci_test`;
      expect(() =>
        assertIsolatedDatabase('55434', 'captivia_habitats_test'),
      ).not.toThrow();
    },
  );

  it('preserves the explicit local test database', () => {
    delete process.env.CI;
    process.env.DATABASE_URL =
      'postgresql://test:test@127.0.0.1:55434/captivia_habitats_test';
    expect(() =>
      assertIsolatedDatabase('55434', 'captivia_habitats_test'),
    ).not.toThrow();
  });

  it.each([
    'postgresql://test:test@production.example:55434/captivia_habitats_test',
    'postgresql://test:test@localhost:5432/captivia',
    'postgresql://test:test@production.example:5432/captivia_ci_test',
    'postgresql://test:test@localhost:55434/captivia_habitats_test_backup',
  ])('rejects an unsafe destination', (url) => {
    process.env.CI = 'true';
    process.env.DATABASE_URL = url;
    expect(() =>
      assertIsolatedDatabase('55434', 'captivia_habitats_test'),
    ).toThrow();
  });

  it('rejects the CI database outside CI', () => {
    delete process.env.CI;
    process.env.DATABASE_URL =
      'postgresql://test:test@localhost:5432/captivia_ci_test';
    expect(() =>
      assertIsolatedDatabase('55434', 'captivia_habitats_test'),
    ).toThrow();
  });
});
