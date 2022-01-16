
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
                const orientation = EXIF.getTag(this, 'Orientation') || 1;
                const orientedImage = compressResizeAndOrientImage(tmpImg, orientation, maxWidth, maxHeight, 1);
                const img = document.createElement('img');
                img.src = orientedImage;
                document.body.appendChild(img);
                
                parseExifOtherData(this);
                const latLng = parseExifGpsData(this);
//                 initMap(latLng);
            });
        };
    };
    reader.readAsDataURL(imageBlob);
}

const parseExifOtherData = function (exifData) {
    const dateTime = EXIF.getTag(exifData, 'DateTimeOriginal');
    const p = document.createElement('p');
    p.innerHTML = dateTime;
    document.body.appendChild(p);
}

const parseExifGpsData = function (exifData) {
    const latitudeDms = EXIF.getTag(exifData, 'GPSLatitude');
    const latitudeDirection = EXIF.getTag(exifData, 'GPSLatitudeRef');
    const longitudeDms = EXIF.getTag(exifData, 'GPSLongitude');
    const longitudeDirection = EXIF.getTag(exifData, 'GPSLongitudeRef');
    
    const latitude = convertDmsToDd(latitudeDms[0], latitudeDms[1], latitudeDms[2], latitudeDirection);
    const longitude = convertDmsToDd(longitudeDms[0], longitudeDms[1], longitudeDms[2], longitudeDirection);
    console.log(latitude, longitude);
    return new google.maps.LatLng(latitude, longitude);
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

const initMap = function(latLng) {
  const service = new google.maps.places.PlacesService(map);
  service.nearbySearch(
    { location: latLng, radius: 1000, type: "tourist_attraction" },
    (results, status, pagination) => {
      if (status !== "OK") {
          return;
      }
      createResults(results);
      initMapbox(results);
    }
  );
}

const createResults = function(places) {
  const placesList = document.getElementById("places");
  for (let i = 0; i < 10; i++) {
    const place = places[i];
    const li = document.createElement("li");
    li.textContent = place.name;
    placesList.appendChild(li);
  }
}

const initMapbox = function (places) {
    mapboxgl.accessToken = 'pk.eyJ1IjoicnVubmluZ2hhaXIxOCIsImEiOiJjanN5dXF5aGgxNzVkNDNwcGI4NHp1bmp4In0.-YVFnu5m4LXZhZaHuZmQMQ';
    const mapElement = 'map';
    const map = new mapboxgl.Map({
        container: mapElement,
        style: 'mapbox://styles/mapbox/satellite-streets-v10?optimize=true',
    });
    map.addControl(new mapboxgl.NavigationControl());
    createMapboxMarkersAndPopups(map, places);
}

const createMapboxMarkersAndPopups = function (map, places) {
    const bounds = new mapboxgl.LngLatBounds();
    places.forEach(function (place, index) {
        const placeId = place.place_id;
        const markerElement = document.createElement('img');

        const popupElement = document.querySelector('.infowindow');
        if (place.photos) {
            const img = document.createElement('img');
            img.alt = 'Photo of ' + place.name;
            img.src = place.photos[0].getUrl({maxWidth: 35, maxHeight: 35});
            img.style.filter = 'blur(10px)';

            popupElement.querySelector('.card-image').prepend(img);
            popupElement.querySelector('.card-image').style.height = '100%';
            popupElement.style.height = '300px';
        } else {
            if (popupElement.querySelector('.card-image img') !== null) {
                popupElement.querySelectorAll('.card-image img').forEach(function (img) {
                    img.remove();
                });
            }
            popupElement.querySelector('.card-image').style.height = '70%';
            popupElement.style.height = '150px';
        }
        popupElement.querySelector('.card-title').innerHTML = place.name;
        popupElement.querySelector('.card-name').innerHTML = place.name;
        popupElement.querySelector('.card-country').innerHTML = place.country;

        const popup = new mapboxgl.Popup({
                anchor: 'left'
            })
            .setHTML(popupElement.outerHTML);

        if (place.icon) {
            markerElement.classList.add('marker');
            markerElement.classList.add('marker-large');
            markerElement.src = place.icon;
        } else {
            markerElement.classList.add('marker');
            markerElement.classList.add('marker-small');
            markerElement.src = 'data:image/jpeg' + index + ';base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
        }
        if (index === places.length - 1) {
            markerElement.classList.add('marker-recent');
        }
        markerElement.alt = 'Thumbnail of ' + place.name;

        const marker = new mapboxgl.Marker(markerElement)
            .setLngLat([place.geometry.location.lng(), place.geometry.location.lat()])
            .setPopup(popup)
            .addTo(map);
        bounds.extend(marker.getLngLat());
    });
    map.fitBounds(bounds, {
        padding: 20
    });
}
