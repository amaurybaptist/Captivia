import { fireEvent, render, screen } from '@testing-library/react';
import QuestionPhoto from '../QuestionPhoto';
import type { QuestionImage } from '@/lib/quiz/types';

const image: QuestionImage = {
  src: '/quiz/images/animal.jpg',
  width: 960,
  height: 640,
  title: 'Ambystoma mexicanum',
  caption: 'Axolotl',
  creator: 'Photographe test',
  licenseName: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourcePage: 'https://commons.wikimedia.org/wiki/File:Axolotl.jpg',
};

it('affiche une image locale et ses crédits sans nommer la réponse avant le choix', () => {
  const { rerender } = render(<QuestionPhoto image={image} />);
  expect(new URL((screen.getByRole('img') as HTMLImageElement).src).pathname).toBe(
    '/quiz/images/animal.jpg',
  );
  expect(screen.queryByText('Axolotl')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Photographe test/ })).toHaveAttribute(
    'href',
    image.sourcePage,
  );
  expect(screen.getByRole('link', { name: /CC BY-SA/ })).toHaveAttribute('href', image.licenseUrl);
  rerender(<QuestionPhoto image={image} revealName />);
  expect(screen.getByRole('img')).toHaveAccessibleName('Axolotl');
  expect(screen.getByText('Axolotl')).toBeInTheDocument();
});

it('permet de continuer le jeu si le chargement de la photo échoue', () => {
  render(<QuestionPhoto image={image} />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByRole('status')).toHaveTextContent('Vous pouvez continuer à répondre');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Photographe test/ })).toBeInTheDocument();
});
