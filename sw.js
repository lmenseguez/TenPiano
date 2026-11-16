// Permite abrir la app sin conexión. Siempre intenta primero la versión más
// reciente de la red y solo usa la copia guardada si no hay internet.
const CACHE = 'tenpiano-v6';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    // 'no-cache' obliga a comprobar con el servidor si hay una versión nueva de cada
    // archivo, para que nunca se mezclen archivos viejos con nuevos tras una actualización.
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./')))
  );
});
