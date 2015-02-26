'use strict';

var _ = require('lodash');
var Calculation = require('./calculation.model');

// Get list of calculations
exports.index = function(req, res) {
  Calculation.find(function (err, calculations) {
    if(err) { return handleError(res, err); }
    return res.json(200, calculations);
  });
};

// Get a single calculation
exports.show = function(req, res) {
  Calculation.findById(req.params.id, function (err, calculation) {
    if(err) { return handleError(res, err); }
    if(!calculation) { return res.send(404); }
    return res.json(calculation);
  });
};

// Creates a new calculation in the DB.
exports.create = function(req, res) {
  Calculation.create(req.body, function(err, calculation) {
    if(err) { return handleError(res, err); }
    return res.json(201, calculation);
  });
};

// Updates an existing calculation in the DB.
exports.update = function(req, res) {
  if(req.body._id) { delete req.body._id; }
  Calculation.findById(req.params.id, function (err, calculation) {
    if (err) { return handleError(res, err); }
    if(!calculation) { return res.send(404); }
    var updated = _.merge(calculation, req.body);
    updated.save(function (err) {
      if (err) { return handleError(res, err); }
      return res.json(200, calculation);
    });
  });
};

// Deletes a calculation from the DB.
exports.destroy = function(req, res) {
  Calculation.findById(req.params.id, function (err, calculation) {
    if(err) { return handleError(res, err); }
    if(!calculation) { return res.send(404); }
    calculation.remove(function(err) {
      if(err) { return handleError(res, err); }
      return res.send(204);
    });
  });
};

function handleError(res, err) {
  return res.send(500, err);
}