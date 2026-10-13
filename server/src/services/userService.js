const prisma = require('../config/prisma');
const { getMyBattles } = require('../battle/battleService');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Only players who have finished at least one battle are ranked.
const rankedWhere = {
  OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }, { draws: { gt: 0 } }],
};

const leaderboardSelect = {
  id: true,
  username: true,
  avatar: true,
  rating: true,
  wins: true,
  losses: true,
  draws: true,
};

// Competition ranking: players with equal rating share a rank (1, 2, 2, 4).
const getRankForRating = (rating) => {
  return prisma.user
    .count({
      where: {
        AND: [rankedWhere, { rating: { gt: rating } }],
      },
    })
    .then((higher) => higher + 1);
};

const toLeaderboardEntry = (user, rank) => {
  const games = user.wins + user.losses + user.draws;

  return {
    rank,
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    rating: user.rating,
    wins: user.wins,
    losses: user.losses,
    draws: user.draws,
    games,
    winRate: games ? Math.round((user.wins / games) * 1000) / 10 : 0,
  };
};

const getLeaderboard = async (userId, query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const [users, total, me] = await Promise.all([
    prisma.user.findMany({
      where: rankedWhere,
      orderBy: [{ rating: 'desc' }, { wins: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: leaderboardSelect,
    }),
    prisma.user.count({ where: rankedWhere }),
    prisma.user.findUnique({ where: { id: userId }, select: leaderboardSelect }),
  ]);

  if (!me) {
    throw createHttpError('User not found', 404);
  }

  const distinctRatings = [...new Set(users.map((user) => user.rating))];
  const rankByRating = new Map(
    await Promise.all(distinctRatings.map(async (rating) => [rating, await getRankForRating(rating)]))
  );

  const myGames = me.wins + me.losses + me.draws;

  return {
    entries: users.map((user) => toLeaderboardEntry(user, rankByRating.get(user.rating))),
    me: toLeaderboardEntry(me, myGames ? await getRankForRating(me.rating) : null),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const MAX_HISTORY_POINTS = 100;

/**
 * Rating over time from finished battles (oldest first). The first point is the rating
 * before the first battle, then one point per battle.
 */
const buildRatingHistory = (rows) => {
  const played = rows.filter((row) => row.ratingAfter !== null && row.ratingAfter !== undefined);
  if (!played.length) return [];

  const first = played[0];
  const history = [{ at: first.startedAt || first.finishedAt, rating: first.ratingBefore ?? first.ratingAfter, roomCode: null }];

  for (const row of played) {
    history.push({ at: row.finishedAt, rating: row.ratingAfter, roomCode: row.roomCode });
  }

  return history;
};

// Public view of a player: never includes email or role.
const getPublicProfile = async (username) => {
  if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
    throw createHttpError('Player not found', 404);
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, avatar: true, rating: true, wins: true, losses: true, draws: true, createdAt: true },
  });

  if (!user) {
    throw createHttpError('Player not found', 404);
  }

  const [historyRows, solvedRows, recentBattles] = await Promise.all([
    prisma.battleRoomPlayer.findMany({
      where: { userId: user.id, room: { status: 'FINISHED' } },
      orderBy: { room: { finishedAt: 'desc' } },
      take: MAX_HISTORY_POINTS,
      select: {
        ratingBefore: true,
        ratingAfter: true,
        room: { select: { roomCode: true, startedAt: true, finishedAt: true } },
      },
    }),
    prisma.submission.findMany({
      where: { userId: user.id, status: 'ACCEPTED' },
      distinct: ['problemId'],
      select: { problem: { select: { difficulty: true } } },
    }),
    getMyBattles(user.id, { limit: 10 }),
  ]);

  const solved = { EASY: 0, MEDIUM: 0, HARD: 0, total: solvedRows.length };
  solvedRows.forEach((row) => {
    if (row.problem) solved[row.problem.difficulty] += 1;
  });

  const games = user.wins + user.losses + user.draws;

  return {
    user: {
      ...toLeaderboardEntry(user, games ? await getRankForRating(user.rating) : null),
      joinedAt: user.createdAt,
    },
    ratingHistory: buildRatingHistory(
      historyRows
        .map((row) => ({
          ratingBefore: row.ratingBefore,
          ratingAfter: row.ratingAfter,
          roomCode: row.room.roomCode,
          startedAt: row.room.startedAt,
          finishedAt: row.room.finishedAt,
        }))
        .reverse()
    ),
    solved,
    recentBattles,
  };
};

module.exports = {
  buildRatingHistory,
  getLeaderboard,
  getPublicProfile,
};
