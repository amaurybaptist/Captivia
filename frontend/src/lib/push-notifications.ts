import { API_URL } from './config';
export interface NotificationCapabilities { push: boolean; email: boolean; publicKey: string | null }
const apiBase = () => API_URL;
const headers = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
export function supportsPush() {
  return typeof window !== 'undefined' && window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}
async function checked(response: Response) {
  if (!response.ok) throw new Error('Le service de notifications est indisponible.');
  return response;
}
export async function getNotificationCapabilities(token: string): Promise<NotificationCapabilities> {
  return (await checked(await fetch(`${apiBase()}/users/me/notification-capabilities`, { headers: headers(token) }))).json();
}
export async function hasActivePushSubscription(token: string, publicKey?: string) {
  if (!supportsPush() || Notification.permission !== 'granted') return false;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return false;
  if (publicKey && subscription.options?.applicationServerKey) {
    const previous = new Uint8Array(subscription.options.applicationServerKey);
    const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    if (previous.length !== raw.length || previous.some((value, index) => value !== raw.charCodeAt(index))) return false;
  }
  const response = await checked(await fetch(`${apiBase()}/users/me/push-subscriptions`, { headers: headers(token) }));
  const subscriptions: { endpoint: string }[] = await response.json();
  return subscriptions.some(item => item.endpoint === subscription.endpoint);
}
export async function enablePush(token: string, publicKey: string) {
  if (!supportsPush()) throw new Error('Ce navigateur ne prend pas en charge les notifications push.');
  // Appel direct depuis le clic : Safari exige le geste utilisateur pour la permission.
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Les notifications sont bloquées dans les réglages du navigateur.');
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const raw = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
  const key = Uint8Array.from(raw, char => char.charCodeAt(0));
  if (subscription?.options?.applicationServerKey) {
    const previous = new Uint8Array(subscription.options.applicationServerKey);
    if (previous.length !== key.length || previous.some((value, index) => value !== key[index])) {
      await subscription.unsubscribe(); subscription = null;
    }
  }
  const created = !subscription;
  subscription = subscription || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  try {
    await checked(await fetch(`${apiBase()}/users/me/push-subscriptions`, { method: 'POST', headers: headers(token), body: JSON.stringify(subscription.toJSON()) }));
  } catch (error) {
    if (created) await subscription.unsubscribe();
    throw error;
  }
}
export async function disablePush(token: string) {
  if (!supportsPush()) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  if (!(await subscription.unsubscribe())) throw new Error('Impossible de désactiver les notifications.');
  for (const notification of await registration!.getNotifications()) notification.close();
  await checked(await fetch(`${apiBase()}/users/me/push-subscriptions`, { method: 'DELETE', headers: headers(token), body: JSON.stringify({ endpoint }) }));
}
export async function testNotification(token: string): Promise<{ sent: number; failed: number }> {
  return (await checked(await fetch(`${apiBase()}/users/me/test-notification`, { method: 'POST', headers: headers(token) }))).json();
}
export async function syncExistingPushSubscription(token: string) {
  if (!supportsPush() || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const capabilities = await getNotificationCapabilities(token);
  if (!capabilities.push || !capabilities.publicKey) return;
  await enablePush(token, capabilities.publicKey);
}

export async function getNotificationTimeZone(token: string): Promise<string> {
  const prefs = await (await checked(await fetch(`${apiBase()}/users/me/notification-preferences`, { headers: headers(token) }))).json();
  return prefs.timeZone || 'Europe/Brussels';
}
export async function snoozeReminder(token: string, eventId: string) {
  return (await checked(await fetch(`${apiBase()}/users/me/notification-events/${encodeURIComponent(eventId)}/snooze`, { method: 'PATCH', headers: headers(token), body: '{}' }))).json();
}

/** Date civile dans le fuseau choisi, y compris autour de minuit UTC. */
export function notificationCalendar(timeZone: string, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now).map(part => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, dayOfMonth: Number(parts.day), weekDay: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday) };
}
