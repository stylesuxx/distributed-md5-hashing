/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var _ = require('lodash');
var bignum = require('bignum');

var Words = require("../../libraries/words/words.js");
var Calculation = require('./calculation.model');

var SearchModel = require('../search/search.model.js');
var SearchController = require('../search/search.controller.js');
var SearchSocket = require('../search/search.socket.js');

// Main config
var currentSearch = null;
var step = 100000;
var words = null;
var working = [];

// For measuring execution time
var start;
var end;

var removeAllCalculations = function(callback) {
  Calculation.remove(callback);
}

var hashFound = function() {}

var registerHandlers = function(socket, socketio) {
  Calculation.schema.post('save', function (doc) {
    onSave(socket, doc);
  });

  Calculation.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });

  socket.on('joinPool', function() {
    onJoinPool(socket, socketio);
    onGetWork(socket);
  });

  socket.on('getWork', function() {
    onGetWork(socket);
  });

  socket.on('deliverWork', function(data, callback) {
    onDeliverWork(socket, socketio, data, callback);
  });

  socket.on('leavePool', function() {
    onLeavePool(socket, socketio);
  });

  socket.on('disconnect', function() {
    onLeavePool(socket, socketio);
  });
}

exports.register = function(socket, socketio) {
  registerHandlers(socket, socketio);
  socket.emit('workingClients', {'workingClients': working.length});
}

function onLeavePool(socket, socketio) {
  var  index = working.indexOf(socket.id);
  if(index > -1) {
    var where = {
      'processing': true,
      'session': socket.id
    };

    var update = {
      'processing': false
    };

    var options = {
      'multi': true
    }

    Calculation.update(where, update, options,
      function(err, numAffected) {
        console.log(socket.id, '- left the pool, updated', numAffected, 'calculation(s)');
        working.splice(index, 1);
        socketio.emit('workingClients', {'workingClients': working.length})
      }
    );
  }
}

function onDeliverWork(socket, socketio, data, callback) {
  start = new Date().getTime();
  console.log(socket.id, '- delivered chunk:', data.calculation._id);
  if(data.found) {
    console.log(socket.id, '- found the solution:', data.solution);
    currentSearch.processed = true;

    // Todo: Check if we really got the solution

    currentSearch.solution = data.solution;
    SearchController.updateSearch(currentSearch, function() {
      currentSearch = null;
      removeAllCalculations(function() {
        SearchSocket.sendSearchStatsUpdate(socketio);
      });
    });
  }
  else {
    // We can remove a block from the database as soon as it has been processed
    Calculation.remove({_id: data.calculation._id}, function() {
      if(callback) {
        callback();
      }
    });
  }
}

function onJoinPool(socket, socketio) {
  // Check if sesion is already present in workers
  if(working.indexOf(socket.id) < 0) {
    console.log(socket.id, '- joined pool.');
    working.push(socket.id);
    socketio.emit('workingClients', {'workingClients': working.length})
  }
}

function checkWork(callback) {
  if(!currentSearch) {
    SearchController.getSearch(function(search) {
      if(search) {
        if(search.err) {
          console.log(search.err);

          callback();
        }
        else {
          // Reset all state related variables
          currentSearch = search;
          words = new Words.Words(search.alphabet.split(""));

          callback();
        }
      }
      else {
        callback();
      }
    });
  }
  else {
    callback();
  }
}

function registerNewCalculation(client, callback) {
  //Get current nth from db create a new calculation and update nth
  SearchModel.findOne(
    {'_id': currentSearch._id},
    function(err, search) {
      var currentIndex = bignum(search.lastIndex);
      var doc = {
        'search': currentSearch._id,
        'session': client,
        'processing': true,
        'alphabet': currentSearch.alphabet,
        'start': words.nth(currentIndex),
        length: step
      };

      search.lastIndex = currentIndex.add(doc.length).toString();
      search.save();

      Calculation.create(doc, function(err, calculation) {
        if(err) { return handleError(res, err); }

        var item = {
          'search': currentSearch.hash,
          'calculation': calculation
        };

        callback(item);
      });
    }
  );
}

function assignCalculation(client, calculation, callback) {
  calculation.session = client;
  calculation.processing = true;

  Calculation.findById(calculation.id, function (err, result) {
    if(!result) {
      console.log(err);
    }
    var updated = _.merge(result, calculation);
    var item = {
      'search': currentSearch.hash,
      'calculation': updated
    }
    updated.save(function (err) {
      callback(item);
    });
  });
}

// Check database for a calculation that is not processing and has not been
// processed yet.
function getDbCalculation(callback) {
  var query = Calculation.where({
    'processing': false
  });

  query.findOne(function (err, result) {
    if(result) callback(result);
    else callback(null);
  });
}

function distributeCalculation(socket, callback) {
  if(currentSearch && !currentSearch.processed) {
    // Check if we can distribute a calculation from the database
    getDbCalculation(function(result) {
      if(result) {
        assignCalculation(socket.id, result, function(calculation){
          callback(calculation);
        });
      }
      // Create new calculation
      else {
        registerNewCalculation(socket.id, function(calculation) {
          callback(calculation);
        });
      }
    });
  }
  else {
    callback(null);
  }
}

function onGetWork(socket) {
  console.log(socket.id, '- requested work.');
  checkWork(function() {
    distributeCalculation(socket, function(calculation){
      if(calculation) {
        console.log(socket.id, '- got new chunk:', calculation.calculation._id);
        socket.emit('work', calculation);
      }
      else {
        console.log(socket.id, '- no work available.');
        socket.emit('noWork');
      }
    });
  });
}

function onSave(socket, doc, cb) {
  socket.emit('calculation:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('calculation:remove', doc);
}