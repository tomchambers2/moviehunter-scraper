var token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ2IjowLCJkIjp7InVpZCI6IjEiLCJhZG1pbiI6dHJ1ZX0sImlhdCI6MTQyMzM0ODU1OH0.nZEh6_1Fg5Ar7knWf3OsmzjBD9fhcUbrmr06SWXewbQ';

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemas = ref.child('cinemas');

var cinemasGeofire = ref.child('cinemasGeofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
ref.authWithCustomToken(token, function(error, authData) {
  if (error) {
      console.log("Login Failed!", error);
    } else {
      console.log("Authenticated successfully with payload:", authData);
      setGeofire();
    }
});

function setGeofire() {
	var geoFire = new GeoFire(cinemasGeofire);

	cinemasGeofire.set({});

	cinemas.on('child_added', function(cinema) {
		value = cinema.val();

		if (value.coords) {
			//console.log("settingd",cinema.tid,v);
			geoFire.set(value.tid, value.coords);
		} else {
			console.log("Cinema does not have any coords");
		}
	});
}