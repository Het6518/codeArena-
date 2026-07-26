const { Server } = require('socket.io');
const registerRoomHandlers = require('../room/roomSocketHandlers');
const socketAuth = require('./socketAuth');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuth);

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
