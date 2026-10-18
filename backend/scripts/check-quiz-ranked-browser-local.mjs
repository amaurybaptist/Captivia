// Real browser + API against the disposable local quiz database, never production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
const frontendRequire = createRequire(
  new URL('../../frontend/package.json', import.meta.url),
);
const { chromium, webkit } = frontendRequire('playwright');
const { expect } = frontendRequire('@playwright/test');
const ui = new URL(process.env.QUIZ_BASE_URL || 'http://localhost:4318');
const api = new URL(process.env.QUIZ_API_BASE || 'http://localhost:4319');
const db = new URL(process.env.QUIZ_TEST_DATABASE_URL || '');
if (
  ![ui, api, db].every((url) =>
    ['localhost', '127.0.0.1'].includes(url.hostname),
  ) ||
  db.port !== '55439' ||
  db.pathname !== '/captivia_quiz_test'
)
  throw new Error('Disposable loopback quiz database required');
const prisma = new PrismaClient({ datasources: { db: { url: db.href } } });
const engine = process.env.QUIZ_BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch();
let userId;
try {
  const response = await fetch(`${api.origin}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `quiz-browser-${randomUUID()}@example.test`,
      password: 'Local-Test-Only-9!',
      locale: 'en',
    }),
  });
  assert.equal(response.status, 201);
  const account = await response.json();
  userId = account.user.id;
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'en-GB',
  });
  await context.addInitScript((account) => {
    localStorage.setItem('token', account.accessToken);
    localStorage.setItem('user', JSON.stringify(account.user));
  }, account);
  await context.route('**/auth/me', (route) =>
    route
      .fetch({ url: `${api.origin}/auth/me` })
      .then((response) => route.fulfill({ response })),
  );
  let failOneAnswer = true;
  await context.route('**/quiz/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/answers') && failOneAnswer) {
      failOneAnswer = false;
      await route.abort('failed');
      return;
    }
    const response = await route.fetch({
      url: `${api.origin}${url.pathname}${url.search}`,
    });
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const copy = JSON.parse(
    await readFile(
      new URL('../../frontend/src/lib/quiz/locales/en.json', import.meta.url),
      'utf8',
    ),
  );
  const translated = JSON.parse(
    await readFile(
      new URL(
        '../../frontend/src/lib/quiz/data/translations/en/mammals.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ).questions;
  const source = JSON.parse(
    await readFile(
      new URL('../../frontend/src/lib/quiz/data/mammals.json', import.meta.url),
      'utf8',
    ),
  );
  const byPrompt = new Map(
    translated.map((q) => [
      q.prompt,
      { ...q, answer: source.find((s) => s.id === q.id).answer },
    ]),
  );
  await page.goto(`${ui.origin}/en/jeu`, { waitUntil: 'networkidle' });
  await page
    .getByRole('button', {
      name: new RegExp(`^${copy.categoriesData.mammals.label}`),
    })
    .click();
  await page.getByRole('checkbox', { name: new RegExp(copy.ranked) }).check();
  await page.getByRole('button', { name: copy.start, exact: true }).click();
  for (let index = 0; index < 20; index++) {
    const question = byPrompt.get(
      await page.locator('.quiz-question-card h2').innerText(),
    );
    assert.ok(question);
    await page
      .locator('.quiz-option')
      .filter({
        has: page.getByText(question.options[question.answer], { exact: true }),
      })
      .click();
    if (index === 0) {
      await expect(page.locator('.quiz-page [role="alert"]')).toContainText(
        copy.rankedError,
      );
      assert.equal(
        await page.locator('.quiz-option:not(:disabled)').count(),
        0,
      );
      await page.getByRole('button', { name: copy.retry, exact: true }).click();
    }
    await page
      .getByRole('heading', { name: copy.success, exact: true })
      .waitFor();
    await page
      .getByRole('button', {
        name: index === 19 ? copy.result : copy.next,
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole('status').filter({ hasText: copy.rankedSaved }),
  ).toBeVisible();
  await expect(page.locator('.quiz-ranking-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.quiz-ranking-table tbody')).toContainText(
    '20 / 20',
  );
  const completed = await prisma.quizRun.findFirst({
    where: { userId, completedAt: { not: null } },
  });
  assert.equal(completed.score, 20);
  await page.getByRole('button', { name: copy.friends, exact: true }).click();
  await expect(page.getByText(copy.comingSoon, { exact: true })).toBeVisible();
  assert.ok(
    !(await page.locator('.quiz-leaderboard').innerText()).includes(
      account.user.email,
    ),
  );
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: `/tmp/captivia-quiz-browser-results/${engine.name()}-ranked.png`,
    fullPage: true,
  });
  await context.close();
  console.log(
    `${engine.name()}: real authenticated ranked game, failed answer retry, 20 server acknowledgements, persisted 20/20 and general table: PASS`,
  );
} finally {
  await browser.close();
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
