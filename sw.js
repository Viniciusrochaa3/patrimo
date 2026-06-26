/* Service Worker — Patrimo PWA
   Estratégia:
   - App próprio (HTML/CSS/JS): network-first com fallback ao cache (atualiza na hora online, funciona offline).
   - CDN e ícones: cache-first (raramente mudam).
   Dados do usuário ficam em localStorage (não dependem do SW). */
const CACHE = 'patrimo-v7';
const ASSETS = [
  './',
  './index.html',
  './css/theme.css',
  './js/store.js',
  './js/charts.js',
  './js/ui.js',
  './js/reminders.js',
  './js/auth.js',
  './js/intro.js',
  './js/sync.js',
  './js/screens.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(req) {
  return caches.match(req).then((cached) => cached || fetch(req).then((res) => {
    if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }));
}

function networkFirst(req) {
  return fetch(req).then((res) => {
    if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((c) => c || caches.match('./index.html')));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // API nunca é cacheada (dados por usuário, autenticação)
  if (req.url.includes('/api/')) return;
  const sameOrigin = req.url.startsWith(self.location.origin);
  const isIcon = req.url.includes('/icons/');
  // CDN e ícones: cache-first; resto do app: network-first
  if (!sameOrigin || isIcon) e.respondWith(cacheFirst(req));
  else e.respondWith(networkFirst(req));
});
