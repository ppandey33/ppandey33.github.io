if (typeof activeRequests === 'undefined') {
  var activeRequests = new Map();
}
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const id = Math.random().toString(36).slice(2);
  activeRequests.set(id, url);
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'FETCH_START',
        activeCount: activeRequests.size,
        url: url
      });
    });
  });
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        activeRequests.delete(id);
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'FETCH_END',
              activeCount: activeRequests.size,
              url: url
            });
          });
        });
        return response;
      } catch (err) {
        activeRequests.delete(id);
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'FETCH_ERROR',
              activeCount: activeRequests.size,
              url: url
            });
          });
        });
        throw err;
      }
    })()
  );
});
self.addEventListener('install', (event) => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});