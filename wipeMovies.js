var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemas = ref.child('cinemas');

cinemas.on('child_added', function(cinema) {
	value = cinema.val();
	cinemas.child(cinema.key()).child('movies').set({});
});

ref.child('movies').set({});