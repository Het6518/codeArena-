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
    socket.emit('socket-connected', {
      success: true,
      userId: socket.user.id,
    });

    registerRoomHandlers(io, socket);
  });

  return io;
};

module.exports = initializeSocket;
