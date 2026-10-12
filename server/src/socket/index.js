const { Server } = require('socket.io');
const registerRoomHandlers = require('../room/roomSocketHandlers');
const socketAuth = require('./socketAuth');
const { setIo } = require('./io');
const { getAllowedOrigins } = require('../config/env');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e5,
  });

  io.use(socketAuth);
  setIo(io);

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);

    socket.emit('socket-connected', {
      success: true,
      userId: socket.user.id,
    });
  });

  return io;
};

module.exports = initializeSocket;
