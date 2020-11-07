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
  event.respondWith(Response.redirect('?share-target'));

  event.waitUntil(async function () {
    const formData = await event.request.formData();
    const image = formData.get('image');
    console.log('image', image);

    const channel = new BroadcastChannel('sw-channel');
    channel.postMessage({ image, action: 'load' });
  }());
});
