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

  event.waitUntil(async function () {
    const client = await clients.get(event.clientId);
    if (!client) {
      return;
    }
    
    const formData = await event.request.formData();
    const image = formData.get('image');
    console.log('image', image);

    client.postMessage({ image, action: 'load' });
  }());
});
