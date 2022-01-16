
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
                const img = document.querySelector('#uploaded-image');
                img.src = URL.createObjectURL(imageBlob);
                
                parseExifOtherData(this);
                const latLng = parseExifGpsData(this);
                reverseGeocodeGPS(latLng);
                //initMap(latLng);
            });
        };
    };
    reader.readAsDataURL(imageBlob);
}

const addToTable = function (key, value) {
    var tbodyRef = document.getElementById('uploaded-image-details').getElementsByTagName('tbody')[0];
    var newRow = tbodyRef.insertRow();
    var keyCell = newRow.insertCell();
    var keyText = document.createTextNode(key);
    keyCell.appendChild(keyText);
    var valueCell = newRow.insertCell();
    var valueText = document.createTextNode(value);
    valueCell.appendChild(valueText);
}

const parseExifOtherData = function (exifData) {
    const dateTime = EXIF.getTag(exifData, 'DateTimeOriginal');
    addToTable('Date', dateTime);
}

const parseExifGpsData = function (exifData) {
    const latitudeDms = EXIF.getTag(exifData, 'GPSLatitude');
    const latitudeDirection = EXIF.getTag(exifData, 'GPSLatitudeRef');
    const longitudeDms = EXIF.getTag(exifData, 'GPSLongitude');
    const longitudeDirection = EXIF.getTag(exifData, 'GPSLongitudeRef');
    
    const latitude = convertDmsToDd(latitudeDms[0], latitudeDms[1], latitudeDms[2], latitudeDirection);
    const longitude = convertDmsToDd(longitudeDms[0], longitudeDms[1], longitudeDms[2], longitudeDirection);
    addToTable('GPS', latitude + ", " + longitude);
    return new google.maps.LatLng(latitude, longitude);
}

const convertDmsToDd = function (degrees, minutes, seconds, direction) {
    let decimalDegrees = degrees + (minutes / 60) + (seconds / 3600);
    if(direction == 'S' || direction == 'W') {
        decimalDegrees *= -1;
    }
    return decimalDegrees;
}

const reverseGeocodeGPS = function (latLng) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng })
        .then((response) => {
            if (response.results[0]) {
                addToTable('Address', response.results[0].formatted_address);
            }
        }
    );
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
