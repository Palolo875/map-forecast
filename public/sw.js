const CACHE_NAME = 'naveomap-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Les assets JS/CSS seront ajoutés dynamiquement par le build, 
  // mais on peut en lister certains si on utilise un bundler spécifique.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Stratégie Stale-While-Revalidate pour les assets, 
  // Network-First pour les API météo (si possible)
  const url = new URL(event.request.url);

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  } else {
    // Pour les requêtes externes (tuiles, météo)
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

// Gestion de la Sync Queue pour les notes/photos
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

async function syncNotes() {
  // Cette fonction serait implémentée pour lire IndexedDB 
  // et envoyer les notes 'unsynced' au serveur quand la connexion revient.
  console.log('Syncing notes...');
}
