import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Page from '../[locale]/parametres/grade/page';
import { api } from '@/lib/api';
import { getNotificationTimeZone, snoozeReminder } from '@/lib/push-notifications';
const mockAuth = { user: { id: 'user' }, token: 'token', isLoading: false };
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/api', () => ({ api: { getGrade: jest.fn(), getNotificationEvents: jest.fn(), setNotificationEventStatus: jest.fn(), deleteNotificationEvent: jest.fn() } }));
jest.mock('@/lib/push-notifications', () => ({ getNotificationTimeZone: jest.fn(), snoozeReminder: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.getGrade).mockResolvedValue({ points: 0, grade: 'bronze', progressPercent: 0, nextGrade: 'silver', pointsInCurrent: 0, pointsNeededForNext: 500 });
  jest.mocked(api.getNotificationEvents).mockResolvedValue([{ id: 'event', type: 'nourrissage', label: 'Nourrir Kiwi', scheduledAt: '2026-07-03T06:35:00Z', status: 'pending', pointsAwarded: 0, routineId: 'routine' }]);
  jest.mocked(getNotificationTimeZone).mockResolvedValue('Europe/Brussels');
});
it('charge les rappels sans demander leur effacement et affiche le fuseau choisi', async () => {
  render(<Page />);
  expect(await screen.findByText('Nourrir Kiwi')).toBeInTheDocument();
  expect(api.getNotificationEvents).toHaveBeenCalledWith('token');
  expect(screen.getByText(/^08:35/)).toBeInTheDocument();
});
it('un report met à jour l’heure du rappel sans recréer sa réalisation', async () => {
  jest.mocked(snoozeReminder).mockResolvedValue({ id: 'event', snoozedUntil: '2026-07-03T06:50:00Z' });
  render(<Page />);
  fireEvent.click(await screen.findByRole('button', { name: 'notifications.snoozeAction' }));
  expect(await screen.findByText(/^08:50/)).toBeInTheDocument();
  expect(snoozeReminder).toHaveBeenCalledWith('token', 'event');
  await waitFor(() => expect(api.getNotificationEvents).toHaveBeenCalledTimes(1));
});
