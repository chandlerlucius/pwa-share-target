
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
            importFileAndParseExif(event);
        };
    });
}

const importFileAndParseExif = function (event) {
    const imageBlob = event.data.image;
    const maxWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) * .8;
    const maxHeight = Math.max(document.documentElement.clientHeight|| 0, window.innerHeight || 0) * .5;
    
    const tmpImg = document.createElement('img');
    const reader = new FileReader();
    reader.onload = function (e) {
        tmpImg.src = e.target.result;
        tmpImg.onload = function () {
            EXIF.getData(tmpImg, function () {
                parseExifGpsData(this);
                
                const orientation = EXIF.getTag(this, 'Orientation') || 1;
                const orientedImage = compressResizeAndOrientImage(tmpImg, orientation, maxWidth, maxHeight, 1);
                const img = document.createElement('img');
                img.src = orientedImage;
                document.body.appendChild(img);
            });
        };
    };
    reader.readAsDataURL(imageBlob);
}

const parseExifGpsData = function (exifData) {
    const latitudeDms = EXIF.getTag(exifData, 'GPSLatitude');
    const latitudeDirection = EXIF.getTag(exifData, 'GPSLatitudeRef');
    const longitudeDms = EXIF.getTag(exifData, 'GPSLongitude');
    const longitudeDirection = EXIF.getTag(exifData, 'GPSLongitudeRef');
    
    const latitude = convertDmsToDd(latitudeDms[0], latitudeDms[1], latitudeDms[2], latitudeDirection);
    const longitude = convertDmsToDd(longitudeDms[0], longitudeDms[1], longitudeDms[2], longitudeDirection);
    console.log(latitude, longitude);
}

const convertDmsToDd = function (degrees, minutes, seconds, direction) {
    let decimalDegrees = degrees + (minutes / 60) + (seconds / 3600);
    if(direction == 'S' || direction == 'W') {
        decimalDegrees *= -1;
    }
    return decimalDegrees;
}

const compressResizeAndOrientImage = function (img, orientation, maxWidth, maxHeight, quality) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let MAX_WIDTH = maxWidth;
    let MAX_HEIGHT = maxHeight;
    let width = img.width;
    let height = img.height;

    if (orientation > 4) {
        MAX_WIDTH = maxHeight;
        MAX_HEIGHT = maxWidth;
        width = img.height;
        height = img.width;
    }

    if (width > height) {
        if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
        }
    } else {
        if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
        }
    }
    canvas.width = width;
    canvas.height = height;
    switch (orientation) {
        case 1:
            ctx.drawImage(img, 0, 0, width, height);
            break;
        case 2:
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, width * -1, height);
            break;
        case 3:
            ctx.translate(width / 2, height / 2);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            break;
        case 4:
            ctx.scale(-1, 1);
            ctx.translate(width / 2, height / 2);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -width / 2, -height / 2, width * -1, height);
            break;
        case 5:
            ctx.scale(-1, 1);
            ctx.translate(width / 2, height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -height / 2, -width / 2 * -1, height, width);
            break;
        case 6:
            ctx.translate(width / 2, height / 2);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, -height / 2, -width / 2, height, width);
            break;
        case 7:
            ctx.rotate(0.5 * Math.PI);
            ctx.translate(width, -height);
            ctx.scale(-1, 1);
            break;
        case 8:
            ctx.translate(width / 2, height / 2);
            ctx.rotate(-90 * Math.PI / 180);
            ctx.drawImage(img, -height / 2, -width / 2, height, width);
            break;
    }
    return canvas.toDataURL("image/jpeg", quality);
}
