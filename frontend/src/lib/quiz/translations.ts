import type { CategoryId, Question } from './types';
export type TranslatedQuestion = Pick<
  Question,
  'id' | 'animal' | 'prompt' | 'options' | 'explanation' | 'didYouKnow'
> & { imageCaption: string };
const loaders = {
  en: {
    birds: () => import('./data/translations/en/birds.json'),
    reptiles: () => import('./data/translations/en/reptiles.json'),
    insects: () => import('./data/translations/en/insects.json'),
    fish: () => import('./data/translations/en/fish.json'),
    mammals: () => import('./data/translations/en/mammals.json'),
    unusual: () => import('./data/translations/en/unusual.json'),
  },
  de: {
    birds: () => import('./data/translations/de/birds.json'),
    reptiles: () => import('./data/translations/de/reptiles.json'),
    insects: () => import('./data/translations/de/insects.json'),
    fish: () => import('./data/translations/de/fish.json'),
    mammals: () => import('./data/translations/de/mammals.json'),
    unusual: () => import('./data/translations/de/unusual.json'),
  },
  es: {
    birds: () => import('./data/translations/es/birds.json'),
    reptiles: () => import('./data/translations/es/reptiles.json'),
    insects: () => import('./data/translations/es/insects.json'),
    fish: () => import('./data/translations/es/fish.json'),
    mammals: () => import('./data/translations/es/mammals.json'),
    unusual: () => import('./data/translations/es/unusual.json'),
  },
  it: {
    birds: () => import('./data/translations/it/birds.json'),
    reptiles: () => import('./data/translations/it/reptiles.json'),
    insects: () => import('./data/translations/it/insects.json'),
    fish: () => import('./data/translations/it/fish.json'),
    mammals: () => import('./data/translations/it/mammals.json'),
    unusual: () => import('./data/translations/it/unusual.json'),
  },
  pt: {
    birds: () => import('./data/translations/pt/birds.json'),
    reptiles: () => import('./data/translations/pt/reptiles.json'),
    insects: () => import('./data/translations/pt/insects.json'),
    fish: () => import('./data/translations/pt/fish.json'),
    mammals: () => import('./data/translations/pt/mammals.json'),
    unusual: () => import('./data/translations/pt/unusual.json'),
  },
};
export async function loadQuestionTranslations(
  locale: keyof typeof loaders,
  category: CategoryId,
): Promise<TranslatedQuestion[]> {
  return (await loaders[locale][category]()).default.questions;
}
