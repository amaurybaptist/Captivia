// Browser verification of static games on loopback only. No accounts or production writes.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import { expect } from '@playwright/test';
const base = new URL(process.env.QUIZ_BASE_URL || 'http://localhost:4318');
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) throw new Error('Loopback only');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const animals = await json('src/lib/quiz/photo/animals.json');
const images = await json('src/lib/quiz/photo/images.json');
const bySrc = new Map(animals.map((a) => [images[a.id].src, a]));
const engine = process.env.QUIZ_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await context.route('**/quiz/leaderboard?**', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '{"entries":[],"totalPlayers":0}',
  }),
);
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('/tmp/captivia-photo-browser-results', { recursive: true });
async function open(language, level) {
  const copy = await json(`src/lib/quiz/locales/${language}.json`);
  const photo = await json(`src/lib/quiz/photo/locales/${language}.json`);
  const texts =
    language === 'fr'
      ? animals
      : (await json(`src/lib/quiz/photo/translations/${language}.json`)).animals;
  await page.goto(`${base.origin}/${language}/jeu`, { waitUntil: 'networkidle' });
  await page.locator('.quiz-game-picker button').filter({ hasText: photo.photoTitle }).tap();
  await page
    .locator('.photo-game .quiz-difficulties button')
    .filter({ hasText: copy[level] })
    .tap();
  await page.getByRole('button', { name: copy.start, exact: true }).tap();
  await expect(page.locator('.photo-game')).toHaveAttribute('lang', language);
  return { copy, photo, texts: new Map(texts.map((q) => [q.id, q])) };
}
async function visibleQuestion() {
  const image = page.locator('.photo-challenge-frame img');
  await expect.poll(() => image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.photo-game .quiz-option').first()).toBeEnabled();
  const src = new URL(await image.getAttribute('src'), base).pathname;
  const q = bySrc.get(src);
  assert.ok(q, `Unknown photo ${src}`);
  return q;
}
async function answer(q, config, correct = true) {
  const chosen = config.texts.get(correct ? q.id : q.distractors[0]).animal;
  await page
    .locator('.photo-game .quiz-option')
    .filter({ has: page.getByText(chosen, { exact: true }) })
    .tap();
  await page
    .getByRole('heading', {
      name: correct ? config.copy.success : config.copy.incorrect,
      exact: true,
    })
    .waitFor();
  await expect(page.locator('.quiz-learning')).toContainText(config.texts.get(q.id).didYouKnow);
  await expect(page.locator('.photo-challenge figcaption')).toContainText(q.scientificName);
  assert.equal(await page.locator('.photo-game .quiz-option:not(:disabled)').count(), 0);
}
async function noOverflow() {
  // WebKit may resolve setViewportSize before the next layout frame.
  // Poll for settled geometry; a persistent overflow must still fail.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    .toBe(true);
}

try {
  const cfg = await open('fr', 'easy');
  const seen = new Set();
  for (let i = 0; i < 20; i++) {
    const q = await visibleQuestion();
    assert.equal(q.difficulty, 'easy');
    assert.ok(!seen.has(q.id));
    seen.add(q.id);
    assert.equal(
      await page
        .locator('.photo-challenge figcaption a')
        .filter({ hasText: cfg.copy.imageOriginal })
        .count(),
      0,
    );
    if (i === 0) {
      await page.getByRole('button', { name: cfg.photo.imageZoom }).tap();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await answer(q, cfg, i !== 0);
    await noOverflow();
    if (i === 1)
      await page.screenshot({
        path: `/tmp/captivia-photo-browser-results/${engine.name()}-feedback.png`,
        fullPage: true,
      });
    await page
      .getByRole('button', { name: i === 19 ? cfg.copy.result : cfg.copy.next, exact: true })
      .tap();
  }
  await page.getByRole('heading', { name: cfg.photo.complete, exact: true }).waitFor();
  await expect(page.locator('.quiz-review')).toHaveCount(20);
  assert.equal(await page.evaluate(() => localStorage.getItem('captivia.photoquiz.v1:easy')), '19');
  await page.locator('.quiz-review summary').first().tap();
  await noOverflow();
  for (const language of ['fr', 'en', 'de', 'es', 'it', 'pt'])
    for (const level of ['easy', 'medium', 'hard']) {
      const cfg = await open(language, level);
      const q = await visibleQuestion();
      assert.equal(q.difficulty, level);
      await answer(q, cfg);
      await noOverflow();
    }
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await open('de', 'hard');
  await visibleQuestion();
  await noOverflow();
  await page.screenshot({
    path: `/tmp/captivia-photo-browser-results/${engine.name()}-dark.png`,
    fullPage: true,
  });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
  }
  // A failed image must not permit scoring; the same question can be retried.
  let failed = false;
  await context.route('**/quiz/images/**', (route) => {
    if (!failed) {
      failed = true;
      return route.abort('failed');
    }
    return route.continue();
  });
  const failure = await open('fr', 'medium');
  await expect(page.locator('.photo-game [role="alert"]')).toContainText(failure.photo.imageError);
  assert.equal(await page.locator('.photo-game .quiz-option:not(:disabled)').count(), 0);
  await page.getByRole('button', { name: failure.photo.retryImage, exact: true }).click();
  await visibleQuestion();
  await context.unroute('**/quiz/images/**');
  // The existing knowledge quiz remains accessible from the game picker.
  await page
    .locator('.quiz-game-picker button')
    .filter({ hasText: failure.photo.knowledgeTitle })
    .click();
  await page.getByRole('button', { name: failure.copy.start, exact: true }).click();
  await expect(page.locator('.quiz-question-card h2')).not.toHaveText(failure.photo.question);
  assert.equal(await page.locator('.quiz-option').count(), 4);
  assert.deepEqual(errors, []);
  console.log(
    `${engine.name()}: 200-animal photo game, 20 answers, 6 languages × 3 levels, zoom, image retry, records, review, touch, dark and 320–1440px: PASS`,
  );
} finally {
  await context.close();
  await browser.close();
}
