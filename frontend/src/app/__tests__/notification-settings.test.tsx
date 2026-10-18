import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from '../[locale]/parametres/notifications/page';
import { enablePush, getNotificationCapabilities, hasActivePushSubscription, supportsPush, testNotification, disablePush } from '@/lib/push-notifications';
const mockAuth = { user: { id: 'user' }, token: 'token', isLoading: false };
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/push-notifications', () => ({ notificationCalendar: () => ({ date: '2026-10-17', weekDay: 6, dayOfMonth: 17 }), enablePush: jest.fn(), disablePush: jest.fn(), getNotificationCapabilities: jest.fn(), hasActivePushSubscription: jest.fn(), supportsPush: jest.fn(), testNotification: jest.fn() }));
const prefs = { types: {}, typeSchedules: {}, schedule: { start: '00:00', end: '23:59' }, snooze: 15, timeZone: 'Europe/Brussels', deliveryChannel: 'push' };
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => prefs });
  jest.mocked(getNotificationCapabilities).mockResolvedValue({ push: true, email: true, publicKey: 'key' });
  jest.mocked(hasActivePushSubscription).mockResolvedValue(false);
  jest.mocked(supportsPush).mockReturnValue(true);
  jest.mocked(enablePush).mockResolvedValue(undefined);
});
it('n’affiche pas activé à partir de la seule permission du navigateur', async () => {
  render(<Page />);
  await screen.findByRole('button', { name: 'notifications.enablePush' });
  expect(screen.queryByText('notifications.pushEnabled')).not.toBeInTheDocument();
});
it('désactive les canaux qui ne sont pas configurés sur le serveur', async () => {
  jest.mocked(getNotificationCapabilities).mockResolvedValue({ push: false, email: false, publicKey: null });
  render(<Page />);
  expect(await screen.findByRole('button', { name: 'notifications.enablePush' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'notifications.deliveryEmail' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'notifications.deliveryBoth' })).toBeDisabled();
  expect(screen.getByText('notifications.channelsUnavailable')).toBeInTheDocument();
});
it('active seulement après un clic et la création réussie de l’abonnement', async () => {
  render(<Page />);
  const button = await screen.findByRole('button', { name: 'notifications.enablePush' });
  await waitFor(() => expect(button).toBeEnabled());
  expect(enablePush).not.toHaveBeenCalled();
  jest.mocked(hasActivePushSubscription).mockResolvedValue(true);
  fireEvent.click(button);
  expect(await screen.findByText('notifications.pushEnabled')).toBeInTheDocument();
  expect(enablePush).toHaveBeenCalledWith('token', 'key');
});
it('conserve le canal choisi lorsque deux modifications sont enregistrées rapidement', async () => {
  render(<Page />);
  const email = await screen.findByRole('button', { name: 'notifications.deliveryEmail' });
  await waitFor(() => expect(email).toBeEnabled());
  fireEvent.click(email);
  fireEvent.click(screen.getByRole('button', { name: '+ Bain' }));
  await waitFor(() => {
    const writes = jest.mocked(fetch).mock.calls.filter(([, init]) => init?.method === 'PATCH');
    expect(writes).toHaveLength(2);
    const body = JSON.parse(String(writes[1][1]?.body));
    expect(body.deliveryChannel).toBe('email');
    expect(body.types.Bain).toBe(true);
    expect(body.timeZone).toBe('Europe/Brussels');
  });
});

it('n’envoie pas de test après un échec d’enregistrement des préférences', async () => {
  global.fetch = jest.fn().mockImplementation((_url, init) => Promise.resolve(init?.method === 'PATCH' ? { ok: false, status: 503, json: async () => ({ message: 'Sauvegarde indisponible' }) } : { ok: true, status: 200, json: async () => prefs }));
  render(<Page />);
  const email = await screen.findByRole('button', { name: 'notifications.deliveryEmail' });
  await waitFor(() => expect(email).toBeEnabled());
  fireEvent.click(email);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sauvegarde indisponible');
  fireEvent.click(screen.getByRole('button', { name: 'notifications.sendTest' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('notifications.testFailed'));
  expect(testNotification).not.toHaveBeenCalled();
});

it('permet de désactiver un abonnement existant même si le serveur push est en pause', async () => {
  jest.mocked(getNotificationCapabilities).mockResolvedValue({ push: false, email: false, publicKey: null });
  jest.mocked(hasActivePushSubscription).mockResolvedValue(true);
  render(<Page />);
  const button = await screen.findByRole('button', { name: 'notifications.disablePush' });
  await waitFor(() => expect(button).toBeEnabled());
  jest.mocked(disablePush).mockResolvedValue(undefined);
  jest.mocked(hasActivePushSubscription).mockResolvedValue(false);
  fireEvent.click(button);
  expect(await screen.findByRole('button', { name: 'notifications.enablePush' })).toBeDisabled();
  expect(disablePush).toHaveBeenCalledWith('token');
});
