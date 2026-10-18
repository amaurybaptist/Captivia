// Local browser checks only. Never calls a live Captivia API or creates accounts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { expect } from '@playwright/test';

const base = new URL(process.env.QUIZ_BASE_URL || 'http://localhost:4318');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
  throw new Error('Loopback URL required.');
const engine = process.env.QUIZ_BROWSER === 'webkit' ? webkit : chromium;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = '/tmp/captivia-quiz-browser-results';
await fs.mkdir(output, { recursive: true });
const questions = new Map();
const normalizePrompt = (value) => value.replace(/\s+/g, ' ').trim();
for (const category of ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual']) {
  const bank = JSON.parse(
    await fs.readFile(path.join(root, `src/lib/quiz/data/${category}.json`), 'utf8'),
  );
  for (const question of bank)
    questions.set(normalizePrompt(question.prompt), { ...question, category });
}

const browser = await engine.launch({ headless: true });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  locale: 'fr-BE',
});
await context.route('**/quiz/leaderboard?**', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entries: [], totalPlayers: 0 }),
  }),
);
const page = await context.newPage();
page.on('pageerror', (error) => errors.push(error.message));

async function open() {
  await page.goto(`${base.origin}/fr/jeu`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Commencer la partie' }).waitFor();
}
async function noOverflow() {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    true,
    'horizontal overflow',
  );
  const offenders = await page
    .locator('.quiz-page button, .quiz-page select')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width && (rect.left < -1 || rect.right > innerWidth + 1);
        })
        .map((element) => element.textContent),
    );
  assert.deepEqual(offenders, []);
}
async function answer(correct) {
  const prompt = await page.locator('.quiz-question-card h2').innerText();
  const question = questions.get(normalizePrompt(prompt));
  assert.ok(question, `Unknown prompt ${prompt}`);
  const illustration = page.locator('.quiz-photo-frame img');
  await expect(illustration).toHaveCount(1);
  await expect.poll(() => illustration.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.quiz-photo figcaption')).toContainText(/Image :/);
  const option = question.options[correct ? question.answer : (question.answer + 1) % 4];
  await page
    .locator('.quiz-option')
    .filter({ has: page.getByText(option, { exact: true }) })
    .click();
  await page
    .getByRole('heading', { name: correct ? 'Bien joué !' : 'Pas cette fois…', exact: true })
    .waitFor();
  assert.ok(await page.getByText(question.explanation, { exact: true }).isVisible());
  assert.ok(await page.getByText(question.didYouKnow, { exact: true }).isVisible());
  assert.equal(await page.locator('.quiz-options button:not(:disabled)').count(), 0);
  return question;
}

try {
  await open();
  for (const width of [1440, 1360, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
    await page.screenshot({
      path: `${output}/${engine.name()}-categories-${width}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /^Oiseaux/ }).focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page.getByRole('button', { name: /^Oiseaux/ }).getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  for (let i = 0; i < 20; i++) {
    const question = await answer(i !== 0);
    assert.equal(question.category, 'birds');
    await noOverflow();
    if (i < 2)
      await page.screenshot({
        path: `${output}/${engine.name()}-feedback-${i === 0 ? 'wrong' : 'correct'}.png`,
        fullPage: true,
      });
    await page
      .getByRole('button', { name: i === 19 ? 'Voir mon résultat' : 'Question suivante' })
      .click();
  }
  await page.getByRole('heading', { name: 'Belle exploration !' }).waitFor();
  assert.equal(await page.locator('.quiz-review').count(), 20);
  assert.ok(await page.getByText('Record sur cet appareil : 19', { exact: true }).isVisible());
  await page.locator('.quiz-review summary').first().click();
  await noOverflow();
  await page.screenshot({ path: `${output}/${engine.name()}-results.png`, fullPage: true });
  await page.getByRole('button', { name: 'Changer de catégorie' }).click();
  await page.getByRole('button', { name: /^Aléatoire/ }).click();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  const themes = new Set();
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const question = await answer(true);
    themes.add(question.category);
    assert.ok(!seen.has(question.id));
    seen.add(question.id);
    await page.getByRole('button', { name: 'Question suivante' }).click();
  }
  assert.equal(themes.size, 6, 'Mixed mode must include every theme');
  await page.getByRole('button', { name: 'Catégories', exact: true }).click();
  await page.getByRole('button', { name: /Chronomètre/ }).click();
  await page.getByLabel('Temps de départ').selectOption('30');
  await page.clock.install();
  await page.getByRole('button', { name: 'Commencer la partie' }).click();
  await page.getByRole('timer').waitFor();
  await page.clock.fastForward(10000);
  await expect(page.getByRole('timer')).toContainText('20 s');
  await answer(true);
  await expect(page.getByRole('timer')).toContainText('25 s');
  await page.clock.fastForward(120000);
  await expect(page.getByRole('timer')).toContainText('25 s');
  await page.getByRole('button', { name: 'Question suivante' }).click();
  await page.clock.fastForward(26000);
  await page.getByRole('heading', { name: 'Le temps est écoulé !' }).waitFor();
  assert.equal(await page.locator('.quiz-review').count(), 2); // answered + unanswered correction
  await noOverflow();

  // Cached fake account and intercepted local /auth/me, no real backend required.
  const signedIn = await browser.newContext();
  const user = {
    id: 'local-quiz-layout',
    email: 'une-adresse-longue-pour-verifier@example.test',
    locale: 'fr',
    isPremium: false,
  };
  await signedIn.addInitScript((value) => {
    localStorage.setItem('token', 'local-layout-fixture');
    localStorage.setItem('user', JSON.stringify(value));
  }, user);
  await signedIn.route('**/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await signedIn.route('**/quiz/leaderboard?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [], totalPlayers: 0 }),
    }),
  );
  const accountPage = await signedIn.newPage();
  for (const locale of ['fr', 'de']) {
    await accountPage.goto(`${base.origin}/${locale}/jeu`, { waitUntil: 'networkidle' });
    for (const width of [1360, 1440, 1660, 1920]) {
      await accountPage.setViewportSize({ width, height: 900 });
      const overlap = await accountPage.evaluate(() => {
        const nav = document.querySelector('.captivia-desktop-nav');
        const actions = document.querySelector('.captivia-header-actions');
        if (!nav || !actions || !nav.getBoundingClientRect().width) return false;
        return nav.getBoundingClientRect().right > actions.getBoundingClientRect().left + 1;
      });
      assert.equal(overlap, false, `Header overlap ${locale} ${width}`);
    }
  }
  await signedIn.close();

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('captivia.quiz.')) throw new Error('Blocked');
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('captivia.quiz.')) throw new Error('Full');
      return set.call(this, key, value);
    };
  });
  await blocked.route('**/quiz/leaderboard?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [], totalPlayers: 0 }),
    }),
  );
  const blockedPage = await blocked.newPage();
  await blockedPage.goto(`${base.origin}/fr/jeu`, { waitUntil: 'networkidle' });
  await blockedPage.getByRole('button', { name: /Chronomètre/ }).click();
  await blockedPage.getByLabel('Temps de départ').selectOption('30');
  await blockedPage.clock.install();
  await blockedPage.getByRole('button', { name: 'Commencer la partie' }).click();
  await blockedPage.getByRole('timer').waitFor();
  await blockedPage.clock.fastForward(31000);
  await blockedPage
    .getByText(
      'Le stockage est indisponible : le record n’a pas pu être enregistré sur cet appareil.',
    )
    .waitFor();
  await blocked.close();
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await touch.route('**/quiz/leaderboard?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [], totalPlayers: 0 }),
    }),
  );
  const touchPage = await touch.newPage();
  await touchPage.goto(`${base.origin}/fr/jeu`, { waitUntil: 'networkidle' });
  await touchPage.getByRole('button', { name: /^Reptiles/ }).tap();
  await touchPage.getByRole('button', { name: 'Commencer la partie' }).tap();
  const touchPrompt = await touchPage.locator('.quiz-question-card h2').innerText();
  await touchPage.locator('.quiz-photo-frame').tap();
  assert.equal(
    await touchPage.locator('.quiz-question-card h2').innerText(),
    touchPrompt,
    'Tapping the photo must not answer',
  );
  const touchQuestion = questions.get(normalizePrompt(touchPrompt));
  const correctOption = touchQuestion.options[touchQuestion.answer];
  await touchPage
    .locator('.quiz-option')
    .filter({ has: touchPage.getByText(correctOption, { exact: true }) })
    .tap();
  await touchPage.getByRole('heading', { name: 'Bien joué !', exact: true }).waitFor();
  await touch.close();
  const localized = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await localized.route('**/quiz/leaderboard?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [], totalPlayers: 0 }),
    }),
  );
  const localizedPage = await localized.newPage();
  localizedPage.on('pageerror', (error) => errors.push(error.message));
  for (const language of ['fr', 'en', 'de', 'es', 'it', 'pt']) {
    const copy = JSON.parse(
      await fs.readFile(path.join(root, `src/lib/quiz/locales/${language}.json`), 'utf8'),
    );
    for (const difficulty of ['easy', 'medium', 'hard']) {
      await localizedPage.goto(`${base.origin}/${language}/jeu`, { waitUntil: 'networkidle' });
      await expect(localizedPage.locator('.quiz-page')).toHaveAttribute('lang', language);
      await localizedPage
        .getByRole('button', { name: new RegExp(`^${copy[difficulty]} `) })
        .click();
      await localizedPage.getByRole('button', { name: copy.start, exact: true }).click();
      const prompt = normalizePrompt(
        await localizedPage.locator('.quiz-question-card h2').innerText(),
      );
      let question;
      for (const category of ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual']) {
        const canonical = JSON.parse(
          await fs.readFile(path.join(root, `src/lib/quiz/data/${category}.json`), 'utf8'),
        );
        const bank =
          language === 'fr'
            ? canonical
            : JSON.parse(
                await fs.readFile(
                  path.join(root, `src/lib/quiz/data/translations/${language}/${category}.json`),
                  'utf8',
                ),
              ).questions;
        const candidate = bank.find((q) => normalizePrompt(q.prompt) === prompt);
        if (candidate) {
          question = {
            ...candidate,
            ...{
              difficulty: canonical.find((q) => q.id === candidate.id).difficulty,
              answer: canonical.find((q) => q.id === candidate.id).answer,
            },
          };
          break;
        }
      }
      assert.ok(question, `Unknown localized prompt ${language}: ${prompt}`);
      assert.equal(question.difficulty, difficulty);
      await expect(localizedPage.locator('.quiz-progress-line')).toContainText('20');
      await expect
        .poll(() =>
          localizedPage.locator('.quiz-photo-frame img').evaluate((img) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
      await localizedPage
        .locator('.quiz-option')
        .filter({
          has: localizedPage.getByText(question.options[question.answer], { exact: true }),
        })
        .click();
      await localizedPage.getByRole('heading', { name: copy.success, exact: true }).waitFor();
      await expect(localizedPage.locator('.quiz-learning')).toContainText(question.didYouKnow);
      assert.equal(
        await localizedPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        true,
      );
    }
  }
  await localized.close();
  assert.deepEqual(errors, [], 'Browser exceptions');
  console.log(
    `${engine.name()}: quiz, six banks + mixed mode, feedback, timer, storage failure, keyboard, responsive 320–1920, dark/reduced motion: PASS`,
  );
} finally {
  await context.close();
  await browser.close();
}
