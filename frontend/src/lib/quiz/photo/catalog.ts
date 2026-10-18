import { shuffle } from '../engine';
import type { Difficulty, QuizLocale } from '../types';
import type { PhotoAnimal, PhotoQuestion, PhotoText } from './types';
export const PHOTO_ROUND_LENGTH = 20;
export const PHOTO_LEVEL_COUNTS = { easy: 59, medium: 79, hard: 62 } as const;
export const PHOTO_ANIMAL_COUNT = 200;
const translations = {
  en: () => import('./translations/en.json'),
  de: () => import('./translations/de.json'),
  es: () => import('./translations/es.json'),
  it: () => import('./translations/it.json'),
  pt: () => import('./translations/pt.json'),
};
export async function loadPhotoAnimals(locale: QuizLocale): Promise<PhotoAnimal[]> {
  const { default: rows } = await import('./animals.json');
  if (locale === 'fr') return rows as PhotoAnimal[];
  const { default: translated } = await translations[locale]();
  const byId = new Map<string, PhotoText>(translated.animals.map((a) => [a.id, a]));
  return rows.map((row) => {
    const text = byId.get(row.id);
    if (!text) throw new Error(`Missing photo translation: ${locale}/${row.id}`);
    return { ...row, ...text } as PhotoAnimal;
  });
}
export async function loadPhotoRound(
  locale: QuizLocale,
  difficulty: Difficulty,
  random = Math.random,
): Promise<PhotoQuestion[]> {
  const [animals, { default: images }] = await Promise.all([
    loadPhotoAnimals(locale),
    import('./images.json'),
  ]);
  const imageMap = images as Record<string, PhotoQuestion['image']>;
  const byId = new Map(animals.map((a) => [a.id, a]));
  const selected = shuffle(
    animals.filter((a) => a.difficulty === difficulty),
    random,
  ).slice(0, PHOTO_ROUND_LENGTH);
  if (selected.length !== PHOTO_ROUND_LENGTH) throw new Error('Insufficient photo animals');
  return selected.map((animal) => {
    const image = imageMap[animal.id];
    if (!image) throw new Error(`Missing photo: ${animal.id}`);
    const options = shuffle(
      [animal.id, ...animal.distractors].map((id) => {
        const other = byId.get(id);
        if (!other) throw new Error(`Missing choice: ${id}`);
        return { id, label: other.animal };
      }),
      random,
    );
    if (
      options.length !== 4 ||
      new Set(options.map((o) => o.label.toLocaleLowerCase(locale))).size !== 4
    )
      throw new Error('Ambiguous photo choices');
    return {
      ...animal,
      image: { ...image, caption: animal.animal },
      options,
      answer: options.findIndex((o) => o.id === animal.id),
    };
  });
}
export function readPhotoRecord(difficulty: Difficulty): number | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(`captivia.photoquiz.v1:${difficulty}`) ?? 'null',
    );
    return typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= PHOTO_ROUND_LENGTH
      ? value
      : null;
  } catch {
    return null;
  }
}
export function savePhotoRecord(
  difficulty: Difficulty,
  score: number,
): { best: number; saved: boolean } {
  const best = Math.max(readPhotoRecord(difficulty) ?? 0, score);
  try {
    localStorage.setItem(`captivia.photoquiz.v1:${difficulty}`, JSON.stringify(best));
    return { best, saved: true };
  } catch {
    return { best, saved: false };
  }
}
