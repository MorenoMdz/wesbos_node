function autocomplete(input, latInput, lngInput) {
  console.log(input, latInput, lngInput);
  if (!input) return; // skip this fn from running if there is no input in the given fields

  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener('place_changed', () => {
    const place = dropdown.getPlace();
    lngInput.value = place.geometry.location.lng();
    latInput.value = place.geometry.location.lat();
  });
  // if someone hit enter dont reload the form via submit
  input.on('keydown', e => {
    if (e.keyCode === 13) e.preventDefault();
  });
}

export default autocomplete;
