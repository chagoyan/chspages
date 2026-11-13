const scope = self.registration.scope;
const prefix = `chs-pages:${scope}:`;
// Caches from builds before the rename.
const legacyPrefix = `thursday-pages:${scope}:`;
const version = `${prefix}v8`;
const appShell = new URL('./', scope).href;
const precache = [
  './', './css/styles.css', './js/app.js', './js/library.js', './js/reader.js',
  './js/storage.js', './js/ratings.js', './data/stories.json', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
].map(path => new URL(path, scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(version);
    await cache.addAll(precache.map(url => new Request(url, { cache: 'reload' })));
    const catalog = await cache.match(new URL('data/stories.json', scope).href);
    const { stories } = await catalog.json();
    const paths = stories.filter(story => story.status === 'available')
      .flatMap(story => story.editions.map(edition => edition.path));
    await cache.addAll([...new Set(paths)].map(path => new Request(
      new URL(path, scope), { cache: 'reload' }
    )));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => (key.startsWith(prefix) && key !== version)
      || key.startsWith(legacyPrefix)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;

  const url = new URL(request.url);
  const navigation = request.mode === 'navigate' &&
    (url.pathname === new URL(scope).pathname || url.pathname === new URL('index.html', scope).pathname);
  const story = url.pathname.startsWith(new URL('stories/', scope).pathname) && url.pathname.endsWith('.txt');
  if (!navigation && !precache.includes(url.href) && !story) return;

  event.respondWith((async () => {
    const cache = await caches.open(version);
    const cached = await cache.match(navigation ? appShell : request);
    if (cached) return cached;

    const response = await fetch(request);
    if (story && response.ok && response.headers.get('Content-Type')?.includes('text/plain')) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // Reading can continue even if the offline cache is full.
      }
    }
    return response;
  })());
});
