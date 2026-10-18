import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AnimalQuiz from '../AnimalQuiz';
import { loadQuestions } from '@/lib/quiz/catalog';
import {
  createRankedRun,
  loadLeaderboard,
  submitRankedAnswer,
  type QuizAccount,
  type RankedAnswer,
  type RankedRun,
} from '@/lib/quiz/online';
import type { Question } from '@/lib/quiz/types';

jest.mock('@/lib/quiz/catalog', () => ({
  ...jest.requireActual('@/lib/quiz/catalog'),
  loadQuestions: jest.fn(),
}));

jest.mock('@/lib/quiz/online', () => ({
  createRankedRun: jest.fn(),
  submitRankedAnswer: jest.fn(),
  loadLeaderboard: jest.fn(),
}));

const mockedLoad = loadQuestions as jest.MockedFunction<typeof loadQuestions>;
const mockedCreate = createRankedRun as jest.MockedFunction<typeof createRankedRun>;
const mockedSubmit = submitRankedAnswer as jest.MockedFunction<typeof submitRankedAnswer>;
const mockedLeaderboard = loadLeaderboard as jest.MockedFunction<typeof loadLeaderboard>;
const account: QuizAccount = { id: 'user-1', token: 'test-token' };

function makeBank(count = 20): Question[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `ranked-${String(index).padStart(2, '0')}`,
    category: 'mammals',
    difficulty: 'medium',
    animal: `Animal ${index}`,
    prompt: `Question ${index} ?`,
    options: ['Option 0', 'Option 1', 'Option 2', 'Option 3'],
    answer: 2,
    explanation: `Explication ${index}`,
    didYouKnow: `Fait ${index}`,
  }));
}

function makeRun(bank = makeBank()): RankedRun {
  return { id: 'run-1', questionIds: bank.map(({ id }) => id).reverse(), score: 0 };
}

function answerGroup() {
  return screen.getByRole('group', { name: 'Réponses possibles' });
}

async function begin() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Commencer la partie' }));
  });
}

async function selectOption(optionText: string) {
  await act(async () => {
    fireEvent.click(within(answerGroup()).getByRole('button', { name: new RegExp(optionText) }));
  });
}

beforeEach(() => {
  localStorage.clear();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  mockedLoad.mockResolvedValue(makeBank());
  mockedCreate.mockReset().mockResolvedValue(makeRun());
  mockedSubmit.mockReset();
  mockedLeaderboard.mockReset().mockReturnValue(new Promise(() => undefined));
});

afterEach(() => {
  jest.restoreAllMocks();
});

it('keeps a local 20-question discovery round unranked unless the signed-in player opts in', async () => {
  const guest = render(<AnimalQuiz />);

  expect(screen.getByRole('button', { name: /Facile/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Moyen/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Difficile/ })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByText(/Connectez-vous pour participer/)).toBeInTheDocument();

  guest.unmount();
  render(<AnimalQuiz account={account} />);
  const optIn = screen.getByRole('checkbox', { name: /Participer au classement général/ });
  expect(optIn).not.toBeChecked();
  await begin();

  expect(screen.getByText('Question 1 sur 20')).toBeInTheDocument();
  expect(screen.getByText('Entraînement')).toBeInTheDocument();
  expect(mockedCreate).not.toHaveBeenCalled();
  expect(mockedSubmit).not.toHaveBeenCalled();
});

it('creates an opted-in run and follows the server question order', async () => {
  const bank = makeBank();
  const run = makeRun(bank);
  mockedLoad.mockResolvedValue(bank);
  mockedCreate.mockResolvedValue(run);
  mockedSubmit.mockResolvedValue({ id: run.id, score: 0, total: 1, completed: false });
  render(<AnimalQuiz account={account} />);

  fireEvent.click(screen.getByRole('checkbox', { name: /Participer au classement général/ }));
  await begin();

  expect(mockedCreate).toHaveBeenCalledWith(
    { category: 'all', mode: 'discovery', duration: 60, difficulty: 'medium' },
    account,
  );
  expect(screen.getByText('Question 19 ?')).toBeInTheDocument();
  expect(screen.getByText('Partie classée')).toBeInTheDocument();

  // The shuffled list moves original Option 2 to visible position 1; the server still gets index 2.
  await selectOption('Option 2');
  await waitFor(() => expect(mockedSubmit).toHaveBeenCalledWith(run.id, 'ranked-19', 2, account));
});

