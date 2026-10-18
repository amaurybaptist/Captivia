import { disablePush, enablePush, hasActivePushSubscription, notificationCalendar } from '../push-notifications';

const endpoint = 'https://fcm.googleapis.com/fcm/send/test';
const subscription = { endpoint, unsubscribe: jest.fn(), toJSON: () => ({ endpoint, keys: { auth: 'auth', p256dh: 'key' } }) };
const registration = { pushManager: { getSubscription: jest.fn(), subscribe: jest.fn() }, getNotifications: jest.fn() };
const requestPermission = jest.fn();
const register = jest.fn();
const getRegistration = jest.fn();
let permission: NotificationPermission;
beforeEach(() => {
  jest.clearAllMocks(); permission = 'granted';
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window, 'Notification', { configurable: true, value: { get permission() { return permission; }, requestPermission } });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration, register, ready: Promise.resolve(registration) } });
  getRegistration.mockResolvedValue(registration);
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  registration.pushManager.subscribe.mockResolvedValue(subscription);
  registration.getNotifications.mockResolvedValue([]);
  subscription.unsubscribe.mockResolvedValue(true);
  requestPermission.mockResolvedValue('granted');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ endpoint }] });
});
it('une permission accordée sans abonnement réel ne signifie pas activé', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(null);
  expect(await hasActivePushSubscription('token')).toBe(false);
  expect(requestPermission).not.toHaveBeenCalled();
});
it('exige la correspondance entre abonnement navigateur et compte', async () => {
  expect(await hasActivePushSubscription('token')).toBe(true);
  jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as Response);
  expect(await hasActivePushSubscription('token')).toBe(false);
});
it('demande la permission sur activation puis inscrit le vrai abonnement en backend', async () => {
  permission = 'default'; registration.pushManager.getSubscription.mockResolvedValue(null);
  await enablePush('token', 'AQIDBA');
  expect(requestPermission).toHaveBeenCalledTimes(1);
  expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  expect(registration.pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/push-subscriptions'), expect.objectContaining({ method: 'POST', body: JSON.stringify(subscription.toJSON()) }));
});
it('une permission refusée ne crée pas un abonnement', async () => {
  permission = 'denied'; requestPermission.mockResolvedValue('denied');
  await expect(enablePush('token', 'AQIDBA')).rejects.toThrow();
  expect(register).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it('annule un nouvel abonnement si son enregistrement serveur échoue', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(null);
  jest.mocked(fetch).mockResolvedValue({ ok: false } as Response);
  await expect(enablePush('token', 'AQIDBA')).rejects.toThrow();
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
});
it('arrête les notifications du navigateur même si la suppression distante échoue', async () => {
  jest.mocked(fetch).mockResolvedValue({ ok: false } as Response);
  await expect(disablePush('token')).rejects.toThrow();
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/push-subscriptions'), expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ endpoint }) }));
});

it('calcule la date des rappels dans le fuseau choisi autour de minuit', () => {
  expect(notificationCalendar('Europe/Brussels', new Date('2026-10-17T22:30:00Z'))).toEqual({ date: '2026-10-18', dayOfMonth: 18, weekDay: 0 });
  expect(notificationCalendar('America/Toronto', new Date('2026-10-17T01:00:00Z'))).toEqual({ date: '2026-10-16', dayOfMonth: 16, weekDay: 5 });
});

it('une rotation de clé serveur rend l’ancien abonnement inactif', async () => {
  registration.pushManager.getSubscription.mockResolvedValue({ ...subscription, options: { applicationServerKey: new Uint8Array([9, 9, 9]).buffer } });
  expect(await hasActivePushSubscription('token', 'AQIDBA')).toBe(false);
});
