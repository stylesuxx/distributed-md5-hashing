'use strict';

var calculateHash = function(string) {
  var md5 = new Hashes.MD5().hex(string);

  return md5;
};

var increaseString = function(string, alphabet) {
  var data = [];
  var overflow = false;

  for(var i = 0; i < string.length; i++) {
    data.push(alphabet.indexOf(string[i]));
  }

  var current = data.length - 1
  var index = data[current];
  index++;

  // Check if we have an overflow
  if(index > alphabet.length -1) {
    overflow = true;
    data[data.length - 1] = 0;

    while(overflow) {
      if (current == 0) {
        data.unshift(0);
        overflow = false;

        break;
      }
      current--;

      index = data[current];
      index++;
      if(index > alphabet.length -1) {
        data[current] = 0;
      }
      else {
        data[current] = index;
        overflow = false;
      }
    }
  }
  // Otherwise just increase the last position
  else {
    data[data.length - 1] = index;
  }

  string = [];
  for(var i = 0; i < data.length; i++) {
    string.push(alphabet[data[i]]);
  }

  return string;
};

angular.module('distributedMd5App')
  .controller('MainCtrl', function ($scope, $timeout, $interval, $http, socket, $cookies) {
    $scope.joined = false;
    $scope.processing = false;

    $scope.search = {
      'hashDefault': '',
      'hash': '',
      'hashValid': true,
      'maxLengthDefault': 6,
      'maxLength': 6,
      'maxLengthValid': true,
      'alphabetDefault': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      'alphabet': '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      'alphabetValid': true
    };

    $scope.clients = {
      'connected': 1,
      'working': 0
    };

    $scope.work = {
      'search': null,
      'found': false,
      'solution': null,
      'currentWord': null,
      'progress': 0,
      'alphabet': null
    };

    $scope.searchStats = {
      'last': null,
      'next': null
    }

    socket.socket.emit('getSearchStats');

    socket.socket.on('noWork', function() {
      $scope.processing = false;
    });

    socket.socket.on('updateSearchStats', function(stats) {
      $scope.searchStats = stats;
    });

    socket.socket.on('connectedClients', function(data) {
      $scope.clients.connected = data.connectedClients;
    });

    socket.socket.on('workingClients', function(data) {
      $scope.clients.working = data.workingClients;
    });

    socket.socket.on('work', function(data) {
      $scope.end = new Date().getTime();
      $scope.processing = true;
      $scope.work.search = data.search;
      $scope.calculation = data.calculation;

      var delta = $scope.end - $scope.start;
      console.log('Received work', data, '(transmission took:', delta, 'ms)');
      $scope.processWork(data.calculation);
    });

    $scope.work_2 = function(limit, update, alphabet, word, callback) {
      // This vars will stay the same
      var limit = limit;
      var alphabet = alphabet;
      var update = update;

      // This vars will change
      var index = 0;
      var word = word;
      var joined = word.join("");
      var work = [];
      var hash = null;
      var item = null;

      (function processItemZero() {
        index += 1;

        if(index == limit) {
          callback(work);
        }
        else {
          joined = word.join("");

          // Update the progress bar every update items
          if((index % Math.ceil(update)) == 0 || index + 1 == limit) {
            $scope.work.currentWord = joined;
            $scope.work.progress = Math.ceil((index / limit) * 100);
            $scope.$apply();
          }

          item = {
            'word': joined,
            'hash': calculateHash(joined)
          };

          work.push(item);

          if(item.hash == $scope.work.search) {
            console.log("found hash for", $scope.work.search, ':', item.word);

            $scope.work.currentWord = joined;
            $scope.work.progress = Math.ceil((index / limit) * 100);

            $scope.work.found = true;
            $scope.work.solution = item.word;
            $scope.$apply();

            callback(work);
          }
          else {
            if($scope.joined) {
              word = increaseString(word, alphabet);
              setZeroTimeout(processItemZero, 0);
            }
          }
        }
      })();
    }

    $scope.processWork = function(data) {
      var work = []
      var string = data.start
      string = string.split("");
      $scope.length = data.length;

      var max = 10000;
      var start = 0;
      var end = 0;
      var delta = 0;

      var start = new Date().getTime();
      $scope.transmitting = false;

      $scope.work.found = false;
      $scope.work.solution = null;

      $scope.work_2(data.length, 5000, data.alphabet.split(""), string, function(work) {
        var end = new Date().getTime();
        var delta = end - start;

        console.log("setZeroTimeout loop for", data.length, "items took:", delta, "ms");

        $scope.start = new Date().getTime();
        $scope.transmitting = true;
        $scope.$apply();

        var item = {
          //'work': work, // we do not deliver the hashes, since we are not
          // going after building rainbow tables, but if we'd like, we could
          // just enable it here.
          'calculation': $scope.calculation
        }

        // Check if we have found the solution
        if($scope.work.found) {
          item.found = true;
          item.solution = $scope.work.solution;

          socket.socket.emit('deliverWork', item, function() {
            // Get new work if we are still in the pool
            if($scope.joined) {
              socket.socket.emit('getWork');
            }
          });
        }
        else {
          if($scope.joined) {
            $scope.end = new Date().getTime();
            socket.socket.emit('deliverWork', item, function() {
              // This takes some time to deliver,....
              $scope.end = new Date().getTime();
              var delta = $scope.end - $scope.start;
              console.log('transmission took:', delta, 'ms', $scope.end);
            });

            socket.socket.emit('getWork');
          }
        }
      });
    };

    $scope.joinPool = function() {
      if(!$scope.joined || !$scope.processing) {
        $scope.joined = true;
        socket.socket.emit('joinPool');
        $scope.start = new Date().getTime();
        $cookies.reJoin = true;

        $interval(function() {
          if($scope.joined && !$scope.processing) {
            console.log("auto request new work.");
            socket.socket.emit('getWork');
          }
        }, 30000);
      }
    };

    $scope.leavePool = function() {
      $scope.joined = false;
      $scope.processing = false;
      $scope.work.progress = 0;
      $cookies.reJoin = false;

      socket.socket.emit('leavePool');
    };

    $scope.checkAlphabetLength = function() {
      $scope.search.alphabetValid = ($scope.search.alphabet.length > 0);
    };

    $scope.checkMaxLength = function() {
      $scope.search.maxLengthValid = ($scope.search.maxLength > 0 && $scope.search.maxLength < 33);
    };

    $scope.checkHash = function() {
      var hash = $scope.search.hash;
      var valid = "0123456789abcdefABCDEF";
      valid = valid.split("");
      $scope.search.hashValid = true;

      if(hash.length != 32) {
        $scope.search.hashValid = false;
      }
      else {
        for(var i = 0, len = hash.length; i < len; i++) {
          if(valid.indexOf($scope.search.hash[i]) < 0) {
            $scope.search.hashValid = false;
            break;
          }
        }
      }
    };

    $scope.addSearch = function() {
      var search = {
        'hash': $scope.search.hash,
        'alphabet': $scope.search.alphabet,
        'maxLength': $scope.search.maxLength
      };

      $scope.checkAlphabetLength();
      $scope.checkMaxLength();
      $scope.checkHash();

      if($scope.search.maxLengthValid && $scope.search.alphabetValid && $scope.search.hashValid) {
        $http.post('/api/searches', search)
          .success(function(data, status, headers, config) {
            $scope.search.hash = $scope.search.hashDefault;
            $scope.search.alphabet = $scope.search.alphabetDefault;
            $scope.search.maxLength = $scope.search.maxLengthDefault;

            $scope.joinPool();

            noty({
                layout: 'topRight',
                type: 'success',
                theme: 'bootstrapTheme',
                text: 'Successfully added hash to queue!',
                timeout: 5000,
                animation: {
                    open: 'animated bounceInRight', // Animate.css class names
                    close: 'animated bounceOutRight', // Animate.css class names
                    easing: 'swing', // unavailable - no need
                    speed: 500 // unavailable - no need
                }
            });
          })
          .error(function(data, status, headers, config) {
            noty({
                layout: 'topRight',
                type: 'error',
                theme: 'bootstrapTheme',
                text: 'Could not add hash, verify that it is a MD5 hash!',
                timeout: 5000,
                buttons: false,
                animation: {
                    open: 'animated bounceInRight', // Animate.css class names
                    close: 'animated bounceOutRight', // Animate.css class names
                    easing: 'swing', // unavailable - no need
                    speed: 500 // unavailable - no need
                }
            });
          });
      }
    }

    // Automatically rejoin the pool after a reload or when again visiting the
    // site.
    if($cookies.reJoin && $cookies.reJoin == "true") {
      $scope.joinPool();
    }

    $scope.$on('$destroy', function () {

    });
  });
