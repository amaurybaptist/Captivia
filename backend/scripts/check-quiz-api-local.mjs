// Explicitly local disposable database only. Creates fixture accounts, then removes them.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
const base = new URL(process.env.QUIZ_API_BASE || 'http://localhost:4319');
const database = new URL(process.env.QUIZ_TEST_DATABASE_URL || '');
if (
  !['localhost', '127.0.0.1'].includes(base.hostname) ||
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  database.port !== '55439' ||
  database.pathname !== '/captivia_quiz_test'
)
  throw new Error('Explicit disposable loopback quiz database required');
const prisma = new PrismaClient({
  datasources: { db: { url: database.href } },
});
const bank = JSON.parse(
  await readFile(
    new URL('../src/quiz/data/questions.json', import.meta.url),
    'utf8',
  ),
);
const byId = new Map(bank.map((q) => [q.id, q]));
const accounts = [];
async function call(path, body, account, status = 200) {
  const response = await fetch(`${base.origin}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(account ? { Authorization: `Bearer ${account.accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  assert.equal(response.status, status, `${path}: ${JSON.stringify(result)}`);
  return result;
}
async function register() {
  const account = await call(
    'auth/register',
    {
      email: `quiz-${randomUUID()}@example.test`,
      password: 'Local-Test-Only-9!',
      locale: 'fr',
    },
    null,
    201,
  );
  accounts.push(account);
  return account;
}
async function runFor(account, wrong = 0) {
  const run = await call(
    'quiz/runs',
    { category: 'birds', difficulty: 'medium' },
    account,
    201,
  );
  assert.equal(run.questionIds.length, 20);
  assert.equal(new Set(run.questionIds).size, 20);
  await call(
    `quiz/runs/${run.id}/answers`,
    { questionId: run.questionIds[1], selected: 0 },
    account,
    409,
  );
  for (let i = 0; i < 20; i++) {
    const question = byId.get(run.questionIds[i]);
    assert.equal(question.difficulty, 'medium');
    assert.equal(question.category, 'birds');
    const selected = i < wrong ? (question.answer + 1) % 4 : question.answer;
    const body = { questionId: question.id, selected };
    const result = await call(
      `quiz/runs/${run.id}/answers`,
      body,
      account,
      201,
    );
    assert.equal(result.score, Math.max(0, i + 1 - wrong));
    assert.equal(result.completed, i === 19);
    if (i === 0) {
      // Real concurrent retries under PostgreSQL row locks, not mocked promises.
      const retries = await Promise.all([
        call(`quiz/runs/${run.id}/answers`, body, account, 201),
        call(`quiz/runs/${run.id}/answers`, body, account, 201),
      ]);
      assert.deepEqual(retries[0], result);
      assert.deepEqual(retries[1], result);
      await call(
        `quiz/runs/${run.id}/answers`,
        { ...body, selected: (selected + 1) % 4 },
        account,
        409,
      );
    }
  }
  return run;
}
try {
  await call(
    'quiz/runs',
    { category: 'birds', difficulty: 'medium' },
    null,
    401,
  );
  const a = await register(),
    b = await register();
  await call(
    'quiz/runs',
    { category: 'birds', difficulty: 'impossible' },
    a,
    400,
  );
  await call(
    'quiz/runs',
    { category: 'birds', difficulty: 'medium', score: 20 },
    a,
    400,
  );
  await call(
    'quiz/runs',
    { category: 'birds', difficulty: 'medium', mode: 'timed' },
    a,
    400,
  );
  const run = await runFor(a, 1);
  await runFor(a, 3);
  await runFor(b, 1);
  await call(
    `quiz/runs/${run.id}/answers`,
    {
      questionId: run.questionIds[0],
      selected: byId.get(run.questionIds[0]).answer,
    },
    b,
    403,
  );
  const table = await call('quiz/leaderboard?category=birds&difficulty=medium');
  assert.equal(table.totalPlayers, 2);
  assert.equal(table.entries.length, 2);
  assert.ok(
    table.entries.every(
      (e) => e.score === 19 && e.rank === 1 && e.total === 20,
    ),
  );
  const publicData = JSON.stringify(table);
  for (const account of accounts) {
    assert.ok(!publicData.includes(account.user.email));
    assert.ok(!publicData.includes(account.user.id));
  }
  assert.equal(
    (await call('quiz/leaderboard?category=birds&difficulty=hard'))
      .totalPlayers,
    0,
  );
  const mixed = await call(
    'quiz/runs',
    { category: 'all', difficulty: 'hard' },
    a,
    201,
  );
  assert.equal(
    new Set(mixed.questionIds.slice(0, 6).map((id) => byId.get(id).category))
      .size,
    6,
  );
  assert.ok(
    mixed.questionIds.every((id) => byId.get(id).difficulty === 'hard'),
  );
  await prisma.quizRun.update({
    where: { id: mixed.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  await call(
    `quiz/runs/${mixed.id}/answers`,
    { questionId: mixed.questionIds[0], selected: 0 },
    a,
    409,
  );
  console.log(
    'Quiz API + real PostgreSQL: auth, filters, 20 answers, canonical scoring, concurrent retries, privacy, best per player, ties, expiry: PASS',
  );
} finally {
  await prisma.user.deleteMany({
    where: { id: { in: accounts.map((a) => a.user.id) } },
  });
  await prisma.$disconnect();
}
