process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BATTLE_DURATION_MS,
  STALE_PENDING_MS,
  determineTimeoutOutcome,
  getDeadline,
  isPastDeadline,
} = require('../src/battle/winner');
const RoomService = require('../src/room/roomService');
const { buildRatingHistory } = require('../src/services/userService');

const START = new Date('2026-10-12T10:00:00.000Z');
const at = (ms) => new Date(START.getTime() + ms);

test('battles last 30 minutes from the server start time', () => {
  const room = { startedAt: START, durationMs: BATTLE_DURATION_MS };
  assert.equal(getDeadline(room), START.getTime() + 30 * 60 * 1000);
  assert.equal(isPastDeadline(room, START.getTime() + BATTLE_DURATION_MS - 1), false);
  assert.equal(isPastDeadline(room, START.getTime() + BATTLE_DURATION_MS), true);
  assert.equal(isPastDeadline({ startedAt: null }, Date.now()), false, 'lobbies never expire');
});

test('timeout with no accepted submission is a draw', () => {
  const outcome = determineTimeoutOutcome(
    [{ id: 'a1', userId: 'A', status: 'WRONG_ANSWER', createdAt: at(1000) }],
    START.getTime() + BATTLE_DURATION_MS + 1
  );
  assert.deepEqual(
    { decided: outcome.decided, winnerId: outcome.winnerId, endReason: outcome.endReason },
    { decided: true, winnerId: null, endReason: 'TIMEOUT' }
  );
});

test('timeout still honours an accepted submission received before the deadline', () => {
  const outcome = determineTimeoutOutcome(
    [{ id: 'b1', userId: 'B', status: 'ACCEPTED', createdAt: at(BATTLE_DURATION_MS - 500) }],
    START.getTime() + BATTLE_DURATION_MS + 1
  );
  assert.equal(outcome.winnerId, 'B');
  assert.equal(outcome.endReason, 'SOLVED');
});

test('timeout waits for a submission that is still being judged', () => {
  const now = START.getTime() + BATTLE_DURATION_MS + 1;
  const pending = [{ id: 'a1', userId: 'A', status: 'PENDING', createdAt: at(BATTLE_DURATION_MS - 2000) }];

  assert.equal(determineTimeoutOutcome(pending, now).decided, false);
  assert.equal(
    determineTimeoutOutcome(pending, now + STALE_PENDING_MS).endReason,
    'TIMEOUT',
    'a stuck evaluation cannot hold the battle open forever'
  );
});

test('difficulty parsing accepts Random and the three levels only', () => {
  assert.equal(RoomService.parseDifficulty(undefined), null);
  assert.equal(RoomService.parseDifficulty('RANDOM'), null);
  assert.equal(RoomService.parseDifficulty('medium'), 'MEDIUM');
  assert.throws(() => RoomService.parseDifficulty('EXTREME'), /Difficulty/);
  assert.throws(() => RoomService.parseDifficulty({ $ne: null }), /Difficulty/);
});

test('rating history starts from the pre-battle rating and adds one point per battle', () => {
  const history = buildRatingHistory([
    { roomCode: 'AAAAAA', ratingBefore: 1200, ratingAfter: 1216, startedAt: at(0), finishedAt: at(60000) },
    { roomCode: 'BBBBBB', ratingBefore: 1216, ratingAfter: 1201, startedAt: at(120000), finishedAt: at(180000) },
  ]);

  assert.deepEqual(
    history.map((point) => point.rating),
    [1200, 1216, 1201]
  );
  assert.equal(history[0].roomCode, null);
  assert.equal(history[2].roomCode, 'BBBBBB');
  assert.deepEqual(buildRatingHistory([]), []);
});
