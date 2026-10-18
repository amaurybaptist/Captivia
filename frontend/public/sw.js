/* Notifications push : aucune mise en cache de données de compte. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Charge illisible : notification générique. */ }
  if (!payload || typeof payload !== 'object') payload = {};
  event.waitUntil(self.registration.showNotification(payload.title || 'Captivia', {
    body: payload.body || 'Vous avez un rappel Captivia.', icon: '/icon.png',
    tag: payload.data?.eventId || undefined, data: payload.data || {},
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = data.animalId ? `/mes-animaux/${encodeURIComponent(data.animalId)}` : '/parametres/grade';
  const url = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(url); await client.focus(); return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
