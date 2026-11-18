const CACHE = 'shiftmate-shell-v1.14.11-week-span-bars';const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const request = event.request;
  const path = new URL(request.url).pathname;
  const isPage = request.mode === 'navigate' || path.endsWith('/index.html') || path.endsWith('/shift-mate/');
  if (isPage) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) {}
  const title = payload.title || 'ShiftMate';
  const options = {
    body: payload.body || '明日の予定を確認してね。',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: payload.tag || 'shiftmate-reminder',
    data: { url: payload.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    })
  );
});
