const prisma = require('../config/prisma');
const RoomService = require('../room/roomService');
const { getIo } = require('../socket/io');
const { calculateEloChange } = require('./rating');
const { determineBattleOutcome, determineTimeoutOutcome, getDeadline, isPastDeadline } = require('./winner');

const SWEEP_INTERVAL_MS = 15000;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const emitBattleResult = (room) => {
  const io = getIo();

  if (!io || !room) {
    return;
  }

  const payload = { success: true, room: RoomService.serializeRoom(room) };
  io.to(room.roomCode).emit('room-update', payload);
  io.to(room.roomCode).emit('battle-end', payload);
};

const emitOpponentActivity = (roomCode, userId, status) => {
  const io = getIo();

  if (io) {
    io.to(roomCode).emit('battle-activity', { userId, status });
  }
};

// Called before a submission is stored, so only real battle participants can submit
// to an active battle, and only for the battle's problem.
const validateBattleSubmission = async (userId, roomCode, problemId) => {
  let cleanRoomCode;

  try {
    cleanRoomCode = RoomService.parseRoomCode(roomCode);
  } catch (error) {
    throw createHttpError(error.message, 400);
  }

  const room = await prisma.battleRoom.findUnique({
    where: { roomCode: cleanRoomCode },
    select: {
      id: true,
      roomCode: true,
      status: true,
      selectedProblemId: true,
      startedAt: true,
      durationMs: true,
      players: { select: { userId: true } },
    },
  });

  if (!room) {
    throw createHttpError('Battle room not found', 404);
  }

  if (room.status === 'IN_PROGRESS' && isPastDeadline(room)) {
    // Close the battle now rather than waiting for the sweeper.
    finalizeExpiredBattle(room.id).catch((error) => console.error('[battle timeout]', error.message));
    throw createHttpError('Time is up for this battle', 409);
  }

  if (!room.players.some((player) => player.userId === userId)) {
    throw createHttpError('You are not a player in this battle', 403);
  }

  if (room.status !== 'IN_PROGRESS') {
    throw createHttpError('This battle is not in progress', 409);
  }

  if (room.selectedProblemId !== problemId) {
    throw createHttpError('Submission problem does not match the battle problem', 400);
  }

  return room;
};

// Marks the battle FINISHED and applies ratings exactly once. The conditional updateMany on
// status = IN_PROGRESS acts as a compare-and-set: concurrent finalizers (two accepted
// submissions, or an accept racing a forfeit) cannot both succeed.
const completeBattle = async ({ roomId, winnerId, endReason, acceptedByUser = {} }) => {
  const finishedAt = new Date();

  const completed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.battleRoom.updateMany({
      where: { id: roomId, status: 'IN_PROGRESS' },
      data: {
        status: 'FINISHED',
        finishedAt,
        winnerId,
        endReason,
      },
    });

    if (count === 0) {
      return false;
    }

    const room = await tx.battleRoom.findUnique({
      where: { id: roomId },
      select: {
        startedAt: true,
        players: {
          orderBy: { joinedAt: 'asc' },
          select: {
            id: true,
            userId: true,
            user: { select: { rating: true } },
          },
        },
      },
    });

    const [playerA, playerB] = room.players;

    if (!playerA || !playerB) {
      return true;
    }

    const scoreA = winnerId === null ? 0.5 : winnerId === playerA.userId ? 1 : 0;
    const { newRatingA, newRatingB } = calculateEloChange(playerA.user.rating, playerB.user.rating, scoreA);
    const outcomes = [
      { player: playerA, newRating: newRatingA, score: scoreA },
      { player: playerB, newRating: newRatingB, score: 1 - scoreA },
    ];

    for (const { player, newRating, score } of outcomes) {
      const accepted = acceptedByUser[player.userId];
      const solvedAt = accepted ? new Date(accepted.createdAt) : null;

      await tx.battleRoomPlayer.update({
        where: { id: player.id },
        data: {
          ratingBefore: player.user.rating,
          ratingAfter: newRating,
          solvedAt,
          solveTimeMs: solvedAt && room.startedAt ? solvedAt.getTime() - room.startedAt.getTime() : null,
        },
      });

      await tx.user.update({
        where: { id: player.userId },
        data: {
          rating: newRating,
          wins: { increment: score === 1 ? 1 : 0 },
          losses: { increment: score === 0 ? 1 : 0 },
          draws: { increment: score === 0.5 ? 1 : 0 },
        },
      });
    }

    return true;
  }, {
    // ~10 sequential round trips; at ~350 ms each the 5 s default timeout is too tight.
    maxWait: 10000,
    timeout: 20000,
  });

  if (!completed) {
    return null;
  }

  const room = await RoomService.getRoomById(roomId);
  emitBattleResult(room);
  return room;
};

// Re-evaluates the battle after any battle submission reaches a final status.
const tryFinalizeBattle = async (roomId) => {
  const room = await prisma.battleRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      players: { select: { userId: true } },
    },
  });

  if (!room || room.status !== 'IN_PROGRESS') {
    return null;
  }

  const submissions = await prisma.submission.findMany({
    where: {
      battleRoomId: roomId,
      userId: { in: room.players.map((player) => player.userId) },
    },
    select: { id: true, userId: true, status: true, createdAt: true },
  });

  const outcome = determineBattleOutcome(submissions);

  if (!outcome.decided) {
    return null;
  }

  return completeBattle({
    roomId,
    winnerId: outcome.winnerId,
    endReason: outcome.draw ? 'DRAW' : 'SOLVED',
    acceptedByUser: outcome.acceptedByUser,
  });
};

