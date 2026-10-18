import { getApiBase } from '@/lib/api';
import type { QuizSettings } from './types';

export interface QuizAccount {
  id: string;
  token: string;
}
export interface RankedRun {
  id: string;
  questionIds: string[];
  score: number;
}
export interface RankedAnswer {
  id: string;
  score: number;
  total: number;
  completed: boolean;
}
export interface Leaderboard {
  entries: { rank: number; alias: string; score: number; total: number }[];
  totalPlayers: number;
}

async function request(
  path: string,
  body?: object,
  token?: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${getApiBase()}/quiz/${path}`, {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error(`Quiz request failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
export async function createRankedRun(
  settings: QuizSettings,
  account: QuizAccount,
): Promise<RankedRun> {
  if (settings.mode !== 'discovery') throw new Error('Ranked mode requires discovery');
  const value = await request(
    'runs',
    { category: settings.category, difficulty: settings.difficulty },
    account.token,
  );
  if (
    !object(value) ||
    typeof value.id !== 'string' ||
    value.score !== 0 ||
    !Array.isArray(value.questionIds) ||
    value.questionIds.length !== 20 ||
    !value.questionIds.every((id) => typeof id === 'string') ||
    new Set(value.questionIds).size !== 20
  )
    throw new Error('Invalid quiz run');
  return value as unknown as RankedRun;
}
export async function submitRankedAnswer(
  runId: string,
  questionId: string,
  selected: number,
  account: QuizAccount,
): Promise<RankedAnswer> {
  const value = await request(
    `runs/${encodeURIComponent(runId)}/answers`,
    { questionId, selected },
    account.token,
  );
  if (
    !object(value) ||
    value.id !== runId ||
    !Number.isInteger(value.score) ||
    !Number.isInteger(value.total) ||
    (value.total as number) < 1 ||
    (value.total as number) > 20 ||
    (value.score as number) < 0 ||
    (value.score as number) > (value.total as number) ||
    typeof value.completed !== 'boolean' ||
    value.completed !== (value.total === 20)
  )
    throw new Error('Invalid ranked answer');
  return value as unknown as RankedAnswer;
}
export async function loadLeaderboard(
  settings: Pick<QuizSettings, 'category' | 'difficulty'>,
  signal?: AbortSignal,
): Promise<Leaderboard> {
  const params = new URLSearchParams({
    category: settings.category,
    difficulty: settings.difficulty,
  });
  const value = await request(`leaderboard?${params}`, undefined, undefined, signal);
  if (
    !object(value) ||
    !Array.isArray(value.entries) ||
    value.entries.length > 50 ||
    !Number.isInteger(value.totalPlayers) ||
    (value.totalPlayers as number) < value.entries.length ||
    !value.entries.every(
      (row) =>
        object(row) &&
        Number.isInteger(row.rank) &&
        (row.rank as number) >= 1 &&
        typeof row.alias === 'string' &&
        row.alias.length <= 120 &&
        Number.isInteger(row.score) &&
        (row.score as number) >= 0 &&
        (row.score as number) <= 20 &&
        row.total === 20,
    )
  )
    throw new Error('Invalid leaderboard');
  return value as unknown as Leaderboard;
}
