const crypto = require('crypto');
const prisma = require('../config/prisma');

const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS_PER_ROOM = 2;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/;

// `expose` marks messages that are safe to show to the client.
const createSocketError = (message) => {
  const error = new Error(message);
  error.expose = true;
  return error;
};

const generateRoomCode = () => {
  let code = '';

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_CHARS[crypto.randomInt(ROOM_CODE_CHARS.length)];
  }

  return code;
};

// Normalizes and validates a client supplied room code.
const parseRoomCode = (roomCode) => {
  if (!roomCode || typeof roomCode !== 'string') {
    throw createSocketError('Room code is required');
  }

  const cleanRoomCode = roomCode.trim().toUpperCase();

  if (!ROOM_CODE_PATTERN.test(cleanRoomCode)) {
    throw createSocketError('Room code must be 6 letters or digits');
  }

  return cleanRoomCode;
};

const roomInclude = {
  host: {
    select: {
      id: true,
      username: true,
      avatar: true,
    },
  },
  winner: {
    select: {
      id: true,
      username: true,
    },
  },
  selectedProblem: {
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      description: true,
      constraints: true,
      sampleInput: true,
      sampleOutput: true,
      explanation: true,
      timeLimitMs: true,
      memoryLimitMb: true,
    },
  },
  players: {
    orderBy: {
      joinedAt: 'asc',
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
          rating: true,
        },
      },
    },
  },
};

class RoomService {
  static serializeRoom(room, { onlineUserIds } = {}) {
    if (!room) {
      return null;
    }

    return {
      roomCode: room.roomCode,
      status: room.status,
      host: room.host
        ? {
            id: room.host.id,
            username: room.host.username,
            avatar: room.host.avatar,
          }
        : null,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
      endReason: room.endReason,
      winner: room.winner ? { id: room.winner.id, username: room.winner.username } : null,
      // Lets clients compute their clock offset so the stopwatch follows server time.
      serverTime: new Date().toISOString(),
      selectedProblem: room.selectedProblem,
      players: room.players.map((player) => ({
        id: player.user.id,
        username: player.user.username,
        avatar: player.user.avatar,
        rating: player.user.rating,
        ready: player.ready,
        isHost: player.isHost,
        online: onlineUserIds ? onlineUserIds.has(player.user.id) : undefined,
        solvedAt: player.solvedAt,
        solveTimeMs: player.solveTimeMs,
        ratingBefore: player.ratingBefore,
        ratingAfter: player.ratingAfter,
      })),
    };
  }

  static async getRoomByCode(roomCode) {
    const room = await prisma.battleRoom.findUnique({
      where: {
        roomCode: roomCode.toUpperCase(),
      },
      include: roomInclude,
    });

    if (!room) {
      throw createSocketError('Room not found');
    }

    return room;
  }

