'use strict';

var _ = require('lodash');
var Calculate = require('./calculate.model');

// Get list of calculates
exports.index = function(req, res) {
  Calculate.find(function (err, calculates) {
    if(err) { return handleError(res, err); }
    return res.json(200, calculates);
  });
};

// Get a single calculate
exports.show = function(req, res) {
  Calculate.findById(req.params.id, function (err, calculate) {
    if(err) { return handleError(res, err); }
    if(!calculate) { return res.send(404); }
    return res.json(calculate);
  });
};

// Creates a new calculate in the DB.
exports.create = function(req, res) {
  Calculate.create(req.body, function(err, calculate) {
    if(err) { return handleError(res, err); }
    return res.json(201, calculate);
  });
};

// Updates an existing calculate in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Calculate.findById(req.params.id, function (err, calculate) {
    if (err) { return handleError(res, err); }
    if(!calculate) { return res.send(404); }
    var updated = _.merge(calculate, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, calculate);
    });
  });
};

// Deletes a calculate from the DB.
exports.destroy = function(req, res) {
  Calculate.findById(req.params.id, function (err, calculate) {
    if(err) { return handleError(res, err); }
    if(!calculate) { return res.send(404); }
    calculate.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}