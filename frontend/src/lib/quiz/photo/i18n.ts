import fr from './locales/fr.json';
import type { QuizLocale } from '../types';
export type PhotoCopy = typeof fr;
export async function loadPhotoCopy(locale: QuizLocale): Promise<PhotoCopy> {
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
