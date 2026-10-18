import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PhotoQuiz from '../PhotoQuiz';
import copy from '@/lib/quiz/locales/fr.json';
import photo from '@/lib/quiz/photo/locales/fr.json';
import { loadPhotoRound } from '@/lib/quiz/photo/catalog';
import type { PhotoQuestion } from '@/lib/quiz/photo/types';
// Native image events exercise readiness/error guards; Next decoding is covered in browsers.
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const native = { ...props };
    delete native.fill;
    delete native.unoptimized;
    return (jest.requireActual('react') as typeof import('react')).createElement('img', native);
  },
}));
jest.mock('@/lib/quiz/photo/catalog', () => ({
  ...jest.requireActual('@/lib/quiz/photo/catalog'),
  loadPhotoRound: jest.fn(),
}));
const load = loadPhotoRound as jest.MockedFunction<typeof loadPhotoRound>;
const bank: PhotoQuestion[] = Array.from({ length: 20 }, (_, i) => ({
  id: `photo-${i}`,
  scientificName: `Genus species${i}`,
  animal: `Animal ${i}`,
  category: 'mammals',
  difficulty: 'medium',
  group: 'cat',
  recognition: 'Un signe distinctif visible.',
  didYouKnow: 'Une anecdote nouvelle sur son habitat.',
  sourceUrl: 'https://en.wikipedia.org/wiki/Test',
  distractors: ['b', 'c', 'd'],
  answer: 2,
  options: [
    { id: 'b', label: 'Choix B' },
    { id: 'c', label: 'Choix C' },
    { id: `photo-${i}`, label: `Animal ${i}` },
    { id: 'd', label: 'Choix D' },
  ],
  image: {
    src: '/quiz/images/example.jpg',
    caption: `Animal ${i}`,
    title: 'Filename identifying the species.jpg',
    width: 960,
    height: 640,
    creator: 'Auteur de la photo',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Animal.jpg',
  },
}));
beforeEach(() => {
  localStorage.clear();
  load.mockReset();
  load.mockResolvedValue(bank);
});
afterEach(() => jest.restoreAllMocks());
const draw = () => render(<PhotoQuiz locale="fr" copy={copy} photo={photo} />);
async function begin() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: copy.start }));
  });
}
function imageReady() {
  fireEvent.load(screen.getByRole('img', { name: photo.imageAlt }));
}
function answer(correct = true) {
  fireEvent.click(
    within(screen.getByRole('group', { name: copy.possibleAnswers })).getByRole('button', {
      name: correct ? /Animal/ : /Choix B/,
    }),
  );
}

it('sélectionne un niveau et masque les indices de nom/source avant la réponse', async () => {
  draw();
  fireEvent.click(screen.getByRole('button', { name: /Difficile/ }));
  await begin();
  expect(load).toHaveBeenCalledWith('fr', 'hard');
  expect(screen.queryByText(bank[0].scientificName)).not.toBeInTheDocument();
  expect(screen.queryByText(bank[0].image.title!)).not.toBeInTheDocument();
  expect(screen.getByText('Auteur de la photo', { exact: false })).toBeInTheDocument();
  expect(
    within(screen.getByRole('group', { name: copy.possibleAnswers }))
      .getAllByRole('button')
      .every((b) => (b as HTMLButtonElement).disabled),
  ).toBe(true);
  imageReady();
  answer();
  expect(screen.getByRole('heading', { name: copy.success })).toHaveFocus();
  expect(screen.getByText(bank[0].didYouKnow)).toBeInTheDocument();
  expect(screen.getByText(bank[0].recognition)).toBeInTheDocument();
  expect(screen.getAllByText(bank[0].scientificName).length).toBeGreaterThan(0);
});
it('bloque les réponses sans image, permet de réessayer puis explique une erreur', async () => {
  draw();
  await begin();
  fireEvent.error(screen.getByRole('img', { name: photo.imageAlt }));
  expect(screen.getByRole('alert')).toHaveTextContent(photo.imageError);
  expect(
    within(screen.getByRole('group', { name: copy.possibleAnswers }))
      .getAllByRole('button')
      .every((b) => (b as HTMLButtonElement).disabled),
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: photo.retryImage }));
  imageReady();
  answer(false);
  expect(screen.getByRole('heading', { name: copy.incorrect })).toBeInTheDocument();
  expect(screen.getByText(bank[0].didYouKnow)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: copy.next }));
  expect(screen.getByText('Question 2 sur 20')).toBeInTheDocument();
});
it('termine vingt photos, conserve le score une seule fois et permet la relecture', async () => {
  draw();
  await begin();
  for (let i = 0; i < 20; i++) {
    imageReady();
    answer(i !== 0);
    fireEvent.click(screen.getByRole('button', { name: i === 19 ? copy.result : copy.next }));
  }
  expect(screen.getByRole('heading', { name: photo.complete })).toHaveFocus();
  expect(
    screen.getByText('Réponses correctes : 19 · Questions répondues : 20'),
  ).toBeInTheDocument();
  expect(localStorage.getItem('captivia.photoquiz.v1:medium')).toBe('19');
  expect(screen.getAllByRole('group')).toHaveLength(20);
  await act(async () => fireEvent.click(screen.getByRole('button', { name: copy.replay })));
  expect(screen.getByText('Question 1 sur 20')).toBeInTheDocument();
});
it('reste utilisable après un échec de chargement', async () => {
  load.mockRejectedValueOnce(new Error('Chunk unavailable'));
  draw();
  await begin();
  expect(screen.getByRole('alert')).toHaveTextContent(photo.loadError);
  await begin();
  expect(screen.getByText('Question 1 sur 20')).toBeInTheDocument();
});
