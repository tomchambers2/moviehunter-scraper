var token = process.env.FIREBASE_AUTH_TOKEN;

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemasRef = ref.child('cinemas');
var moviesRef = ref.child('movies');
var moment = require('moment');

console.log('auth',token);

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
	cinemasRef.once('child_added', function(result) {
		cinema = result.val();

		console.log('Looking at cinema',cinema.title);
		console.log('movies here',cinema);
		if (!cinema.movies) {
			console.log(cinema.title,' not showing movies at the moment');
		} else {
			for (var i in cinema.movies) {
				moviesRef.child(cinema.movies[i]).child(cinema.tid).on('child_added', function(result) {
					movie_cinema = result.val();
					console.log('added',movie_cinema);
					console.log('checking',movie_cinema.title,'at',cinema.title);
					var showing = false;
					for (var i = 0; i < days.length; i++) {
						if (movie_cinema[days[0]]) {
							showing = true;
						}
					};
					if (!showing) {
						console.log('NOT SHOWING',movie_cinema.title,' at',cinema.title,'DELETE');
						cinemasRef.child(cinema.tid).movies && cinemasRef.child(cinema.tid).movies.child(cinema.movies[i]).set({});
					} else {
						console.log('IS SHOWING, ',movie_cinema.title);
					}
				});
			}
		}
	});

	console.log('START CHECKING EACH MOVIE FOR TIMES');
	moviesRef.once('child_added', function(result) {
		var movie = result.val();

		console.log('Checking if',movie.title,'has any times in next 4 days');

		var movieIsShowing = false;
		for (var key in movie) {
			var showingHere = false;
			if (key === 'google' || key === 'imdb' || key === 'rt' || key === 'imdb' || key === 'title' || key === 'url' || key === 'youtube') {
				continue;
			}
			for (var i = 0; i < days.length; i++) {
				if (movie[key][days[i]]) {
					movieIsShowing = true;
					showingHere = true;
				}
			}
			if (!showingHere) {
				console.log(movie.title,'not showing at',key);
				//remove this tid from the movie
				moviesRef.child(result.key()).child(key).remove();
			}
		}
		if (!movieIsShowing) {
			console.log(movie.title,'not showing AT ALL');
			//remove this movie altogether
			moviesRef.child(result.key()).remove();
		} else {
			console.log(movie.title,'is showing somewhere');
		}
	});
}

setTimeout(function() {
	process.exit();
}, 60*60);