
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
                addToTable('Place Type', response.results[0].place_id);
                addToTable('Place ID', response.results[0].place_id);
                const request = {
                    query: '"' + response.results[0].formatted_address + '"',
                    fields: ["name", "geometry"],
                };

                const service = new google.maps.places.PlacesService(map);
                service.findPlaceFromQuery(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    addToTable('Place', results[0].name);
                } else {
                    addToTable('Place', 'No Place Found');
                }
                addButtonsAndActions(latLng);
              });
            }
        }
    );
}

const addButtonsAndActions = function (latLng) {
    const searchNearbyButton = document.querySelector('#search-nearby');
    searchNearbyButton.addEventListener('click', function() {
        searchNearby(latLng);
    }, false);
}

const searchNearby = function (latLng) {
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({ location: latLng, radius: 100 },
         (results, status, pagination) => {
             if (status === "OK") {
                 for (let i = 0; i < 10; i++) {
                     addToTable('', results[i].name);
                 }
            }
        }
    );
}
