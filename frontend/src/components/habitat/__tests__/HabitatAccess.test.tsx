import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HabitatAccess from '../HabitatAccess';
const mockAuth: {
  user: { id: string; isPremium: boolean } | null;
  token: string | null;
  isLoading: boolean;
} = { user: { id: 'a', isPremium: true }, token: 'token-a', isLoading: false };
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('@/lib/api', () => ({ getApiBase: () => 'http://localhost:3001' }));
jest.mock(
  'next/dynamic',
  () => () =>
    function MockPlanner({ initialAnimalId }: { initialAnimalId: string }) {
      return <div data-testid="planner">Atelier {initialAnimalId}</div>;
    },
);
const profile = (isPremium: boolean, id = 'a') => ({
  ok: true,
  status: 200,
  json: async () => ({ id, isPremium }),
});
beforeEach(() => {
  mockAuth.user = { id: 'a', isPremium: true };
  mockAuth.token = 'token-a';
  mockAuth.isLoading = false;
  global.fetch = jest.fn().mockResolvedValue(profile(true));
  localStorage.clear();
});
it('présente Premium aux visiteurs sans charger le concepteur ni appeler les API', () => {
  mockAuth.user = null;
  mockAuth.token = null;
  render(<HabitatAccess locale="fr" />);
  expect(screen.getByRole('link', { name: 'Découvrir Premium' })).toHaveAttribute(
    'href',
    '/fr/parametres/abonnement',
  );
  expect(screen.getByRole('link', { name: 'Déjà membre ? Se connecter' })).toHaveAttribute(
    'href',
    '/fr/login',
  );
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
it('ignore une fausse valeur Premium dans le cache du navigateur', async () => {
  jest.mocked(fetch).mockResolvedValue(profile(false) as Response);
  render(<HabitatAccess locale="fr" />);
  expect(await screen.findByRole('link', { name: 'Découvrir Premium' })).toBeInTheDocument();
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
});
it('déverrouille un vrai compte Premium même si son cache indique gratuit', async () => {
  mockAuth.user = { id: 'a', isPremium: false };
  render(<HabitatAccess locale="fr" initialAnimalId="animal-a" />);
  expect(await screen.findByTestId('planner')).toHaveTextContent('animal-a');
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3001/auth/me',
    expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer token-a' } }),
  );
});
it('attend la vérification avant de monter le concepteur', async () => {
  let resolve!: (value: Response) => void;
  jest.mocked(fetch).mockReturnValue(
    new Promise<Response>((r) => {
      resolve = r;
    }),
  );
  render(<HabitatAccess locale="fr" />);
  expect(screen.getByRole('status')).toHaveTextContent('Vérification');
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
  await act(async () => resolve(profile(true) as Response));
  expect(await screen.findByTestId('planner')).toBeInTheDocument();
});
it('reste fermé en cas d’erreur réseau et permet de réessayer', async () => {
  jest.mocked(fetch).mockRejectedValueOnce(new TypeError('Offline'));
  render(<HabitatAccess locale="fr" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('n’a pas pu être vérifié');
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByTestId('planner')).toBeInTheDocument();
});
it('cache immédiatement l’atelier lors d’un changement de compte et ignore les réponses tardives', async () => {
  const { rerender } = render(<HabitatAccess locale="fr" />);
  await screen.findByTestId('planner');
  let resolve!: (value: Response) => void;
  jest.mocked(fetch).mockReturnValue(
    new Promise<Response>((r) => {
      resolve = r;
    }),
  );
  mockAuth.user = { id: 'b', isPremium: false };
  mockAuth.token = 'token-b';
  rerender(<HabitatAccess locale="fr" />);
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
  await act(async () => resolve(profile(true, 'a') as Response));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
});
it('revérifie à la reprise de l’onglet et conserve les projets si l’accès est révoqué', async () => {
  localStorage.setItem('captivia:habitats:v2:a', 'projects-to-keep');
  render(<HabitatAccess locale="fr" />);
  await screen.findByTestId('planner');
  jest.mocked(fetch).mockResolvedValue(profile(false) as Response);
  fireEvent(window, new Event('focus'));
  expect(await screen.findByRole('link', { name: 'Découvrir Premium' })).toBeInTheDocument();
  expect(screen.queryByTestId('planner')).not.toBeInTheDocument();
  expect(localStorage.getItem('captivia:habitats:v2:a')).toBe('projects-to-keep');
});
it('referme le concepteur lorsque l’API refuse l’accès Premium', async () => {
  render(<HabitatAccess locale="fr" />);
  await screen.findByTestId('planner');
  fireEvent(window, new Event('habitat:premium-required'));
  await waitFor(() => expect(screen.queryByTestId('planner')).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Découvrir Premium' })).toBeInTheDocument();
});
