import axios from 'axios';
import { $ } from './bling';

const mapOptions = {
  center: { lat: 43.2, lng: -79.8 },
  zoom: 10,
};
function loadPlaces(map, lat = 43.2, lng = -79.8) {
  // you can ge the user current location with
  /* navigator.geolocation.getCurrentPosition */

  // query the api for the stores near
  axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`).then(response => {
    const places = response.data;
    if (!places.length) {
      console.log('no places found');
      return;
    }
    // create a bounds
    const bounds = new google.maps.LatLngBounds();
    const infoWindow = new google.maps.InfoWindow();

    // destructuring the location.coordinates, being the first thing in the array the placelng and the second thing placeLat
    const markers = places.map(place => {
      const [placeLng, placeLat] = place.location.coordinates;
      const position = { lat: placeLat, lng: placeLng };
      bounds.extend(position); // zoom the map based in the data returned
      const marker = new google.maps.Marker({
        map: map,
        position: position,
      });
      marker.place = place;
      return marker;
      // for each location it will return the marker data and the dot in the map
    });
    // show details on click
    markers.forEach(marker =>
      marker.addListener('click', function() {
        const html = `
          <div class="popup">
            <a href="/store/${this.place.slug}">
              <img src="/uploads/${this.place.photo || 'store.png'}" alt="${
          this.place.name
        }" />
              <p>${this.place.name} - ${this.place.location.address}</p>
            </a>
          </div>
        `;
        infoWindow.setContent(html);
        infoWindow.open(map, this);
      })
    );
    // then zoom the map to fit all the markers
    map.setCenter(bounds.getCenter());
    map.fitBounds(bounds);
  });
}

function makeMap(mapDiv) {
  if (!mapDiv) return;
  // make the map
  const map = new google.maps.Map(mapDiv, mapOptions);
  loadPlaces(map);

  const input = $('[name="geolocate"]');
  const autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    loadPlaces(
      map,
      place.geometry.location.lat(),
      place.geometry.location.lng()
    );
  });
}

export default makeMap;
