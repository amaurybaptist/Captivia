import { API_URL } from '@/lib/config';
import { createRankedRun, loadLeaderboard, submitRankedAnswer, type QuizAccount } from '../online';
import type { QuizSettings } from '../types';

const account: QuizAccount = { id: 'user-1', token: 'secret-test-token' };
const settings: QuizSettings = {
  category: 'mammals',
  mode: 'discovery',
  duration: 60,
  difficulty: 'hard',
};
const fetchMock = global.fetch as jest.MockedFunction<typeof fetch>;

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function questionIds() {
  return Array.from({ length: 20 }, (_, index) => `mammals-${String(index + 1).padStart(3, '0')}`);
}

beforeEach(() => fetchMock.mockReset());

it('creates a ranked run with the selected filters and validates the server’s 20-question list', async () => {
  const ids = questionIds();
  fetchMock.mockResolvedValueOnce(response({ id: 'run-1', questionIds: ids, score: 0 }));

  await expect(createRankedRun(settings, account)).resolves.toEqual({
    id: 'run-1',
    questionIds: ids,
    score: 0,
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${API_URL}/quiz/runs`);
  expect(init?.method).toBe('POST');
  expect(init?.headers).toEqual({
    'Content-Type': 'application/json',
    Authorization: 'Bearer secret-test-token',
  });
  expect(JSON.parse(String(init?.body))).toEqual({ category: 'mammals', difficulty: 'hard' });
});

it.each([
  ['only nineteen IDs', questionIds().slice(0, 19)],
  ['a duplicate ID', [...questionIds().slice(0, 19), questionIds()[0]]],
  ['a non-string ID', [...questionIds().slice(0, 19), 20]],
])('rejects a ranked run with %s', async (_label, ids) => {
  fetchMock.mockResolvedValueOnce(response({ id: 'run-1', questionIds: ids, score: 0 }));
  await expect(createRankedRun(settings, account)).rejects.toThrow('Invalid quiz run');
});

it('refuses to create a ranked run for timed play without making a request', async () => {
  await expect(createRankedRun({ ...settings, mode: 'timed' }, account)).rejects.toThrow(
    'Ranked mode requires discovery',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

it('submits the canonical selected option index and rejects an impossible score payload', async () => {
  fetchMock.mockResolvedValueOnce(response({ id: 'run-1', score: 2, total: 1, completed: false }));

  await expect(submitRankedAnswer('run-1', 'mammals-001', 3, account)).rejects.toThrow(
    'Invalid ranked answer',
  );

  const [, init] = fetchMock.mock.calls[0];
  expect(init?.method).toBe('POST');
  expect(JSON.parse(String(init?.body))).toEqual({ questionId: 'mammals-001', selected: 3 });
  expect(init?.headers).toMatchObject({ Authorization: 'Bearer secret-test-token' });
});

it('does not accept a completion flag before all twenty answers are submitted', async () => {
  fetchMock.mockResolvedValueOnce(response({ id: 'run-1', score: 1, total: 19, completed: true }));
  await expect(submitRankedAnswer('run-1', 'mammals-019', 1, account)).rejects.toThrow(
    'Invalid ranked answer',
  );
});

it('loads a public leaderboard without authentication headers', async () => {
  fetchMock.mockResolvedValueOnce(
    response({
      entries: [{ rank: 1, alias: 'Curieux', score: 18, total: 20 }],
      totalPlayers: 4,
    }),
  );

  await expect(loadLeaderboard(settings)).resolves.toEqual({
    entries: [{ rank: 1, alias: 'Curieux', score: 18, total: 20 }],
    totalPlayers: 4,
  });

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${API_URL}/quiz/leaderboard?category=mammals&difficulty=hard`);
  expect(init?.method).toBe('GET');
  expect(init?.cache).toBe('no-store');
  expect(init?.headers).toEqual({});
  expect(init?.headers).not.toHaveProperty('Authorization');
});

it('rejects leaderboard rows containing a score outside the quiz range', async () => {
  fetchMock.mockResolvedValueOnce(
    response({
      entries: [{ rank: 1, alias: 'Curieux', score: 21, total: 20 }],
      totalPlayers: 1,
    }),
  );
  await expect(loadLeaderboard(settings)).rejects.toThrow('Invalid leaderboard');
});

it('propagates cancellation to the in-flight public leaderboard request', async () => {
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  const controller = new AbortController();
  const pending = loadLeaderboard(settings, controller.signal);
  controller.abort();

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
