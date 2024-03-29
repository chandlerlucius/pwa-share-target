importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.2/workbox-sw.js');

workbox.routing.registerRoute(
  new RegExp('/*'),
  new workbox.strategies.NetworkFirst()
);

self.addEventListener('install', event => {
  skipWaiting();
});

self.addEventListener('fetch', event => {
  if(event.request.method !== 'POST') {
    return;
  }
  event.respondWith(Response.redirect('/pwa-share-target/'));

  event.waitUntil(async function () {
    const formData = await event.request.formData();
    const client = await self.clients.get(event.resultingClientId);
    const image = formData.get('image');
    console.log('image', image);
    client.postMessage({ image, action: 'load' });
  }());
});
