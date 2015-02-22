var bignum = require('bignum');

/**
 * This class requires bignum.
 *
 * Cause, not everything is a frickin float...
 */

/**
 * alphabet is an array with every item of the alphabet in the order they should
 * be processed. The minimum alphabet length is 1.
 */
var Words = function(alphabet) {
  this.alphabet = alphabet;
  this.n = alphabet.length;

  this.findK = function(nth) {
    var k = 1;
    var sum = Math.pow(this.n, k);

    while(nth > sum) {
      k++;
      sum += Math.pow(this.n, k);
    }

    return k;
  }

  this.decimalToBase = function(decimal) {
    var decimal = bignum(decimal);
    var ret = [];
    if(decimal < this.n) {
      return [decimal];
    }

    var next = decimal;
    while(next > 0) {
        ret.unshift(next % this.n);
        next = Math.floor(next / this.n)
    }

    return ret;
  }

  this.pad = function(base, padding) {
    while (base.length < padding) {
      base.unshift(0);
    }

    return base;
  }

  this.map = function(base) {
    var mapped = [];
    for(var i = 0; i < base.length; i++) {
      mapped[i] = this.alphabet[base[i]];
    }

    return mapped;
  }

  this.sumnk = function(kmax) {
    var sum = 0;
    for(var k = 1; k < kmax; k++) {
      sum += Math.pow(this.n, k);
    }

    return sum;
  }
}

/**
 * Get the nth word over an alphabet.
 * The 0th word is always the empty string ""
 */
Words.prototype.nth = function(nth) {
  var k = this.findK(nth);
  var index = nth - this.sumnk(k) - 1;
  var base = this.decimalToBase(index);
  var padded = this.pad(base, k);
  var mapped = this.map(padded);

  //console.log("k:", k, "index:", index, "base:", base, "mapped:", mapped);

  return mapped.join("");
}

/**
 * Get the next word based on a word
 */
Words.prototype.next = function(word) {
  return null;
}

Words.prototype.getAlphabet = function() {
  return this.alphabet;
}

Words.prototype.getN = function() {
  return this.n;
}

exports.Words = Words;