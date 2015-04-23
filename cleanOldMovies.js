var token = process.env.FIREBASE_AUTH_TOKEN;

var Firebase = require('firebase');
var GeoFire = require('geofire');

var ref = new Firebase("https://movielistings.firebaseio.com/");
var cinemasRef = ref.child('cinemas');
var moviesRef = ref.child('movies');
var moment = require('moment-timezone');

console.log('auth',token);

ref.authWithCustomToken(token, function(error, authData) {
	if (error) {
    	console.log("Login Failed!", error);
  	} else {
    	console.log("Authenticated successfully");
    	runTask();
  	}
});

var oldestLimit = moment().startOf('day');

var days = [
 moment().startOf('day').add(0, 'days').valueOf(),
 moment().startOf('day').add(1, 'days').valueOf(),
 moment().startOf('day').add(2, 'days').valueOf(),
 moment().startOf('day').add(3, 'days').valueOf()
];

var runTask = function() {
	//loop through all cinemas
		//loop through all the movies array
			//check if that movie exists

	cinemasRef.on('child_added', function(result) {
		var cinema = result.val();
		console.log(cinema.movies);
		if (!cinema.movies) {
			console.log("no movies showing here",cinema.title);
		} else {
			for (var i = 0; i < cinema.movies.length; i++) {
				console.log("getting times for",cinema.movies[i]);
				checkMovieTimes(cinema.tid, cinema.movies[i]);
			};
		}
	});

	function removeMovieFromCinema(tid, movieId) {
		console.log("REMOVING",movieId,"FROM",tid);
		cinemasRef.child(tid).child('movies').on('value', function(result) {
			var movies = result.val();
			if (!movies) return;
			movies.splice(movies.indexOf(movieId), 1);
			cinemasRef.child(tid).child('movies').set(movies);
		});
	}

	function checkMovieTimes(tid, movieId) {
		moviesRef.child(movieId).child(tid).on('value', function(result) {
			console.log("TIMES FOR",movieId);
			console.log("got times",result.val());
			var times = result.val();
			var notShowing = true;
			if (times == null) {
				console.log('no times for',movieId,'at',tid,"DELETED");
				removeMovieFromCinema(tid, movieId);
			} else {
				for (var j = 0; j < days.length; j++) {
					if (times[days[j]]) {
						notShowing = false;
					}
				}
				if (notShowing) {

					console.log(movieId,"not showing, film DELETED");
					removeMovieFromCinema(tid, movieId);
				}
				console.log(tid,"is showing film",movieId);
			}
		});
	}	

	// console.log('START CHECKING EACH MOVIE FOR TIMES');
	// moviesRef.on('child_added', function(result) {
	// 	var movie = result.val();

	// 	console.log('Checking if',movie.title,'has any times in next 4 days');

	// 	var movieIsShowing = false;
	// 	for (var cinema in movie) {
	// 		var showingHere = false;
	// 		if (cinema === 'google' || cinema === 'imdb' || cinema === 'rt' || cinema === 'imdb' || cinema === 'title' || cinema === 'url' || cinema === 'youtube') {
	// 			continue;
	// 		}
	// 		for (var i = 0; i < days.length; i++) {
	// 			if (movie[cinema][days[i]]) {
	// 				movieIsShowing = true;
	// 				showingHere = true;
	// 			}
	// 		}
	// 		if (!showingHere) {
	// 			console.log(movie.title,'not showing at',cinema);
	// 			//remove this tid from the movie
	// 			moviesRef.child(result.key()).child(key).remove();
	// 			console.log(movie.title,result.key(),"REMOVED",key);
	// 			continue;
	// 		}

	// 		for (var day in movie[cinema]) {
	// 			if (day < oldestLimit) {
	// 				console.log("CLEANED UP DAY FOR",movie.title,cinema,day);
	// 				moviesRef.child(result.key()).child(cinema).child(day).remove();
	// 			}				
	// 		}
	// 	}
	// 	if (!movieIsShowing) {
	// 		console.log(movie.title,'not showing AT ALL');
	// 		//remove this movie altogether
	// 		moviesRef.child(result.key()).remove();
	// 		console.log(movie.title,result.key(),"REMOVED");
	// 	} else {
	// 		console.log(movie.title,'is showing somewhere');
	// 	}
	// });
}

setTimeout(function() {
	process.exit();
}, 1000*60*60);