/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Search = require('./search.model');

function getNextItems(limit, callback) {
  Search.find(
    {'processed': false},
    null,
    {
      'limit': 10,
      'sort': {
        'createdAt': 1
      }
    },
    function(err, docs) {
      callback(docs);
    }
  );
}

function getLastSolved(limit, callback) {
  Search.find(
    {'processed': true},
    null,
    {
      'limit': 10,
      'sort': {
        'createdAt': 1
      }
    },
    function(err, docs) {
      callback(docs);
    }
  );
};

exports.sendSearchStatsUpdate = function(socketio) {
  onUpdateSearchStats(function(stats) {
    socketio.emit('updateSearchStats', stats);
  });
};

var onUpdateSearchStats = function(callback) {
  getNextItems(10, function(items) {
    var next = items;
    getLastSolved(10, function(items) {
      var last = items;
      var stats = {
        'last': last,
        'next': next
      };

      callback(stats);
    })
  });
};

exports.register = function(socket) {
  Search.schema.post('save', function (doc) {
    onSave(socket, doc);
  });

  Search.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });

  socket.on('getSearchStats', function() {
    onUpdateSearchStats(function(stats) {
      socket.emit('updateSearchStats', stats);
    });
  });
}

function onSave(socket, doc, cb) {
  socket.emit('search:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('search:remove', doc);
}