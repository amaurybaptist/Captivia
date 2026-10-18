// Local-only functional verification against the isolated PostgreSQL fixtures.
import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const base = process.env.AGENDA_TEST_URL || 'http://localhost:4318';
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname))
  throw new Error('Serveur local obligatoire.');
const fixture = JSON.parse(await readFile('/tmp/captivia-agenda-browser-users.json', 'utf8'));
assert.match(fixture.user.email, /^agenda-browser-\d+@example\.test$/);
const output = '/tmp/captivia-agenda-browser-results';
await mkdir(output, { recursive: true });
const engine = process.env.AGENDA_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({
  headless: true,
  ...(engine === chromium
    ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : {}),
});
async function context(width, account = fixture) {
  const ctx = await browser.newContext({
    viewport: { width, height: 950 },
    isMobile: width < 800,
    hasTouch: width < 800,
    locale: 'fr-BE',
    colorScheme: width === 390 ? 'dark' : 'light',
    reducedMotion: 'reduce',
  });
  await ctx.addInitScript(({ user, token }) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  }, account);
  return ctx;
}
async function ready(page) {
  await page.getByRole('button', { name: 'Ajouter un soin', exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector('.care-calendar')?.hasAttribute('data-loading') &&
      document.querySelector('.care-calendar')?.getAttribute('aria-busy') === 'false',
  );
}
try {
  if (process.env.AGENDA_SMOKE !== '1') {
    const ctx = await context(1440),
      page = await ctx.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/agenda');
    await ready(page);
    await page.locator('.care-filters select').first().selectOption(fixture.kiwi);
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Repas Kiwi,/ }).click();
    await page.getByLabel('Nom du soin', { exact: true }).fill('Repas ajusté');
    await page.getByLabel('Heure', { exact: true }).fill('10:15');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Repas ajusté, Kiwi, 10:15/ }).waitFor();
    await page.reload();
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Repas ajusté, Kiwi, 10:15/ }).waitFor();
    await page.locator('.care-filters select').first().selectOption(fixture.nala);
    await ready(page);
    assert.equal(await page.getByRole('button', { name: /^Modifier Repas ajusté/ }).count(), 0);
    await page.getByLabel('Aller au jour', { exact: true }).fill(fixture.nextDay);
    await ready(page);
    await page.getByRole('button', { name: 'Ajouter à cette journée', exact: true }).click();
    await page.getByLabel('Nom du soin', { exact: true }).fill('Bain Nala');
    await page.getByLabel('Heure', { exact: true }).fill('16:00');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Bain Nala, Nala, 16:00/ }).waitFor();
    await page.locator('.care-filters select').first().selectOption(fixture.kiwi);
    await ready(page);
    await page.getByLabel('Aller au jour', { exact: true }).fill(fixture.today);
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Visite annuelle/ }).click();
    await page.getByLabel('Date', { exact: true }).fill(fixture.nextDay);
    await page.getByLabel('Heure', { exact: true }).fill('14:30');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await ready(page);
    await page.getByRole('button', { name: /^Modifier Visite annuelle, Kiwi, 14:30/ }).waitFor();
    await page.getByRole('button', { name: /^Modifier Visite annuelle/ }).click();
    await page.getByLabel('Statut', { exact: true }).selectOption('cancelled');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await ready(page);
    assert.equal(await page.getByRole('button', { name: /^Modifier Visite annuelle/ }).count(), 0);
    await page.getByRole('button', { name: 'Mois suivant', exact: true }).click();
    await ready(page);
    await page.getByLabel('Choisir le mois', { exact: true }).fill('2028-02');
    await ready(page);
    assert.equal(await page.locator('#care-day-2028-02-29').count(), 1);
    await page.locator('#care-day-2028-02-15').click();
    await page.keyboard.press('ArrowRight');
    assert.equal(
      await page.getByLabel('Aller au jour', { exact: true }).inputValue(),
      '2028-02-16',
    );
    await page.getByRole('button', { name: 'Jour', exact: true }).click();
    await page.getByRole('button', { name: 'Jour suivant', exact: true }).click();
    assert.equal(
      await page.getByLabel('Aller au jour', { exact: true }).inputValue(),
      '2028-02-17',
    );
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/desktop.png`, fullPage: true });
    await ctx.close();
    console.log(
      'Routine edit/reload, animal filters, creation, appointment move/cancel, month leap year and keyboard navigation valid',
    );
  }
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    const ctx = await context(width),
      page = await ctx.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '/agenda');
    await ready(page);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      false,
      `overflow ${width}`,
    );
    assert.equal(await page.locator('.care-month tbody td').count(), 42);
    await page.locator(`#care-day-${fixture.today}`).click();
    await page.getByRole('button', { name: 'Ajouter à cette journée', exact: true }).waitFor();
    await page.screenshot({ path: `${output}/${engine.name()}-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await ctx.close();
    console.log(`${engine.name()} ${width}px: calendar, day selection and no overflow`);
  }
  const free = await context(390, fixture.free),
    page = await free.newPage();
  await page.goto(base + '/agenda');
  await ready(page);
  await page.getByText('Votre calendrier est prêt.', { exact: false }).waitFor();
  assert.equal(
    await page
      .locator('.care-event.medication,.care-event.appointment,.care-event.vaccination')
      .count(),
    0,
  );
  await free.close();
  console.log('Free account: own empty calendar, Premium health data excluded');
} finally {
  await browser.close();
}
