// Real API accounts from the disposable database; no mocked entitlement responses.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.HABITAT_TEST_URL || 'http://localhost:4318';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
  throw new Error('Serveur local obligatoire.');
const fixture = JSON.parse(await readFile('/tmp/captivia-habitat-browser-users.json', 'utf8'));
assert.match(fixture.free.user.email, /^habitat-browser-free-\d+@example\.test$/);
const output = '/tmp/captivia-habitat-browser-results';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
try {
  for (const width of [1440, 320]) {
    for (const type of ['guest', 'free', 'forged-cache']) {
      const context = await browser.newContext({
        locale: 'fr-BE',
        viewport: { width, height: 900 },
        isMobile: width === 320,
        hasTouch: width === 320,
        colorScheme: width === 320 ? 'dark' : 'light',
      });
      if (type !== 'guest')
        await context.addInitScript(
          ({ user, token }) => {
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);
          },
          { ...fixture.free, user: { ...fixture.free.user, isPremium: type === 'forged-cache' } },
        );
      const page = await context.newPage();
      const models = [],
        errors = [],
        projects = [];
      page.on('request', (request) => {
        if (/\/models\/habitat\//.test(request.url())) models.push(request.url());
        if (request.url().includes('/users/me/habitats')) projects.push(request.url());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(`${base}/guide?animal=${fixture.animalId}`);
      await page.getByRole('link', { name: 'Découvrir Premium', exact: true }).waitFor();
      assert.equal(await page.locator('canvas').count(), 0);
      assert.equal(await page.locator('#habitat-species').count(), 0);
      assert.equal(
        await page.getByRole('button', { name: 'Générer mon aménagement', exact: true }).count(),
        0,
      );
      assert.equal(
        await page
          .getByRole('link', { name: 'Découvrir Premium', exact: true })
          .getAttribute('href'),
        '/fr/parametres/abonnement',
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      );
      assert.deepEqual(models, []);
      assert.deepEqual(projects, []);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `${output}/premium-${type}-${width}.png`, fullPage: true });
      console.log(`${type} ${width}px: teaser only, no designer or 3D asset, no project API call`);
      await context.close();
    }
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'fr-BE',
  });
  await context.addInitScript(({ user, token }) => {
    localStorage.setItem('user', JSON.stringify({ ...user, isPremium: false }));
    localStorage.setItem('token', token);
  }, fixture.users[0]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/guide');
  await page.locator('#habitat-species').waitFor();
  await page.locator('canvas').waitFor();
  assert.equal(await page.getByRole('link', { name: 'Découvrir Premium', exact: true }).count(), 0);
  await page.goto(base + '/parametres/abonnement');
  await page
    .getByRole('listitem')
    .filter({
      hasText:
        'Concepteur d’habitat 2D et 3D : aménagements personnalisés, projets sauvegardés et exports',
    })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'Real Premium account with stale free cache: designer available; subscription benefit visible',
  );
  await context.close();
} finally {
  await browser.close();
}
