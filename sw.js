const CACHE_NAME = 'meu-dindin-cache-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Ignorar requisições que não sejam GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se o recurso estiver no cache, retorna ele
        if (response) {
          return response;
        }

        // Caso contrário, busca na rede
        return fetch(event.request).then(
          networkResponse => {
            // Verifica se a resposta da rede é válida
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            // Clona a resposta para poder salvar no cache e retornar ao navegador
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
          // A requisição de rede falhou.
          // Aqui você poderia retornar uma página de fallback offline, se tivesse uma.
          console.error('Fetch falhou; retornando offline fallback ou erro', error);
        });
      })
  );
});

// Limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});