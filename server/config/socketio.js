/**
 * Socket.io configuration
 */

'use strict';

var config = require('./environment');
var connectedClients = 0;

// When the user disconnects.. perform this
function onDisconnect(socket, socketio) {
  connectedClients --;
  socketio.emit('connectedClients', {'connectedClients': connectedClients});
}

// When the user connects.. perform this
function onConnect(socket, socketio) {
  // When the client emits 'info', this listens and executes
  socket.on('info', function (data) {
    console.info('[%s] %s', socket.address, JSON.stringify(data, null, 2));
  });

  connectedClients ++;
  socketio.emit('connectedClients', {'connectedClients': connectedClients});

  // Insert sockets below
  require('../api/search/search.socket').register(socket);
  require('../api/search/search.controller').register(socketio);
  require('../api/calculation/calculation.socket').register(socket, socketio);
}

module.exports = function (socketio) {
  // socket.io (v1.x.x) is powered by debug.
  // In order to see all the debug output, set DEBUG (in server/config/local.env.js) to including the desired scope.
  //
  // ex: DEBUG: "http*,socket.io:socket"

  // We can authenticate socket.io users and access their token through socket.handshake.decoded_token
  //
  // 1. You will need to send the token in `client/components/socket/socket.service.js`
  //
  // 2. Require authentication here:
  // socketio.use(require('socketio-jwt').authorize({
  //   secret: config.secrets.session,
  //   handshake: true
  // }));

  socketio.on('connection', function (socket) {
    socket.address = socket.handshake.address !== null ?
            socket.handshake.headers.host :
            process.env.DOMAIN;

    socket.connectedAt = new Date();

    // Call onDisconnect.
    socket.on('disconnect', function () {
      onDisconnect(socket, socketio);
      console.info('[%s] DISCONNECTED', socket.address);
    });

    // Call onConnect.
    onConnect(socket, socketio);
    console.info('[%s] CONNECTED', socket.address);
  });
};