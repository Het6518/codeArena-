const RoomService = require('./roomService');

const registerRoomHandlers = (io, socket) => {
  socket.on('room-service-check', (callback) => {
    const result = RoomService.ensureReady();

    if (typeof callback === 'function') {
      callback(result);
    }
  });
};

module.exports = registerRoomHandlers;
// handler is more like the controller 