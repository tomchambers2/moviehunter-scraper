var RSVP = require('rsvp');
var request = require('request');
var moment = require('moment');

var RateLimiter = require('limiter').RateLimiter;
// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
var limiter = new RateLimiter(5, 'second');

var getRequest = function(url) {
	var promise = new RSVP.Promise(function(resolve, reject) {
		request(url, function (error, response, data) {
			if (error) {
				reject(error);
				console.log(console.log(error));
			};

			resolve(data);
		});
	});

	return promise;
};

var getYoutubeData = function(title) {
	var useTitle = title;

	var promise = new RSVP.Promise(function(resolve, reject) {
	  var youtubeUrl = 'http://moviehunterproxy.jit.su/?url=https://www.googleapis.com/youtube/v3/';
	  var path = 'search?part=id%2Csnippet%26q='+useTitle+'%20movie%20trailer%26key=AIzaSyBSLdvbrkkvY7Ft9ZYhgUqoSoBlak2A9HY';
	  var wholeyoutubeUrl = youtubeUrl + path;
	  getRequest(wholeyoutubeUrl).then(function(result) {
	  	result = JSON.parse(result);
	  	var yId = result.items[0].id.videoId;
	  	if (yId===undefined) {
	  		yId = null;
	  	}
	    resolve(yId);
	  }, function(error) {
	  	reject(error)
	  });

	});

  return promise;
};

var getRtDetails = function(title) {
	var useTitle = title;
	var promise = new RSVP.Promise(function(resolve, reject) {
		limiter.removeTokens(1, function() {
		  var rtData = 'http://api.rottentomatoes.com/';
		  var rtDataPath = 'api/public/v1.0/movies.json?apikey=cbjztdb4a23whxw8maup8ne5&q='+useTitle;
		  getRequest(rtData + rtDataPath).then(function (result) {
		  	result = JSON.parse(result);
		    if (result.movies && result.movies[0]) {
		      var rt = {};
		      rt.runtime = result.movies[0].runtime;
		      rt.rating = result.movies[0].ratings.critics_score >= 0 ? result.movies[0].ratings.critics_score : ' --';
		      rt.rtId = result.movies[0].id;
		      if (result.movies[0].release_dates && result.movies[0].release_dates.theater) {
		      	rt.releaseDate = moment(result.movies[0].release_dates.theater).format();
		      	rt.releaseDateTimestamp = moment(result.movies[0].release_dates.theater).valueOf();
		      }

		      console.log(result.movies[0].release_dates);
		      
		      var posterLink = result.movies[0].posters.thumbnail;
		      

		      var root = 'http://content6.flixster.com';
		      rt.poster = root + posterLink.match(/(\/movie\/.+)/)[1];
		      rt.poster = rt.poster.replace(/_ori/i, '_pro');

		    	resolve(rt); 
		    }
		  }, function(error) {
		  	reject(error)
		  });
		});

	});
  return promise;
};

var getImdbDetails = function(movieTitle) {
	var useTitle = movieTitle;
	var promise = new RSVP.Promise(function(resolve, reject) {
	  var imdbData = 'http://omdbapi.com/?t=';
	  var imdbDataPath = encodeURIComponent(useTitle);
	  getRequest(imdbData + imdbDataPath).then(function (result) {
	  	result = JSON.parse(result);
	    var imdb = {};
	    imdb.rating = result.imdbRating;
	    if (!result.imdbRating) { imdb.rating = ' --' } else { imdb.rating = (result.imdbRating === 'N/A' || '') ? ' --' : result.imdbRating; };
	    imdb.actors = result.Actors;
	    if (result.Genre) {
	      imdb.genre = result.Genre.split(',');
	    } else {
	      imdb.genre = ['Unknown'];
	    }
	    imdb.imdbId = result.imdbID;
	    imdb.synopsis = result.Plot === 'N/A' || '' ? 'No summary available' : result.Plot; 
	    
	    resolve(imdb);
	  });
	 });

  return promise;
};

var getData = function(title) {
	//console.log('getting data for',title);
	var promise = new RSVP.Promise(function(resolve, reject) {
		var promises = [getImdbDetails(title),getRtDetails(title),getYoutubeData(title)];

		RSVP.all(promises).then(function(data) {
			var details = {
				imdb: data[0],
				rt: data[1],
		    youtube: data[2]
			};
					
			resolve(details);
		}, function(error) {
	    console.log(title,'failed',error);
	  });
	});

	return promise;
}

module.exports = getData;

