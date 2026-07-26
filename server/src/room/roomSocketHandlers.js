const RoomService = require('./roomService');

const sendError = (socket, eventName, error, callback) => {
  const payload = {
    success: false,
    message: error.message || 'Something went wrong',
  };

  socket.emit(eventName, payload);

  if (typeof callback === 'function') {
    callback(payload);
  }
};

const broadcastRoomUpdate = (io, room) => {
  io.to(room.roomCode).emit('room-update', {
    success: true,
    room,
  });
};

const registerRoomHandlers = (io, socket) => {
  socket.on('create-room', async (payload, callback) => {
    if (typeof payload === 'function') {
      callback = payload;
    }

    try {
      const room = await RoomService.createRoom(socket.user.id);

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;

      const response = {
        success: true,
        room,
      };

      if (typeof callback === 'function') {
        callback(response);
      }

      broadcastRoomUpdate(io, room);
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('join-room', async (payload, callback) => {
    try {
      const room = await RoomService.joinRoom(socket.user.id, payload && payload.roomCode);

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;

      if (typeof callback === 'function') {
        callback({
          success: true,
          room,
        });
      }

      broadcastRoomUpdate(io, room);
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('player-ready', async (payload, callback) => {
    try {
      const roomCode = (payload && payload.roomCode) || socket.data.roomCode;
      const result = await RoomService.setReady(socket.user.id, roomCode, true);

      socket.data.roomCode = result.room.roomCode;
      broadcastRoomUpdate(io, result.room);

      if (result.started) {
        io.to(result.room.roomCode).emit('battle-start', {
          success: true,
          room: result.room,
          selectedProblem: result.selectedProblem,
        });
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          room: result.room,
          started: result.started,
        });
      }
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('player-unready', async (payload, callback) => {
    try {
      const roomCode = (payload && payload.roomCode) || socket.data.roomCode;
      const result = await RoomService.setReady(socket.user.id, roomCode, false);

      socket.data.roomCode = result.room.roomCode;
      broadcastRoomUpdate(io, result.room);

      if (typeof callback === 'function') {
        callback({
          success: true,
          room: result.room,
          started: false,
        });
      }
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('leave-room', async (payload, callback) => {
    try {
      const roomCode = (payload && payload.roomCode) || socket.data.roomCode;
      const result = await RoomService.leaveRoom(socket.user.id, roomCode);

      if (roomCode) {
        socket.leave(roomCode);
      }

      socket.data.roomCode = null;

      if (result.room) {
        broadcastRoomUpdate(io, result.room);
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          deleted: result.deleted,
          room: result.room,
        });
      }
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('disconnect', async () => {
    const roomCode = socket.data.roomCode;

    if (!roomCode) {
      return;
    }

    try {
      const result = await RoomService.leaveRoom(socket.user.id, roomCode);

      if (result.room) {
        broadcastRoomUpdate(io, result.room);
      }
    } catch (error) {
      // The socket is already disconnected, so there is no client to acknowledge.
    }
  });
};

module.exports = registerRoomHandlers;
