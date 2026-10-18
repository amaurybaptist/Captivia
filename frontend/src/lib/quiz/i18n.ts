import fr from './locales/fr.json';
import type { QuizLocale } from './types';

export type QuizCopy = typeof fr;
export const QUIZ_LOCALES: readonly QuizLocale[] = ['fr', 'en', 'de', 'es', 'it', 'pt'];
export const quizLocale = (value: string): QuizLocale =>
  QUIZ_LOCALES.includes(value as QuizLocale) ? (value as QuizLocale) : 'fr';

export function format(
  copy: QuizCopy,
  key: keyof QuizCopy,
  values: Record<string, string | number> = {},
): string {
  const template = copy[key];
  if (typeof template !== 'string') throw new Error(`Invalid quiz message: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

export async function loadQuizCopy(locale: QuizLocale): Promise<QuizCopy> {
  switch (locale) {
    case 'en':
      return (await import('./locales/en.json')).default;
    case 'de':
      return (await import('./locales/de.json')).default;
    case 'es':
      return (await import('./locales/es.json')).default;
    case 'it':
      return (await import('./locales/it.json')).default;
    case 'pt':
      return (await import('./locales/pt.json')).default;
    default:
      return fr;
  }
}
