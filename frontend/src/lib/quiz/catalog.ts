import counts from './difficulty-counts.json';
import type {
  CategoryId,
  CategorySelection,
  Question,
  QuestionImage,
  QuizLocale,
  Difficulty,
} from './types';

export const CATEGORIES: {
  id: CategoryId;
  label: string;
  icon: string;
  description: string;
  source: string;
}[] = [
  {
    id: 'birds',
    label: 'Oiseaux',
    icon: '🦜',
    description: 'Vol, chants et grandes migrations',
    source: 'https://animaldiversity.org/accounts/Aves/',
  },
  {
    id: 'reptiles',
    label: 'Reptiles',
    icon: '🦎',
    description: 'Écailles, sens et adaptations',
    source: 'https://animaldiversity.org/accounts/Reptilia/',
  },
  {
    id: 'insects',
    label: 'Insectes',
    icon: '🦋',
    description: 'Un monde miniature fascinant',
    source: 'https://animaldiversity.org/accounts/Insecta/',
  },
  {
    id: 'fish',
    label: 'Poissons',
    icon: '🐠',
    description: 'Des rivières aux profondeurs',
    source: 'https://animaldiversity.org/accounts/Actinopterygii/',
  },
  {
    id: 'mammals',
    label: 'Mammifères',
    icon: '🦊',
    description: 'Nos compagnons et la vie sauvage',
    source: 'https://animaldiversity.org/accounts/Mammalia/',
  },
  {
    id: 'unusual',
    label: 'Insolite',
    icon: '🐙',
    description: 'Les surprises du monde animal',
    source: 'https://animaldiversity.org/',
  },
];

export const QUESTIONS_PER_CATEGORY = 200;
export const TOTAL_QUESTIONS = QUESTIONS_PER_CATEGORY * CATEGORIES.length;
export function categoryLabel(id: CategorySelection): string {
  return id === 'all' ? 'Aléatoire' : CATEGORIES.find((category) => category.id === id)!.label;
}

// Only the selected bank is downloaded. Aléatoire loads all six banks on demand.
const loaders = {
  birds: () => import('./data/birds.json'),
  reptiles: () => import('./data/reptiles.json'),
  insects: () => import('./data/insects.json'),
  fish: () => import('./data/fish.json'),
  mammals: () => import('./data/mammals.json'),
  unusual: () => import('./data/unusual.json'),
};

const imageLoaders = {
  birds: () => import('./images/birds.json'),
  reptiles: () => import('./images/reptiles.json'),
  insects: () => import('./images/insects.json'),
  fish: () => import('./images/fish.json'),
  mammals: () => import('./images/mammals.json'),
  unusual: () => import('./images/unusual.json'),
};

export async function loadQuestions(
  selection: CategorySelection,
  locale: QuizLocale = 'fr',
): Promise<Question[]> {
  const categories = selection === 'all' ? CATEGORIES.map(({ id }) => id) : [selection];
  const banks = await Promise.all(
    categories.map(async (category) => {
      const [{ default: bank }, { default: imageCatalog }] = await Promise.all([
        loaders[category](),
        imageLoaders[category](),
      ]);
      const images: Record<string, QuestionImage> = imageCatalog;
      const translated =
        locale === 'fr'
          ? []
          : await (await import('./translations')).loadQuestionTranslations(locale, category);
      const byId = new Map(translated.map((question) => [question.id, question]));
      return bank.map((question) => {
        const text = byId.get(question.id);
        if (locale !== 'fr' && !text) throw new Error(`Missing ${locale}/${question.id}`);
        return {
          ...question,
          ...text,
          difficulty: question.difficulty as Difficulty,
          category,
          image: {
            ...images[question.id],
            caption: text?.imageCaption ?? images[question.id].caption,
          },
        };
      });
    }),
  );
  return banks.flat();
}

export function questionCount(selection: CategorySelection, difficulty: Difficulty): number {
  return selection === 'all'
    ? CATEGORIES.reduce((sum, category) => sum + counts[category.id][difficulty], 0)
    : counts[selection][difficulty];
}