const onBattleSubmissionEvaluated = async (submission) => {
  if (!submission.battleRoomId) {
    return null;
  }

  const room = await prisma.battleRoom.findUnique({
    where: { id: submission.battleRoomId },
    select: { roomCode: true },
  });

  if (room) {
    emitOpponentActivity(room.roomCode, submission.userId, submission.status);
  }

  const finished = await tryFinalizeBattle(submission.battleRoomId);
  // A submission judged after the deadline may have been the last thing the timeout waited for.
  return finished || finalizeExpiredBattle(submission.battleRoomId);
};

// Ends a battle whose clock has run out. Submissions received before the deadline still count.
const finalizeExpiredBattle = async (roomId) => {
  const room = await prisma.battleRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      durationMs: true,
      players: { select: { userId: true } },
    },
  });

  if (!room || room.status !== 'IN_PROGRESS' || !isPastDeadline(room)) {
    return null;
  }

  const submissions = await prisma.submission.findMany({
    where: {
      battleRoomId: roomId,
      userId: { in: room.players.map((player) => player.userId) },
    },
    select: { id: true, userId: true, status: true, createdAt: true },
  });

  const outcome = determineTimeoutOutcome(submissions);

  if (!outcome.decided) {
    return null;
  }

  return completeBattle({
    roomId,
    winnerId: outcome.winnerId,
    endReason: outcome.endReason,
    acceptedByUser: outcome.acceptedByUser,
  });
};

// Fires right at the deadline of a battle that just started. The sweeper below covers
// battles that were running when the server restarted.
const scheduleBattleTimeout = (room) => {
  const deadline = getDeadline({
    startedAt: room.startedAt,
    durationMs: room.durationMs,
  });

  if (deadline === null) return;

  setTimeout(async () => {
    try {
      const found = await prisma.battleRoom.findUnique({ where: { roomCode: room.roomCode }, select: { id: true } });
      if (found) await finalizeExpiredBattle(found.id);
    } catch (error) {
      console.error('[battle timeout]', error.message);
    }
  }, Math.max(0, deadline - Date.now()) + 250).unref();
};

const sweepExpiredBattles = async () => {
  const running = await prisma.battleRoom.findMany({
    where: { status: 'IN_PROGRESS' },
    select: { id: true, startedAt: true, durationMs: true },
  });

  for (const room of running.filter((candidate) => isPastDeadline(candidate))) {
    await finalizeExpiredBattle(room.id);
  }
};

let sweeper = null;

const startBattleSweeper = () => {
  if (sweeper) return;
  sweeper = setInterval(() => {
    sweepExpiredBattles().catch((error) => console.error('[battle sweeper]', error.message));
  }, SWEEP_INTERVAL_MS);
  sweeper.unref();
};

// Explicitly leaving an in-progress battle forfeits it; the opponent wins.
const forfeitBattle = async (userId, roomCode) => {
  const cleanRoomCode = RoomService.parseRoomCode(roomCode);
  const room = await prisma.battleRoom.findUnique({
    where: { roomCode: cleanRoomCode },
    select: {
      id: true,
      status: true,
      players: { select: { userId: true } },
    },
  });

  if (!room || room.status !== 'IN_PROGRESS' || !room.players.some((player) => player.userId === userId)) {
    return null;
  }

  const opponent = room.players.find((player) => player.userId !== userId);

  return completeBattle({
    roomId: room.id,
    winnerId: opponent ? opponent.userId : null,
    endReason: 'FORFEIT',
  });
};

const getMyBattles = async (userId, { limit = 10 } = {}) => {
  const take = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 50);

  const rooms = await prisma.battleRoom.findMany({
    where: {
      status: 'FINISHED',
      players: { some: { userId } },
    },
    orderBy: { finishedAt: 'desc' },
    take,
    select: {
      roomCode: true,
      startedAt: true,
      finishedAt: true,
      endReason: true,
      winnerId: true,
      selectedProblem: { select: { title: true, slug: true, difficulty: true } },
      players: {
        select: {
          userId: true,
          solveTimeMs: true,
          ratingBefore: true,
          ratingAfter: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  return rooms.map((room) => {
    const me = room.players.find((player) => player.userId === userId);
    const opponent = room.players.find((player) => player.userId !== userId);
    const result = room.winnerId === null ? 'DRAW' : room.winnerId === userId ? 'WIN' : 'LOSS';

    return {
      roomCode: room.roomCode,
      problem: room.selectedProblem,
      result,
      endReason: room.endReason,
      startedAt: room.startedAt,
      finishedAt: room.finishedAt,
      opponent: opponent ? { username: opponent.user.username } : null,
      solveTimeMs: me ? me.solveTimeMs : null,
      ratingChange: me && me.ratingBefore !== null && me.ratingAfter !== null ? me.ratingAfter - me.ratingBefore : null,
    };
  });
};

module.exports = {
  completeBattle,
  finalizeExpiredBattle,
  forfeitBattle,
  getMyBattles,
  onBattleSubmissionEvaluated,
  scheduleBattleTimeout,
  startBattleSweeper,
  sweepExpiredBattles,
  tryFinalizeBattle,
  validateBattleSubmission,
};
