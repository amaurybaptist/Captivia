import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadPhotoAnimals,
  loadPhotoRound,
  PHOTO_LEVEL_COUNTS,
  readPhotoRecord,
  savePhotoRecord,
} from '../catalog';
import { loadPhotoCopy } from '../i18n';
import type { Difficulty, QuizLocale } from '../../types';
const locales: QuizLocale[] = ['fr', 'en', 'de', 'es', 'it', 'pt'];

it('propose 200 espèces distinctes dans les six langues et trois niveaux cohérents', async () => {
  for (const locale of locales) {
    const animals = await loadPhotoAnimals(locale);
    expect(animals).toHaveLength(200);
    expect(new Set(animals.map((a) => a.scientificName)).size).toBe(200);
    expect(new Set(animals.map((a) => a.id)).size).toBe(200);
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      expect(animals.filter((a) => a.difficulty === difficulty)).toHaveLength(
        PHOTO_LEVEL_COUNTS[difficulty],
      );
      const round = await loadPhotoRound(locale, difficulty, () => 0.37);
      expect(round).toHaveLength(20);
      expect(new Set(round.map((a) => a.id)).size).toBe(20);
      for (const q of round) {
        expect(q.difficulty).toBe(difficulty);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
        expect(new Set(q.options.map((o) => o.label.toLocaleLowerCase(locale))).size).toBe(4);
        expect(q.options[q.answer]).toEqual({ id: q.id, label: q.animal });
        expect(q.image.src).toMatch(/^\/quiz\/images\//);
        expect(q.image.creator).toBeTruthy();
        expect(q.recognition).toBeTruthy();
        expect(q.didYouKnow).toBeTruthy();
      }
    }
  }
});
it('ne reprend pas textuellement une ancienne anecdote pour le même taxon', async () => {
  const old = new Map<string, Set<string>>();
  for (const category of ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual']) {
    const bank = JSON.parse(
      readFileSync(resolve(__dirname, `../../data/${category}.json`), 'utf8'),
    ) as { id: string; didYouKnow: string }[];
    const subjects = JSON.parse(
      readFileSync(resolve(__dirname, `../../data/${category}-image-subjects.json`), 'utf8'),
    ) as Record<string, { query: string }>;
    for (const q of bank) {
      const values = old.get(subjects[q.id].query) ?? new Set();
      values.add(q.didYouKnow);
      old.set(subjects[q.id].query, values);
    }
  }
  for (const animal of await loadPhotoAnimals('fr'))
    expect(old.get(animal.scientificName)?.has(animal.didYouKnow)).not.toBe(true);
});
it('garde des interfaces complètes et les mêmes variables dans les six langues', async () => {
  const fr = await loadPhotoCopy('fr');
  for (const locale of locales) {
    const copy = await loadPhotoCopy(locale);
    expect(Object.keys(copy).sort()).toEqual(Object.keys(fr).sort());
    for (const key of Object.keys(fr) as (keyof typeof fr)[]) {
      expect(copy[key].trim()).toBeTruthy();
      expect(copy[key].match(/\{\w+\}/g)).toEqual(fr[key].match(/\{\w+\}/g));
    }
  }
});
it('sépare les records photo des records connaissances et des autres difficultés', () => {
  localStorage.clear();
  localStorage.setItem('captivia.quiz.v2:all:medium:discovery:20', '20');
  expect(readPhotoRecord('medium')).toBeNull();
  expect(savePhotoRecord('medium', 12)).toEqual({ best: 12, saved: true });
  expect(savePhotoRecord('medium', 4).best).toBe(12);
  expect(readPhotoRecord('hard')).toBeNull();
  localStorage.setItem('captivia.photoquiz.v1:medium', '21');
  expect(readPhotoRecord('medium')).toBeNull();
});
