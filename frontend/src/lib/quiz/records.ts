import type { QuizSettings } from './types';
import { DISCOVERY_LENGTH } from './engine';

const PREFIX = 'captivia.quiz.v2';
const key = (settings: QuizSettings) =>
  `${PREFIX}:${settings.category}:${settings.difficulty}:${settings.mode}:${settings.mode === 'timed' ? settings.duration : DISCOVERY_LENGTH}`;

export function readRecord(settings: QuizSettings): number | null {
  try {
    const raw = localStorage.getItem(key(settings));
    if (raw === null) return null;
    const score: unknown = JSON.parse(raw);
    const max =
      settings.mode === 'discovery' ? DISCOVERY_LENGTH : settings.category === 'all' ? 1200 : 200;
    return typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= max
      ? score
      : null;
  } catch {
    return null;
  }
}

export function saveRecord(
  settings: QuizSettings,
  score: number,
): { best: number; saved: boolean } {
  const best = Math.max(readRecord(settings) ?? 0, score);
  try {
    localStorage.setItem(key(settings), JSON.stringify(best));
    return { best, saved: true };
  } catch {
    return { best, saved: false };
  }
}
