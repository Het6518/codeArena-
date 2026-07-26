const prisma = require('../config/prisma');

const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS_PER_ROOM = 2;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const createSocketError = (message) => {
  const error = new Error(message);
  return error;
};

const generateRoomCode = () => {
  let code = '';

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[randomIndex];
  }

  return code;
};

const roomInclude = {
  host: {
    select: {
      id: true,
      username: true,
      avatar: true,
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
        },
      },
    },
  },
};

class RoomService {
  static serializeRoom(room) {
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
      selectedProblem: room.selectedProblem,
      players: room.players.map((player) => ({
        id: player.user.id,
        username: player.user.username,
        avatar: player.user.avatar,
        ready: player.ready,
        isHost: player.isHost,
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

  static async createRoom(userId) {
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

    return RoomService.serializeRoom(room);
  }

  static async joinRoom(userId, roomCode) {
    if (!roomCode || typeof roomCode !== 'string') {
      throw createSocketError('Room code is required');
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();

    const room = await prisma.battleRoom.findUnique({
      where: {
        roomCode: cleanRoomCode,
      },
      include: {
        players: true,
      },
    });

    if (!room) {
      throw createSocketError('Invalid room code');
    }

    if (room.status !== 'WAITING') {
      throw createSocketError('Battle has already started');
    }

    const alreadyJoined = room.players.some((player) => player.userId === userId);

    if (!alreadyJoined && room.players.length >= MAX_PLAYERS_PER_ROOM) {
      throw createSocketError('Room is full');
    }

    if (!alreadyJoined) {
      await prisma.battleRoomPlayer.create({
        data: {
          roomId: room.id,
          userId,
          isHost: false,
          ready: false,
        },
      });
    }

    const updatedRoom = await RoomService.getRoomByCode(cleanRoomCode);
    return RoomService.serializeRoom(updatedRoom);
  }

  static async setReady(userId, roomCode, ready) {
    const cleanRoomCode = roomCode && roomCode.trim().toUpperCase();

    if (!cleanRoomCode) {
      throw createSocketError('Room code is required');
    }

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

    if (room.status === 'IN_PROGRESS') {
      throw createSocketError('Battle is already in progress');
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

    await prisma.$transaction([
      prisma.battleRoom.update({
        where: {
          id: latestRoom.id,
        },
        data: {
          status: 'READY',
        },
      }),
      prisma.battleRoom.update({
        where: {
          id: latestRoom.id,
        },
        data: {
          status: 'IN_PROGRESS',
          selectedProblemId: selectedProblem.id,
          startedAt,
        },
      }),
    ]);

    const startedRoom = await RoomService.getRoomByCode(cleanRoomCode);

    return {
      room: RoomService.serializeRoom(startedRoom),
      selectedProblem,
      started: true,
    };
  }

  static async getRandomProblem() {
    const problemCount = await prisma.problem.count({
      where: {
        isPublished: true,
      },
    });

    if (problemCount === 0) {
      throw createSocketError('No published problems are available');
    }

    const skip = Math.floor(Math.random() * problemCount);
    const problems = await prisma.problem.findMany({
      where: {
        isPublished: true,
      },
      skip,
      take: 1,
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
    });

    return problems[0];
  }

  static async leaveRoom(userId, roomCode) {
    const cleanRoomCode = roomCode && roomCode.trim().toUpperCase();

    if (!cleanRoomCode) {
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

    if (!leavingPlayer) {
      const currentRoom = await RoomService.getRoomByCode(cleanRoomCode);
      return {
        deleted: false,
        room: RoomService.serializeRoom(currentRoom),
      };
    }

    await prisma.battleRoomPlayer.delete({
      where: {
        id: leavingPlayer.id,
      },
    });

    const remainingPlayers = room.players.filter((player) => player.userId !== userId);

    if (remainingPlayers.length === 0) {
      await prisma.battleRoom.delete({
        where: {
          id: room.id,
        },
      });

      return {
        deleted: true,
        room: null,
      };
    }

    if (leavingPlayer.isHost) {
      const newHost = remainingPlayers[0];

      await prisma.$transaction([
        prisma.battleRoom.update({
          where: {
            id: room.id,
          },
          data: {
            hostId: newHost.userId,
          },
        }),
        prisma.battleRoomPlayer.update({
          where: {
            id: newHost.id,
          },
          data: {
            isHost: true,
          },
        }),
      ]);
    }

    const updatedRoom = await RoomService.getRoomByCode(cleanRoomCode);

    return {
      deleted: false,
      room: RoomService.serializeRoom(updatedRoom),
    };
  }
}

module.exports = RoomService;