it('waits for server acknowledgement before revealing feedback', async () => {
  const run = makeRun();
  mockedCreate.mockResolvedValue(run);
  let acknowledge!: (value: RankedAnswer) => void;
  mockedSubmit.mockReturnValue(
    new Promise((resolve) => {
      acknowledge = resolve;
    }),
  );
  render(<AnimalQuiz account={account} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Participer au classement général/ }));
  await begin();

  await selectOption('Option 2');
  expect(screen.getByText('Validation de votre réponse…')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Bien joué !' })).not.toBeInTheDocument();
  expect(
    within(answerGroup())
      .getAllByRole('button')
      .every((button) => (button as HTMLButtonElement).disabled),
  ).toBe(true);

  await act(async () => {
    acknowledge({ id: run.id, score: 1, total: 1, completed: false });
  });
  expect(await screen.findByRole('heading', { name: 'Bien joué !' })).toBeInTheDocument();
});

it('retries the same frozen choice after a submission error and counts it only once', async () => {
  const run = makeRun();
  mockedCreate.mockResolvedValue(run);
  mockedSubmit
    .mockRejectedValueOnce(new Error('network failure'))
    .mockResolvedValueOnce({ id: run.id, score: 1, total: 1, completed: false });
  render(<AnimalQuiz account={account} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Participer au classement général/ }));
  await begin();

  await selectOption('Option 2');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'La réponse n’a pas pu être confirmée',
  );
  const choices = within(answerGroup()).getAllByRole('button');
  expect(choices.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  expect(screen.getByRole('button', { name: 'Réessayer' })).toBeEnabled();
  expect(screen.queryByRole('heading', { name: 'Bien joué !' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByRole('heading', { name: 'Bien joué !' })).toBeInTheDocument();
  expect(mockedSubmit).toHaveBeenCalledTimes(2);
  expect(mockedSubmit.mock.calls[0]).toEqual([run.id, 'ranked-19', 2, account]);
  expect(mockedSubmit.mock.calls[1]).toEqual(mockedSubmit.mock.calls[0]);
  expect(screen.getByText('1', { selector: '.quiz-score' })).toBeInTheDocument();
});

it('marks a ranked run complete only after the twentieth server-acknowledged answer', async () => {
  const bank = makeBank();
  const run = makeRun(bank);
  let score = 0;
  let total = 0;
  mockedLoad.mockResolvedValue(bank);
  mockedCreate.mockResolvedValue(run);
  mockedSubmit.mockImplementation(async (runId) => {
    total += 1;
    score += 1;
    return { id: runId, score, total, completed: total === 20 };
  });
  render(<AnimalQuiz account={account} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Participer au classement général/ }));
  await begin();

  for (let index = 0; index < 20; index += 1) {
    await selectOption('Option 2');
    await waitFor(() => expect(mockedSubmit).toHaveBeenCalledTimes(index + 1));
    await expect(mockedSubmit.mock.results[index].value).resolves.toMatchObject({
      completed: index === 19,
    });
    await screen.findByRole('heading', { name: 'Bien joué !' });
    if (index < 19) {
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Question suivante' })),
      );
    } else {
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Voir mon résultat' })),
      );
    }
  }

  expect(
    await screen.findByText('Votre résultat a été enregistré dans le classement général.'),
  ).toBeInTheDocument();
  expect(mockedSubmit).toHaveBeenCalledTimes(20);
});
