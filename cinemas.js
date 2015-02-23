var token = process.env.FIREBASE_AUTH_TOKEN;

var request = require('request');
var cheerio  = require('cheerio');
var async = require('async');
var Firebase = require('firebase');
var moment = require('moment');
var locations = require('./locations');

var ref = new Firebase("https://movielistings.firebaseio.com/");
ref.authWithCustomToken(token, function(error, authData) {
  if (error) {
      console.log("Login Failed!", error);
    } else {
      console.log("Authenticated successfully with payload:", authData);
      collectData();
    }
});


var geocoderProvider = 'google';
var httpAdapter = 'http'; 
var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter);
var incompleteTasks = [];
var processingTasks = [];
var cinemas;

var RateLimiter = require('limiter').RateLimiter;
// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
var limiter = new RateLimiter(3, 'second');


function collectData() {
  cinemas = ref.child('cinemas');
  var tasks = [];
  for (var i = 0; i < locations.length; i++) {
    tasks.push(getArea(locations[i]));
  };
  
  async.series(tasks, function(err, results) {
    if (err) {
      console.log('An error happened with getting locations',err);
      return err;
    }
    console.log('COLLECT DATA RESULT: '+results.join('\n'));
  });
}

function getArea(location) {
  var tasks = [];
  for (var i = 0; i < 20; i++) {
    tasks.push(getPage({ location: location, start: i }));
  };

  return function(callback) {
    async.series(tasks, function(err, results) {
      if (err) {
        console.log('Error found',err);
        callback(null, 'Completed '+location+' before 20 pages');
        return err;
      };
      console.log(location+' DATA RESULT: '+results);
      callback(null, 'Completed '+location+' with more than 20 pages');
    });
  }
}

function getPage(task) {

  return function(callback) {
    console.log('Getting page ',task.location,task.start);
    //this is what gets executed by the queue, when done will callback or err

    var location = task.location;
    var start = task.start * 10;

    var requestCount = 0;

    makeRequest = function() {
      console.log('making request');
      requestCount++;

      if (requestCount > 10) {
        callback('Tried 10 times, giving up', null);
        throw new Error('Tried 10 times, giving up');
      }    

      var query = {
          url: 'http://www.google.co.uk/movies?hl=en&near='+location+'+,UK&dq=london+cinemas&q=cinemas&sa=X&ei=jB3MVOeuHMyAUcvVg7AK&ved=0CCAQxQMoAA&start='+start,
          type: 'html',
          selector: 'div.theater',
          extract: 'html'
        },
        uriQuery = encodeURIComponent(JSON.stringify(query)),
        requestUrl  = 'https://noodlescraper.herokuapp.com/?q=' +
                   uriQuery;

      console.log('about to get data for ',query.url);
      request(requestUrl, function (error, response, data) {
        if (error) {
          console.log('error with scraping servers (noodle > cloak > google)',error);
          request('http://cloak.herokuapp.com/refresh', function(error, response, data) {
            if (!error && response.statusCode == 200) {
              setTimeout(function() {
                makeRequest();
              }, requestCount * 15000);
            } else {
              setTimeout(function() {
                callback('Cloak refresh failed', null);
                throw new Error('Refresh of cloak server failed');
              }, 15000);
            }
          });
        }

        if (!error && response.statusCode == 200) {
          var json = JSON.parse(data);
          var results = json[0].results;

          //if we've reached the last page, end our async series, up a level to get new area search term
          if (results.length < 1) {
            console.log("No results on this page",start);
            callback('Empty cinema results page', null);
            return;
          }

          for (var i = 0; i < results.length; i++) {
            $ = cheerio.load(results[i]);

            saveResult($);
          };
          callback(null, 'Added cinemas for '+location);

        } else {
          console.log("ERROR",error,statusCode);
        }
      });               

      function saveResult($) {
            var cinema = {};

            if ($('div.info')) {
              var info = $('div.info').text();
              var infoParts = info.match(/^(.*?) - ([0-9 ]+)$/);

              if (infoParts) {
                cinema.phone = infoParts[2];
                cinema.address = infoParts[1];
              } else {
                cinema.phone = null;
                cinema.address = null;
              }
            }

            if ($('a').attr) {
              var href = $('a').attr('href');


              if (href) {
                cinema.title = ('A',$('a')[0].children[0].data);

                var tid = href.match(/&tid=([a-zA-Z0-9]+)$/);

                cinemas.child(tid[1]).once('value', function(snapshot) {
                  var exists = (snapshot.val() !== null);
                  if (!exists) {
                    cinemaDoesntExistCallback();
                  }
                });

                function cinemaDoesntExistCallback() {
                  if (tid[1]) {
                    limiter.removeTokens(1, function() {
                      //console.log("Geocoding",cinema.title,cinema.address);
                      geocoder.geocode(cinema.address, function(err, res) {
                          //res = [{latitude: 1, longitude: 1}]; //REMOVE JUST TESTING, REINSTATE GEOCODER
                          if (err) console.log(err);
                          if (res===undefined) {
                            console.log("Got nothing back here",cinema.address);
                            return;
                          };
                          cinema.coords = [res[0].latitude, res[0].longitude];
                          var hyphenatedCinemaTitle = cinema.title.replace(/\s+/g, '-').toLowerCase();

                          cinemas.child(tid[1]).set({
                            tid: tid[1],
                            title: cinema.title,
                            url: hyphenatedCinemaTitle,
                            address: cinema.address,
                            phone: cinema.phone,
                            coords: cinema.coords,
                            movies: []
                          });
                          //console.log("Added",cinema.title);
                      });
                    });              
                  } else {
                    console.log("NO TID",tid,results[i]);
                  }
                }
              } else {
                console.log("not a link",cinema.title);
              }
            }    
      }
    }

    makeRequest();
  }
}