  // Single-column lookup for hot paths that only need to branch on status.
  static async getRoomStatus(roomCode) {
    const room = await prisma.battleRoom.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      select: { status: true },
    });

    return room ? room.status : null;
  }

  static async getRoomById(roomId) {
    return prisma.battleRoom.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });
  }

  static async createUniqueRoomCode() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const roomCode = generateRoomCode();
      const existingRoom = await prisma.battleRoom.findUnique({
        where: {
          roomCode,
        },
        select: {
          id: true,
        },
      });

      if (!existingRoom) {
        return roomCode;
      }
    }

    throw createSocketError('Could not generate a unique room code');
  }

  // A user can only sit in one lobby at a time. Returns the codes of lobbies that were left
  // so the caller can broadcast updates to the players remaining in them.
  static async leaveOtherWaitingRooms(userId, exceptRoomCode = null) {
    const memberships = await prisma.battleRoomPlayer.findMany({
      where: {
        userId,
        room: {
          status: 'WAITING',
          ...(exceptRoomCode ? { roomCode: { not: exceptRoomCode } } : {}),
        },
      },
      select: {
        room: { select: { roomCode: true } },
      },
    });

    const results = [];

    for (const membership of memberships) {
      results.push(await RoomService.leaveRoom(userId, membership.room.roomCode));
    }

    return results;
  }

  static async createRoom(userId) {
    const leftRooms = await RoomService.leaveOtherWaitingRooms(userId);
    const roomCode = await RoomService.createUniqueRoomCode();

    const room = await prisma.battleRoom.create({
      data: {
        roomCode,
        hostId: userId,
        status: 'WAITING',
        players: {
          create: {
            userId,
            isHost: true,
            ready: false,
          },
        },
      },
      include: roomInclude,
    });

    return {
      room: RoomService.serializeRoom(room),
      leftRooms,
    };
  }

  static async joinRoom(userId, roomCode) {
    const cleanRoomCode = parseRoomCode(roomCode);

    // Load the full room once: reconnects (the common, bursty case) need nothing more.
    const room = await prisma.battleRoom.findUnique({
      where: {
        roomCode: cleanRoomCode,
      },
      include: roomInclude,
    });

    if (!room) {
      throw createSocketError('Invalid room code');
    }

    const alreadyJoined = room.players.some((player) => player.userId === userId);

    // Existing players may always reconnect (e.g. page refresh during a battle).
    if (alreadyJoined) {
      return { room: RoomService.serializeRoom(room), leftRooms: [] };
    }

    if (room.status !== 'WAITING') {
      throw createSocketError('Battle has already started');
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw createSocketError('Room is full');
    }

    const leftRooms = await RoomService.leaveOtherWaitingRooms(userId, cleanRoomCode);

    try {
      await prisma.battleRoomPlayer.create({
        data: {
          roomId: room.id,
          userId,
          isHost: false,
          ready: false,
        },
      });
    } catch (error) {
      if (error.code !== 'P2002') {
        throw error;
      }
    }

    // Re-check capacity after the insert: two users joining at the same moment could both
    // pass the check above. The later joiner is removed again.
    const players = await prisma.battleRoomPlayer.findMany({
      where: { roomId: room.id },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    });

    if (players.length > MAX_PLAYERS_PER_ROOM) {
      const position = players.findIndex((player) => player.userId === userId);

      if (position >= MAX_PLAYERS_PER_ROOM) {
        await prisma.battleRoomPlayer.deleteMany({ where: { roomId: room.id, userId } });
        throw createSocketError('Room is full');
      }
    }

    const updatedRoom = await RoomService.getRoomByCode(cleanRoomCode);
    return { room: RoomService.serializeRoom(updatedRoom), leftRooms };
  }

  static async setReady(userId, roomCode, ready) {
    const cleanRoomCode = parseRoomCode(roomCode);

    const room = await prisma.battleRoom.findUnique({
      where: {
        roomCode: cleanRoomCode,
      },
      include: {
        players: true,
      },
    });

    if (!room) {
      throw createSocketError('Room not found');
    }

    if (room.status !== 'WAITING') {
      throw createSocketError('Battle is already in progress or finished');
    }

    const player = room.players.find((roomPlayer) => roomPlayer.userId === userId);

    if (!player) {
      throw createSocketError('You are not a player in this room');
    }

    await prisma.battleRoomPlayer.update({
      where: {
        id: player.id,
      },
      data: {
        ready,
      },
    });

    const latestRoom = await RoomService.getRoomByCode(cleanRoomCode);
    const bothPlayersReady = latestRoom.players.length === MAX_PLAYERS_PER_ROOM && latestRoom.players.every((roomPlayer) => roomPlayer.ready);

    if (!bothPlayersReady || !ready) {
      return {
        room: RoomService.serializeRoom(latestRoom),
        started: false,
      };
    }

    const selectedProblem = await RoomService.getRandomProblem();
    const startedAt = new Date();

    // Conditional update: if both players click ready at the same moment, only one request
    // moves the room out of WAITING, so the battle starts exactly once with one problem.
    const { count } = await prisma.battleRoom.updateMany({
      where: {
        id: latestRoom.id,
        status: 'WAITING',
      },
      data: {
        status: 'IN_PROGRESS',
        selectedProblemId: selectedProblem.id,
        startedAt,
      },
    });

    const startedRoom = await RoomService.getRoomByCode(cleanRoomCode);

    return {
      room: RoomService.serializeRoom(startedRoom),
      selectedProblem: startedRoom.selectedProblem,
      started: count === 1,
    };
  }

  // Only published problems that actually have test cases can be judged.
  static async getRandomProblem() {
    const where = {
      isPublished: true,
      testCases: {
        some: {},
      },
    };

    const problemCount = await prisma.problem.count({ where });

    if (problemCount === 0) {
      throw createSocketError('No published problems are available');
    }

    const skip = crypto.randomInt(problemCount);
    const problems = await prisma.problem.findMany({
      where,
      orderBy: { id: 'asc' },
      skip,
      take: 1,
      select: {
        id: true,
      },
    });

    return problems[0];
  }

  // Leaving a lobby (WAITING) removes the player. Leaving an IN_PROGRESS battle is a forfeit,
  // which is handled by BattleService; the player row is kept for the result history.
  static async leaveRoom(userId, roomCode) {
    let cleanRoomCode;

    try {
      cleanRoomCode = parseRoomCode(roomCode);
    } catch (error) {
      return {
        deleted: false,
        room: null,
      };
    }

    const room = await prisma.battleRoom.findUnique({
      where: {
        roomCode: cleanRoomCode,
      },
      include: {
        players: {
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!room) {
      return {
        deleted: false,
        room: null,
      };
    }

    const leavingPlayer = room.players.find((player) => player.userId === userId);

    if (!leavingPlayer || room.status !== 'WAITING') {
      const currentRoom = await RoomService.getRoomByCode(cleanRoomCode);
      return {
        deleted: false,
        room: RoomService.serializeRoom(currentRoom),
        inBattle: Boolean(leavingPlayer) && room.status === 'IN_PROGRESS',
      };
    }

    await prisma.battleRoomPlayer.deleteMany({
      where: {
        id: leavingPlayer.id,
      },
    });

    const remainingPlayers = room.players.filter((player) => player.userId !== userId);

    if (remainingPlayers.length === 0) {
      await prisma.battleRoom.deleteMany({
        where: {
          id: room.id,
        },
      });

      return {
        deleted: true,
        room: null,
      };
    }

    // The remaining player becomes host and must confirm readiness again.
    await prisma.$transaction([
      prisma.battleRoom.update({
        where: {
          id: room.id,
        },
        data: {
          hostId: remainingPlayers[0].userId,
        },
      }),
      prisma.battleRoomPlayer.update({
        where: {
          id: remainingPlayers[0].id,
        },
        data: {
          isHost: true,
          ready: false,
        },
      }),
    ]);

    const updatedRoom = await RoomService.getRoomByCode(cleanRoomCode);

    return {
      deleted: false,
      room: RoomService.serializeRoom(updatedRoom),
    };
  }
}

RoomService.parseRoomCode = parseRoomCode;
RoomService.MAX_PLAYERS_PER_ROOM = MAX_PLAYERS_PER_ROOM;

module.exports = RoomService;
