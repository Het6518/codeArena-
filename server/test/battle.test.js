const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateEloChange, expectedScore } = require('../src/battle/rating');
const { STALE_PENDING_MS, determineBattleOutcome } = require('../src/battle/winner');

const at = (ms) => new Date(1_700_000_000_000 + ms);
const NOW = at(60_000).getTime();

test('elo: equal ratings move by K/2 and are zero-sum', () => {
  assert.equal(expectedScore(1200, 1200), 0.5);
  assert.deepEqual(calculateEloChange(1200, 1200, 1), { newRatingA: 1216, newRatingB: 1184 });
  assert.deepEqual(calculateEloChange(1200, 1200, 0.5), { newRatingA: 1200, newRatingB: 1200 });
});

test('elo: an upset gains more than an expected win', () => {
  const upset = calculateEloChange(1000, 1400, 1).newRatingA - 1000;
  const expected = calculateEloChange(1400, 1000, 1).newRatingA - 1400;
  assert.ok(upset > expected);
});

test('winner: undecided without any accepted submission', () => {
  const outcome = determineBattleOutcome([{ id: 'a', userId: 'A', status: 'WRONG_ANSWER', createdAt: at(1000) }], NOW);
  assert.equal(outcome.decided, false);
});

test('winner: earliest received accepted submission wins, not earliest finished', () => {
  // B's evaluation might finish first, but A's submission was received first.
  const outcome = determineBattleOutcome(
    [
      { id: 'b1', userId: 'B', status: 'ACCEPTED', createdAt: at(2000) },
      { id: 'a1', userId: 'A', status: 'ACCEPTED', createdAt: at(1000) },
    ],
    NOW
  );
  assert.equal(outcome.decided, true);
  assert.equal(outcome.winnerId, 'A');
  assert.equal(outcome.draw, false);
});

test('winner: waits while the opponent has an earlier pending submission', () => {
  const submissions = [
    { id: 'a1', userId: 'A', status: 'PENDING', createdAt: at(1000) },
    { id: 'b1', userId: 'B', status: 'ACCEPTED', createdAt: at(2000) },
  ];
  assert.equal(determineBattleOutcome(submissions, NOW).decided, false);

  submissions[0].status = 'WRONG_ANSWER';
  const outcome = determineBattleOutcome(submissions, NOW);
  assert.equal(outcome.decided, true);
  assert.equal(outcome.winnerId, 'B');
});

test('winner: a later pending submission does not block', () => {
  const outcome = determineBattleOutcome(
    [
      { id: 'a1', userId: 'A', status: 'ACCEPTED', createdAt: at(1000) },
      { id: 'b1', userId: 'B', status: 'PENDING', createdAt: at(1500) },
    ],
    NOW
  );
  assert.equal(outcome.winnerId, 'A');
});

test('winner: stale pending submissions are ignored', () => {
  const outcome = determineBattleOutcome(
    [
      { id: 'a1', userId: 'A', status: 'PENDING', createdAt: at(1000) },
      { id: 'b1', userId: 'B', status: 'ACCEPTED', createdAt: at(2000) },
    ],
    at(1000 + STALE_PENDING_MS + 1).getTime()
  );
  assert.equal(outcome.winnerId, 'B');
});

test('winner: same-millisecond accepted submissions are a draw', () => {
  const outcome = determineBattleOutcome(
    [
      { id: 'a1', userId: 'A', status: 'ACCEPTED', createdAt: at(1000) },
      { id: 'b1', userId: 'B', status: 'ACCEPTED', createdAt: at(1000) },
    ],
    NOW
  );
  assert.equal(outcome.draw, true);
  assert.equal(outcome.winnerId, null);
  assert.deepEqual(Object.keys(outcome.acceptedByUser).sort(), ['A', 'B']);
});
