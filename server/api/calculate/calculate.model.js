'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var CalculateSchema = new Schema({
  name: String,
  info: String,
  active: Boolean
});

module.exports = mongoose.model('Calculate', CalculateSchema);