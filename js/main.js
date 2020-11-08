
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => {
                console.log('Service worker registered!', reg);
            })
            .catch(err => {
                console.log('Service worker registration failed: ', err);
            });

        navigator.serviceWorker.onmessage = (event) => {
            const imageBlob = event.data.image;
            const img = document.createElement('img');
            img.style.width = '80vw';
            img.src = URL.createObjectURL(imageBlob);
            document.body.appendChild(img);
        };
    });
}