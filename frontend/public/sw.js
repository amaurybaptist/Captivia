// Service Worker for Push Notifications
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Captivia';
  const options = {
    body: data.body || 'Notification',
    icon: data.icon || '/icon.png',
    badge: '/badge.png',
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const data = event.notification.data;
  
  // Navigate to animal detail if animalId present
  const url = data.animalId 
    ? `/mes-animaux/${data.animalId}`
    : '/mes-animaux';

  event.waitUntil(
    clients.openWindow(url)
  );
});
