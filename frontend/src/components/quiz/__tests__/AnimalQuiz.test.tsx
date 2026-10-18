import { act, fireEvent, render, screen, within } from '@testing-library/react';
import AnimalQuiz from '../AnimalQuiz';
import { loadQuestions } from '@/lib/quiz/catalog';
import type { CategoryId, Question } from '@/lib/quiz/types';

jest.mock('../QuizLeaderboard', () => ({ __esModule: true, default: () => null }));

jest.mock('@/lib/quiz/catalog', () => ({
  ...jest.requireActual('@/lib/quiz/catalog'),
  loadQuestions: jest.fn(),
}));
const mockedLoad = loadQuestions as jest.MockedFunction<typeof loadQuestions>;
const categories: CategoryId[] = ['birds', 'reptiles', 'insects', 'fish', 'mammals', 'unusual'];
const bank: Question[] = categories.flatMap((category) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `${category}-${i}`,
    category,
    difficulty: 'medium' as const,
    animal: 'Animal test',
    prompt: `Question ${category} ${i} ?`,
    options: ['Bonne option', 'Mauvaise option 1', 'Mauvaise option 2', 'Mauvaise option 3'],
    answer: 0,
    explanation: 'Une explication pédagogique.',
    didYouKnow: 'Un fait complémentaire.',
  })),
);

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  mockedLoad.mockResolvedValue(bank);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function begin(timed = false) {
  if (timed) fireEvent.click(screen.getByRole('button', { name: /Chronomètre/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }));
  });
}
function answer(correct: boolean) {
  const options = screen.getByRole('group', { name: 'Réponses possibles' });
  fireEvent.click(
    within(options).getByRole('button', { name: correct ? /Bonne option/ : /Mauvaise option 1/ }),
  );
}

it('affiche six banques de 200 et une catégorie aléatoire de 1 200', () => {
  render(<AnimalQuiz />);
  for (const name of [
    'Oiseaux',
    'Reptiles',
    'Insectes',
    'Poissons',
    'Mammifères',
    'Insolite',
    'Aléatoire',
  ]) {
    expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
  }
  expect(screen.getByText('1 200 questions · 200 par catégorie')).toBeInTheDocument();
});

it.each([true, false])(
  'explique une réponse %s avec le chien et le saviez-vous',
  async (correct) => {
    render(<AnimalQuiz />);
    await begin();
    answer(correct);
    expect(
      screen.getByRole('heading', { name: correct ? 'Bien joué !' : 'Pas cette fois…' }),
    ).toHaveFocus();
    expect(screen.getByText('Une explication pédagogique.')).toBeInTheDocument();
    expect(screen.getByText('Un fait complémentaire.')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: correct ? /chien content/ : /chien déçu/ }),
    ).toBeInTheDocument();
    const options = within(screen.getByRole('group', { name: 'Réponses possibles' })).getAllByRole(
      'button',
    );
    expect(options.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Question suivante' }));
    expect(screen.getByText('Question 2 sur 20')).toBeInTheDocument();
  },
);

it('ajoute cinq secondes, suspend la lecture et reprend le chronomètre', async () => {
  render(<AnimalQuiz />);
  await begin(true);
  act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByRole('timer')).toHaveTextContent('50 s');
  answer(true);
  expect(screen.getByRole('timer')).toHaveTextContent('55 s');
  expect(screen.getByRole('timer')).toHaveTextContent('en pause');
  act(() => jest.advanceTimersByTime(120000));
  expect(screen.getByRole('timer')).toHaveTextContent('55 s');
  fireEvent.click(screen.getByRole('button', { name: 'Question suivante' }));
  act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByRole('timer')).toHaveTextContent('45 s');
});

it('termine à la fin du temps et montre la réponse sans la compter', async () => {
  render(<AnimalQuiz />);
  await begin(true);
  act(() => jest.advanceTimersByTime(60000));
  expect(screen.getByRole('heading', { name: 'Le temps est écoulé !' })).toHaveFocus();
  expect(screen.getByText('Sans réponse · Animal test')).toBeInTheDocument();
  expect(screen.getByText('Réponses correctes : 0 · Questions répondues : 0')).toBeInTheDocument();
  expect(screen.getByText('Une explication pédagogique.')).toBeInTheDocument();
});

it('termine les vingt questions, enregistre le record et permet de rejouer', async () => {
  render(<AnimalQuiz />);
  await begin();
  for (let i = 0; i < 20; i++) {
    answer(i !== 0);
    fireEvent.click(
      screen.getByRole('button', { name: i === 19 ? 'Voir mon résultat' : 'Question suivante' }),
    );
  }
  expect(screen.getByRole('heading', { name: 'Belle exploration !' })).toBeInTheDocument();
  expect(
    screen.getByText('Réponses correctes : 19 · Questions répondues : 20'),
  ).toBeInTheDocument();
  expect(screen.getByText('Record sur cet appareil : 19')).toBeInTheDocument();
  expect(screen.getAllByRole('group')).toHaveLength(20); // native details review
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Rejouer' }));
  });
  expect(screen.getByText('Question 1 sur 20')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Catégories' }));
  expect(screen.getByRole('button', { name: 'Commencer la partie' })).toBeInTheDocument();
});

it('gère une erreur de chargement puis une nouvelle tentative', async () => {
  mockedLoad.mockRejectedValueOnce(new Error('Hors ligne'));
  render(<AnimalQuiz />);
  await begin();
  expect(screen.getByRole('alert')).toHaveTextContent('Les questions n’ont pas pu être chargées');
  await begin();
  expect(screen.getByText('Question 1 sur 20')).toBeInTheDocument();
});

it('intègre la photo de la question et révèle sa légende après la réponse', async () => {
  mockedLoad.mockResolvedValue(
    bank.map((q) => ({
      ...q,
      image: {
        src: '/quiz/images/axolotl.jpg',
        width: 960,
        height: 640,
        caption: 'Axolotl',
        creator: 'Auteur test',
        licenseName: 'CC BY 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        sourcePage: 'https://commons.wikimedia.org/wiki/File:Axolotl.jpg',
      },
    })),
  );
  render(<AnimalQuiz />);
  await begin();
  expect(
    screen.getByRole('img', { name: 'Image de l’animal évoqué dans la question' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('Axolotl')).not.toBeInTheDocument();
  answer(true);
  expect(screen.getByRole('img', { name: 'Axolotl' })).toBeInTheDocument();
  expect(screen.getByText('Axolotl')).toBeInTheDocument();
});
