var token = process.env.FIREBASE_AUTH_TOKEN;

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemasRef = ref.child('cinemas');
var moviesRef = ref.child('movies');

ref.authWithCustomToken(token, function(error, authData) {
	if (error) {
    	console.log("Login Failed!", error);
  	} else {
    	console.log("Authenticated successfully with payload:", authData);
    	runTask();
  	}
});

var days = [
 moment().startOf('day').add(0, 'days').valueOf(),
 moment().startOf('day').add(1, 'days').valueOf(),
 moment().startOf('day').add(2, 'days').valueOf(),
 moment().startOf('day').add(3, 'days').valueOf()
]

var runTask = function() {
	cinemas.on('child_added', function(result) {
		cinema = result.val();

		for (var i in cinema.movies) {
			moviesRef.child(movie[i]).child(cinema.tid).on('child_added', function(value) {
				movie_cinema = value.val();
				var showing = false;
				for (var i = 0; i < days.length; i++) {
					if (movie_cinema[days[0]]) {
						showing = true;
					}
				};
				if (!showing) {
					cinemasRef.child(cinema.tid).movies.child()
				}
				//test each of 0,1,2,3,4
			});
		}
		cinemas.child(cinema.key()).child('movies').set({});

		//for each movie - pull it out of the db
			//check each of the next 4 days - are there times?
	});

	ref.child('movies').set({});
}