const RoomService = require('./roomService');
const BattleService = require('../battle/battleService');
const { isConnectionError } = require('../config/dbErrors');

// A player who disconnects from a lobby (e.g. refreshes the page) gets this long to come
// back before being removed. Disconnecting during a battle never removes the player; only an
// explicit leave forfeits.
const LOBBY_DISCONNECT_GRACE_MS = 15000;

// Only intentional, user-facing messages are sent to the client. Anything else (Prisma
// errors, stack details, hostnames, file paths) is logged here and replaced.
const toClientMessage = (error, eventName) => {
  if (error.expose || (error.statusCode && error.statusCode < 500)) {
    return error.message;
  }

  console.error(`[socket ${eventName}]`, error.message);

  if (isConnectionError(error)) {
    return 'The database is temporarily unreachable. Please try again in a few seconds.';
  }

  return 'Something went wrong. Please try again.';
};

const sendError = (socket, eventName, error, callback) => {
  const payload = {
    success: false,
    message: toClientMessage(error, eventName),
  };

  // Acknowledge through the callback when one was provided; otherwise emit an event.
  if (typeof callback === 'function') {
    callback(payload);
  } else {
    socket.emit(eventName, payload);
  }
};

const getOnlineUserIds = async (io, roomCode) => {
  const sockets = await io.in(roomCode).fetchSockets();
  return new Set(sockets.map((roomSocket) => roomSocket.data.userId));
};

const broadcastRoomUpdate = async (io, room) => {
  if (!room) {
    return;
  }

  const onlineUserIds = await getOnlineUserIds(io, room.roomCode);

  io.to(room.roomCode).emit('room-update', {
    success: true,
    room: {
      ...room,
      players: room.players.map((player) => ({ ...player, online: onlineUserIds.has(player.id) })),
    },
  });
};

const broadcastLeftRooms = async (io, leftRooms = []) => {
  for (const result of leftRooms) {
    if (result.room) {
      await broadcastRoomUpdate(io, result.room);
    }
  }
};

// Move this socket's subscription to a single room channel.
const switchSocketRoom = (socket, roomCode) => {
  if (socket.data.roomCode && socket.data.roomCode !== roomCode) {
    socket.leave(socket.data.roomCode);
  }

  socket.join(roomCode);
  socket.data.roomCode = roomCode;
};

const resolveRoomCode = (socket, payload) => {
  return (payload && typeof payload === 'object' && payload.roomCode) || socket.data.roomCode;
};

const registerRoomHandlers = (io, socket) => {
  socket.data.userId = socket.user.id;

  socket.on('create-room', async (payload, callback) => {
    if (typeof payload === 'function') {
      callback = payload;
    }

    try {
      const { room, leftRooms } = await RoomService.createRoom(socket.user.id, {
        difficulty: payload && typeof payload === 'object' ? payload.difficulty : undefined,
      });

      switchSocketRoom(socket, room.roomCode);

      if (typeof callback === 'function') {
        callback({
          success: true,
          room,
        });
      }

      await broadcastRoomUpdate(io, room);
      await broadcastLeftRooms(io, leftRooms);
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('join-room', async (payload, callback) => {
    try {
      const { room, leftRooms } = await RoomService.joinRoom(socket.user.id, payload && payload.roomCode);

      switchSocketRoom(socket, room.roomCode);

      if (typeof callback === 'function') {
        callback({
          success: true,
          room,
        });
      }

      await broadcastRoomUpdate(io, room);
      await broadcastLeftRooms(io, leftRooms);
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  const handleReadyChange = (ready) => async (payload, callback) => {
    try {
      const result = await RoomService.setReady(socket.user.id, resolveRoomCode(socket, payload), ready);

      await broadcastRoomUpdate(io, result.room);

      if (result.started) {
        BattleService.scheduleBattleTimeout(result.room);
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
  };

  socket.on('player-ready', handleReadyChange(true));
  socket.on('player-unready', handleReadyChange(false));

  socket.on('set-difficulty', async (payload, callback) => {
    try {
      const room = await RoomService.setDifficulty(
        socket.user.id,
        resolveRoomCode(socket, payload),
        payload && typeof payload === 'object' ? payload.difficulty : undefined
      );

      await broadcastRoomUpdate(io, room);

      if (typeof callback === 'function') {
        callback({ success: true, room });
      }
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('request-rematch', async (payload, callback) => {
    try {
      const finishedRoomCode = resolveRoomCode(socket, payload);
      const { room, leftRooms, created } = await RoomService.createRematch(socket.user.id, finishedRoomCode);
      const cleanFinishedCode = RoomService.parseRoomCode(finishedRoomCode);

      // Tell the opponent, who is still subscribed to the finished room's channel.
      if (created) {
        socket.to(cleanFinishedCode).emit('rematch-offer', {
          success: true,
          roomCode: room.roomCode,
          fromUserId: socket.user.id,
        });
      }

      switchSocketRoom(socket, room.roomCode);

      if (typeof callback === 'function') {
        callback({ success: true, room });
      }

      await broadcastRoomUpdate(io, room);
      await broadcastLeftRooms(io, leftRooms);
    } catch (error) {
      sendError(socket, 'room-error', error, callback);
    }
  });

  socket.on('leave-room', async (payload, callback) => {
    try {
      const roomCode = resolveRoomCode(socket, payload);
      const result = await RoomService.leaveRoom(socket.user.id, roomCode);

      if (result.inBattle) {
        await BattleService.forfeitBattle(socket.user.id, roomCode);
      }

      if (roomCode) {
        socket.leave(roomCode.toUpperCase());
      }

      socket.data.roomCode = null;

      if (result.room && !result.inBattle) {
        await broadcastRoomUpdate(io, result.room);
      }

      if (typeof callback === 'function') {
        callback({
          success: true,
          deleted: result.deleted,
          forfeited: Boolean(result.inBattle),
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
      // Presence needs no database work; other sockets of the same user may still be here.
      const onlineNow = await getOnlineUserIds(io, roomCode);
      io.to(roomCode).emit('player-presence', {
        userId: socket.user.id,
        online: onlineNow.has(socket.user.id),
      });

      const status = await RoomService.getRoomStatus(roomCode);

      if (status !== 'WAITING') {
        return;
      }

      setTimeout(async () => {
        try {
          const onlineUserIds = await getOnlineUserIds(io, roomCode);

          if (onlineUserIds.has(socket.user.id)) {
            return;
          }

          const result = await RoomService.leaveRoom(socket.user.id, roomCode);
          await broadcastRoomUpdate(io, result.room);
        } catch (error) {
          // The room may have been removed in the meantime; nothing to clean up.
        }
      }, LOBBY_DISCONNECT_GRACE_MS).unref();
    } catch (error) {
      // The socket is already disconnected, so there is no client to acknowledge.
    }
  });
};

module.exports = registerRoomHandlers;
