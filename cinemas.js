var token = process.env.FIREBASE_AUTH_TOKEN;

var request = require('request');
var cheerio  = require('cheerio');

var Firebase = require('firebase');
var moment = require('moment');

var cinemas = ref.child('cinemas');

var ref = new Firebase("https://movielistings.firebaseio.com/");
ref.authWithCustomToken(token, function(error, authData) {
  if (error) {
      console.log("Login Failed!", error);
    } else {
      console.log("Authenticated successfully with payload:", authData);
      getCinemas();
    }
});

function getCinemas() {
  cinemas.set({});

  var RateLimiter = require('limiter').RateLimiter;
  // Allow 150 requests per hour (the Twitter search limit). Also understands
  // 'second', 'minute', 'day', or a number of milliseconds
  var limiter = new RateLimiter(3, 'second');

  for (var i = 0; i < 11; i++) {
    var start = i * 10;
    getTids(start);
  };

  var geocoderProvider = 'google';
  var httpAdapter = 'http';
   
  var geocoder = require('node-geocoder').getGeocoder(geocoderProvider, httpAdapter);

  function getTids(start) {
    var query = {
        url: 'http://www.google.co.uk/movies?hl=en&near=London,+UK&dq=london+cinemas&q=cinemas&sa=X&ei=jB3MVOeuHMyAUcvVg7AK&ved=0CCAQxQMoAA&start='+start,
        type: 'html',
        selector: 'div.theater',
        extract: 'html'
      },
      uriQuery = encodeURIComponent(JSON.stringify(query)),
      requestUrl  = 'https://noodlescraper.herokuapp.com/?q=' +
                 uriQuery;

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
              if (tid[1]) {
                limiter.removeTokens(1, function() {
                  console.log("Geocoding",cinema.title,cinema.address);
                  geocoder.geocode(cinema.address, function(err, res) {
                      if (err) console.log(err);
                      if (res===undefined) {
                        console.log("Got nothing back here",cinema.address);
                        return;
                      };
                      console.log(cinema.address,"RES",res);
                      cinema.coords = [res[0].latitude, res[0].longitude];
                      console.log("COORDS",cinema.coords);
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
                      console.log("Added",cinema.title);
                  });
                });              

              } else {
                console.log("NO TID",tid,results[i]);
              }
            } else {
              console.log("not a link",cinema.title);
            }

          }    
    }


    request(requestUrl, function (error, response, data) {
      if (!error && response.statusCode == 200) {
      	var json = JSON.parse(data);
        var results = json[0].results;

        for (var i = 0; i < results.length; i++) {
          $ = cheerio.load(results[i]);

          saveResult($);
        };
      } else {
        console.log("ERROR",error,statusCode);
      }
    });
  }
}

