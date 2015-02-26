'use strict';

var _ = require('lodash');
var Search = require('./search.model');
var SearchSocket = require('./search.socket');
var sockets = null;

exports.register = function(socketio) {
  sockets = socketio;
}

// get the next search for porcessing which is the first not processed search
// in the database
exports.getSearch = function(callback) {
  Search.findOne(
    {'processed': false},
    null,
    {
      'sort': {
        'createdAt': 1
      }
    },
    function(err, doc) {
      callback(doc);
    }
  );
};

// Updates an existing search in the DB.
exports.updateSearch = function(search, callback) {
  Search.findById(search.id, function (err, result) {
    if(!result) {
      console.log(err);
      callback();
    }
    var updated = _.merge(result, search);
    updated.save(function (err) {
      callback();
    });
  });
};

// Get list of searchs
exports.index = function(req, res) {
  Search.find(function (err, searchs) {
    if(err) { return handleError(res, err); }
    return res.json(200, searchs);
  });
};

// Get a single search
exports.show = function(req, res) {
  Search.findById(req.params.id, function (err, search) {
    if(err) { return handleError(res, err); }
    if(!search) { return res.send(404); }
    return res.json(search);
  });
};

// Creates a new search in the DB.
exports.create = function(req, res) {
  Search.create(req.body, function(err, search) {
    if(err) { return handleError(res, err); }
    SearchSocket.sendSearchStatsUpdate(sockets);
    return res.json(201, search);
  });
};

// Updates an existing search in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Search.findById(req.params.id, function (err, search) {
    if (err) { return handleError(res, err); }
    if(!search) { return res.send(404); }
    var updated = _.merge(search, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, search);
    });
  });
};

// Deletes a search from the DB.
exports.destroy = function(req, res) {
  Search.findById(req.params.id, function (err, search) {
    if(err) { return handleError(res, err); }
    if(!search) { return res.send(404); }
    search.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}