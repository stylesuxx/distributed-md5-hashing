'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var CalculationSchema = new Schema({
  session: String,
  processing: Boolean,
  processed: Boolean,
  alphabet: String,
  start: String,
  length: Number
});

module.exports = mongoose.model('Calculation', CalculationSchema);