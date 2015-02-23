var token = process.env.FIREBASE_AUTH_TOKEN;

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemas = ref.child('cinemas');

var cinemasGeofire = ref.child('cinemasGeofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
console.log("TOKEN",token);
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