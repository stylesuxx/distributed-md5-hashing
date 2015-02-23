'use strict';
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    timestamps = require('mongoose-timestamp');

function md5validator(check) {
  var check = check.split("");
  if(check.length == 32) {
    var alphabet = "0123456789abcdefABCDEF";
    alphabet.split("");
    var valid = true;
    for(var i = 0, len = check.length; i < len; i++) {
      if(alphabet.indexOf(check[i]) < 0) {
        return false;
      }
    }

    return true;
  }

  return false;
}

var SearchSchema = new Schema({
  hash: {
    type: String,
    required: true,
    validate: md5validator
  },
  alphabet: {
    type: String,
    required: true
  },
  maxLength: {
    type: Number,
    required: true
  },
  solution: String,
  lastIndex: {
    type: String,
    default: ""
  },
  processed: {
    type: Boolean,
    default: false
  }
});

SearchSchema.plugin(timestamps);
SearchSchema.index({hash: 1, alphabet: 1}, {unique: true});

module.exports = mongoose.model('Search', SearchSchema);