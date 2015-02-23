var token = process.env.FIREBASE_AUTH_TOKEN;

var request = require('request');
var cheerio  = require('cheerio');
var fs = require('fs');
var Firebase = require('firebase');
var moment = require('moment');
var ref = new Firebase("https://movielistings.firebaseio.com/");
var RSVP = require('rsvp');

var runTask = function() {
	ref.authWithCustomToken(token, function(error, authData) {
		if (error) {
	    	console.log("Login Failed!", error);
	  	} else {
	    	console.log("Authenticated successfully with payload:", authData);
	    	getMovies();
	  	}
	});
}

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

	function createMovie(tid, title, date, times, info) {
		movieComplete(title);
		var movie = {
			google: info,
			title: title,
			url: title.replace(/\s+/g, '-').toLowerCase()
		}
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

	function updateMovie(tid, title, date, times) {
		moviesRef.orderByChild('title').startAt(title).endAt(title).once('child_added', function(result) {
			var movie = result.val();
			moviesRef.child(result.key()).child(tid).child(date).set({ times: times });
			//console.log('added',tid,'to',title,result.key(),'at',date);
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

	function addData(tid, title, date, times, info) {
		console.log('adding data',tid,title);
		moviesRef.orderByChild('title').startAt(title).endAt(title).once('value', function(snapshot) {
			var exists = snapshot.val() !== null;
			if (exists || checkMovieComplete(title)) {
				console.log(title,'exists, updating');
				updateMovie(tid, title, date, times);
			} else {
				console.log(title,'does not exist, creating');
				createMovie(tid, title, date, times, info);
			}
		});
	};

	function getTimes(task) {
		var tid = task.tid;
		var date = task.date;

		console.log('Doing task',tid);

		var promise = new RSVP.Promise(function(resolve, reject) {
			var query = {
			    url: 'http://cloak.herokuapp.com/?http://www.google.co.uk/movies?hl=en&near=Loughborough,+UK&tid='+tid+'&date='+date,
			    type: 'html',
			    selector: 'div.movie',
			    extract: 'html'
			  },

			  uriQuery = encodeURIComponent(JSON.stringify(query)),
			  requestUrl  = 'https://noodlescraper.herokuapp.com/?q=' +
			             uriQuery;

			console.log('will call',query.url);

			var requestCount = 0;

			function makeRequest() {
				console.log('Made request for',tid);
				requestCount++;

				if (requestCount > 10) {
					reject();
					throw new Error('Tried 10 times, giving up');
				}

				request(requestUrl, function (error, response, data) {
					//if error, call refresh, wait 15 
					if (error) {
						console.log('error with scraping servers (noodle > cloak > google)',error);
						request('http://cloak.herokuapp.com/refresh', function(error, response, data) {
							if (!error && response.statusCode == 200) {
								setTimeout(function() {
									makeRequest();
								}, requestCount * 15000);
							} else {
								reject();
								throw new Error('Refresh of cloak server failed');
							}
						});
					}

					if (!error && response.statusCode == 200) {
						var json = JSON.parse(data);

						console.log(tid,'tid json',json[0].results.length);

						for (var i = 0; i < json[0].results.length; i++) {
							var data = json[0].results[i];
							$ = cheerio.load(data);
						    var title = $('div.name').text();
						    var info = $('span.info').text().split(' - ');
						    var times = $('div.times').text().split(' ');

						    for (var j = 0; j < times.length; j++) {
						    	times[j] = times[j].trim();
						    };

						    var millisecondDate = moment().startOf('day').add(date, 'days').valueOf();
							addData(tid, title, millisecondDate, times, info);
						}

						console.log('Finished request for',tid);
						resolve();
					} else {
						console.log("ERROR",error,response.statusCode);
					}
				});
			}

			makeRequest();
		});
		
		return promise;
	}

	var incompleteTasks = [];
	var processingTasks = [];

	cinemas.on('child_added', function(result) {
		var cinema = result.val();
		if (!cinema.tid) return;
		for (var i = 0; i <= 4; i++) {
			executeNextTask({ tid: cinema.tid, date: i });
		};
	});

	function executeNextTask(task) {
		if (task) {
			incompleteTasks.push(task);
			console.log('added',task,'to list of incomplete tasks');
		};

		if (processingTasks.length>0) return;

		var task = incompleteTasks.shift();
		processingTasks.push(task);
		console.log('added',task,'to list of processing tasks');

		getTimes(task).then(function() {
			//task is done, call self. remove from processing
			processingTasks.shift();
			executeNextTask();
		}, function() {
			throw new Error('Failed to contact cloak server, giving up');
		})
	}
};

if (require.main === module) {
	runTask();
}

module.exports = runTask;