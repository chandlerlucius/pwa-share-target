importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

self.skipWaiting();

workbox.routing.registerRoute(
  new RegExp('/*'),
  new workbox.strategies.NetworkFirst()
);

self.addEventListener('fetch', event => {
  if(event.request.method !== 'POST') {
    return;
  }

  event.respondWith((async () => {
    console.log(request);
    const formData = await event.request.formData();
    const image = formData.get('image');
    console.log('image', image);
  })());
});