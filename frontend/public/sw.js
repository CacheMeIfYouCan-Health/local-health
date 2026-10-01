// Service worker for forum push notifications (AI summaries, replies,
// important updates). Payload: { title, body, url, tag }.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'LocalHealth', body: event.data?.text() ?? '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'LocalHealth', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/map' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/map', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url === url);
      return open ? open.focus() : self.clients.openWindow(url);
    })
  );
});
