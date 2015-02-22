/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Calculate = require('./calculate.model');

exports.register = function(socket) {
  Calculate.schema.post('save', function (doc) {
    onSave(socket, doc);
  });
  Calculate.schema.post('remove', function (doc) {
    onRemove(socket, doc);
  });
}

function onSave(socket, doc, cb) {
  socket.emit('calculate:save', doc);
}

function onRemove(socket, doc, cb) {
  socket.emit('calculate:remove', doc);
}