var token = process.env.FIREBASE_AUTH_TOKEN;

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemas = ref.child('cinemas');

ref.authWithCustomToken(token, function(error, authData) {
	if (error) {
    	console.log("Login Failed!", error);
  	} else {
    	console.log("Authenticated successfully with payload:", authData);
    	runTask();
  	}
});

var runTask = function() {
	cinemas.on('child_added', function(cinema) {
		value = cinema.val();
		cinemas.child(cinema.key()).child('movies').set({});
	});

	ref.child('movies').set({});
}