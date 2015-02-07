var token = process.env.FIREBASE_AUTH_TOKEN;

var request = require('request');
var cheerio  = require('cheerio');
var fs = require('fs');
var Firebase = require('firebase');
var moment = require('moment');

var ref = new Firebase("https://movielistings.firebaseio.com/");
ref.authWithCustomToken(token, function(error, authData) {
	if (error) {
    	console.log("Login Failed!", error);
  	} else {
    	console.log("Authenticated successfully with payload:", authData);
    	getMovies();
  	}
})

function getMovies() {
	var moviesRef = ref.child('movies');
	var cinemas = ref.child('cinemas');

	var getMovieData = require('./getMovieData');

	var completedMovies = [];

	var _ = require('lodash');

	function movieComplete(title) {
		completedMovies.push(title);
	}

	function checkMovieComplete(title) {
		return completedMovies.indexOf(title) > -1;
	}

	function createMovie(tid, title, times, info) {
		movieComplete(title);
		var movie = {
			google: info,
			title: title,
			url: title.replace(/\s+/g, '-').toLowerCase()
		}
		var date = moment().startOf('day').valueOf();
		movie[tid] = {};
		movie[tid][date] = {};
		movie[tid][date].times = times;

	    getMovieData(title).then(function(result) {
	    	movie.rt = result.rt;
	    	movie.imdb = result.imdb;
	    	movie.youtube = result.youtube;

	    	moviesRef.push(movie);
	    });
	    addTimesToCinema(tid, title, times);
	}

	function updateMovie(tid, title, times) {
		moviesRef.orderByChild('title').startAt(title).endAt(title).once('child_added', function(result) {
			var movie = result.val();
			var date = moment().startOf('day').valueOf();
			moviesRef.child(result.key()).child(tid).child(date).set({ times: times });
			console.log('added',tid,'to',title,result.key(),'at',date);
			addTimesToCinema(tid, title, times);
		});
	}

	/*
		CINEMA
			movies
				movie1
					date
						times
					date
						times
				movie2
					date
						times
				movie3
	*/			

	function addTimesToCinema(tid, title, times) {
		moviesRef.orderByChild('title').startAt(title).endAt(title).once('child_added', function(snapshot) {
			var movieId = snapshot.val();
			cinemas.child(tid).child('movies').once('value', function(result) {
				var movieIds = result.val();
				if (!movieIds) {
					movieIds = [snapshot.key()];
				} else {
					movieIds.push(snapshot.key());
				}
				movieIds = _.uniq(movieIds);
				cinemas.child(tid).update({ movies: movieIds });
			});
		});
	}

	function addData(tid, title, times, info) {
		moviesRef.orderByChild('title').startAt(title).endAt(title).once('value', function(snapshot) {
			var exists = snapshot.val() !== null;
			if (exists || checkMovieComplete(title)) {
				updateMovie(tid, title, times);
			} else {
				createMovie(tid, title, times, info);
			}
		});
	};

	function getTimes(tid) {
		var query = {
		    url: 'http://www.google.co.uk/movies?hl=en&near=Loughborough,+UK&tid='+tid,
		    type: 'html',
		    selector: 'div.movie',
		    extract: 'html'
		  },
		  uriQuery = encodeURIComponent(JSON.stringify(query)),
		  requestUrl  = 'https://noodlescraper.herokuapp.com/?q=' +
		             uriQuery;

		request(requestUrl, function (error, response, data) {
		  if (!error && response.statusCode == 200) {
		  	var json = JSON.parse(data);

		    for (var i = 0; i < json[0].results.length; i++) {
		    	var data = json[0].results[i];
		    	$ = cheerio.load(data);
			    var title = $('div.name').text();
			    var info = $('span.info').text().split(' - ');
			    var times = $('div.times').text().split(' ');

			    for (var j = 0; j < times.length; j++) {
			    	times[j] = times[j].trim();
			    };

				addData(tid, title, times, info);
		    }
		  } else {
		  	console.log("ERROR",error,response.statusCode);
		  }
		});
	}

	cinemas.on('child_added', function(result) {
		var cinema = result.val();
		getTimes(cinema.tid);
	});
};