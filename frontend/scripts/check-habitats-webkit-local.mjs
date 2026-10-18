// WebKit mobile emulation; a physical iPhone still needs release validation.
import { webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
const base = process.env.HABITAT_TEST_URL || 'http://localhost:4318';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
  throw new Error('Serveur local obligatoire.');
await mkdir('/tmp/captivia-habitat-browser-results', { recursive: true });
const fixture = JSON.parse(await readFile('/tmp/captivia-habitat-browser-users.json', 'utf8'));
const browser = await webkit.launch({ headless: true });
try {
  for (const width of [320, 390, 768]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: 'fr-BE',
      colorScheme: width === 390 ? 'dark' : 'light',
      reducedMotion: 'reduce',
    });
    await context.addInitScript(({ user, token }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    }, fixture.users[0]);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base + '/guide');
    await page.getByRole('button', { name: 'Plan 2D', exact: true }).click();
    await page.locator('.habitat-plan-container svg').waitFor();
    await page.locator('#habitat-species').selectOption('crested');
    await page.getByRole('button', { name: 'Générer mon aménagement', exact: true }).click();
    await page
      .locator('.habitat-preview-heading h2')
      .filter({ hasText: 'Gecko à crête' })
      .waitFor();
    await page.getByRole('button', { name: 'Roche stable', exact: true }).click();
    await page.getByLabel('Position X', { exact: true }).fill('5');
    assert.equal(await page.getByLabel('Position X', { exact: true }).inputValue(), '5');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      `overflow ${width}`,
    );
    await page.screenshot({ path: `/tmp/captivia-habitat-browser-results/webkit-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`WebKit ${width}px: generation, 2D editing, no hydration error or overflow`);
    await context.close();
  }
} finally {
  await browser.close();
}
