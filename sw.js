/* Хронометр — service worker: всё приложение кэшируется и открывается без интернета.
   Стратегия: сразу отдаём из кэша, а при наличии сети тихо обновляем кэш (новая версия — со следующего запуска). */
const CACHE = 'hronometr-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate';
  const key = isPage ? './index.html' : req;

  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(key, {ignoreSearch: true});
    const fresh = fetch(isPage ? new Request('./index.html', {cache: 'no-cache'}) : req)
      .then(r => { if (r && r.ok && !r.redirected) cache.put(key, r.clone()); return r; })
      .catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    const r = await fresh;
    return r || new Response('Нет соединения', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
  }));
});
