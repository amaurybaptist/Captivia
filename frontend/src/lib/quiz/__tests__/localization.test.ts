import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATEGORIES, loadQuestions } from '../catalog';
import { prepareQuestions } from '../engine';
import type { QuizLocale } from '../types';

const locales: QuizLocale[] = ['en', 'de', 'es', 'it', 'pt'];
const normalized = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const placeholders = (value: string) =>
  [...value.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]).sort();

describe('traductions du quiz', () => {
  it('fournit 1 200 questions traduites dans le même ordre, avec réponses et photos correctement fusionnées', async () => {
    const french = await loadQuestions('all', 'fr');
    expect(french).toHaveLength(1200);

    for (const locale of locales) {
      const translated = await loadQuestions('all', locale);
      const captionById = new Map<string, string>();
      for (const category of CATEGORIES) {
        const translatedBank = JSON.parse(
          readFileSync(
            resolve(__dirname, `../data/translations/${locale}/${category.id}.json`),
            'utf8',
          ),
        ) as { questions: { id: string; imageCaption: string }[] };
        for (const question of translatedBank.questions)
          captionById.set(question.id, question.imageCaption);
      }
      expect(translated).toHaveLength(french.length);
      expect(translated.map(({ id }) => id)).toEqual(french.map(({ id }) => id));

      translated.forEach((question, index) => {
        const source = french[index];
        expect(question.id).toBe(source.id);
        expect(question.answer).toBe(source.answer);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map(normalized)).size).toBe(4);
        expect(question.image?.caption).toBeTruthy();
        expect(question.image?.caption).toBe(captionById.get(question.id));

        for (const key of ['animal', 'prompt', 'explanation', 'didYouKnow'] as const) {
          expect(question[key].trim()).not.toBe('');
          expect(question[key]).not.toMatch(
            /\b(?:TODO|TBD)\b|lorem ipsum|à compléter|translation missing/,
          );
          expect(question[key]).not.toMatch(/^\s*[\w-]+(?:\.[\w-]+)+\s*$/);
        }
        // Animal names can be proper names; the actual question and learning text must be translated.
        for (const key of ['prompt', 'explanation', 'didYouKnow'] as const) {
          expect(normalized(question[key])).not.toBe(normalized(source[key]));
        }
        expect(question.options.every((option) => option.trim().length > 0)).toBe(true);
        // Scientific binomials are identical across languages; do not translate taxa.
        if (!source.options.every((option) => /^[A-Z][a-z]+ [a-z]+$/.test(option))) {
          expect(question.options.map(normalized)).not.toEqual(source.options.map(normalized));
        }
      });
    }
  });

  it('conserve au moins 40 questions par difficulté et catégorie, et permet une partie filtrée de 20 questions', async () => {
    const levels = ['easy', 'medium', 'hard'] as const;
    for (const category of CATEGORIES) {
      const frenchBank = await loadQuestions(category.id, 'fr');
      for (const difficulty of levels) {
        expect(
          frenchBank.filter((question) => question.difficulty === difficulty).length,
        ).toBeGreaterThanOrEqual(40);
      }

      for (const locale of locales) {
        const bank = await loadQuestions(category.id, locale);
        for (const difficulty of levels) {
          const round = prepareQuestions(
            bank,
            {
              category: category.id,
              mode: 'discovery',
              duration: 60,
              difficulty,
            },
            () => 0.37,
          );
          expect(round).toHaveLength(20);
          expect(
            round.every(
              (question) => question.category === category.id && question.difficulty === difficulty,
            ),
          ).toBe(true);
          expect(new Set(round.map(({ id }) => id)).size).toBe(20);
        }
      }
    }
  });

  it('garde les mêmes clés et variables de traduction dans toutes les interfaces', () => {
    const readLocale = (locale: string): unknown =>
      JSON.parse(readFileSync(resolve(__dirname, `../locales/${locale}.json`), 'utf8'));
    const reference = readLocale('fr');

    const flatten = (value: unknown, prefix = ''): Map<string, string> => {
      expect(value).toBeTruthy();
      expect(typeof value).toBe('object');
      const entries = new Map<string, string>();
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof child === 'string') {
          expect(child.trim()).not.toBe('');
          entries.set(path, child);
        } else {
          for (const [nestedKey, nestedValue] of flatten(child, path))
            entries.set(nestedKey, nestedValue);
        }
      }
      return entries;
    };

    const frenchKeys = flatten(reference);
    for (const locale of locales) {
      const entries = flatten(readLocale(locale));
      expect([...entries.keys()].sort()).toEqual([...frenchKeys.keys()].sort());
      for (const [key, text] of entries) {
        expect(placeholders(text)).toEqual(placeholders(frenchKeys.get(key)!));
      }
    }
  });
});
