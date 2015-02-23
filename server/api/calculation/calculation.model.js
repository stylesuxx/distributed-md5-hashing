'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var CalculationSchema = new Schema({
  session: String,
  processing: Boolean,
  alphabet: String,
  start: String,
  length: Number,
  search: { type: ObjectId, ref: 'SearchSchema' }
});

module.exports = mongoose.model('Calculation', CalculationSchema);