// Winner rule (server authoritative):
//   The winner is the player whose ACCEPTED submission was *received* by the server first
//   (Submission.createdAt), not whose evaluation happened to finish first. Because evaluation
//   time varies, an accepted result cannot be finalized while the opponent still has a PENDING
//   submission that was received earlier (or at the same millisecond) - it might also pass.
//   Two accepted submissions received in the same millisecond are a draw.
//
// A PENDING submission older than STALE_PENDING_MS is ignored so a crashed evaluation
// can never block a battle forever.
const STALE_PENDING_MS = 5 * 60 * 1000;

const time = (value) => new Date(value).getTime();

const sortByReceivedTime = (submissions) => {
  return [...submissions].sort((a, b) => time(a.createdAt) - time(b.createdAt) || String(a.id).localeCompare(String(b.id)));
};

/**
 * @param {Array<{id, userId, status, createdAt}>} submissions battle submissions from the players
 * @param {number} now current server time in ms
 * @returns {{ decided: false } | { decided: true, draw: boolean, winnerId: string|null, winningSubmission, acceptedByUser: Object }}
 */
const determineBattleOutcome = (submissions, now = Date.now()) => {
  const ordered = sortByReceivedTime(submissions);
  const firstAccepted = ordered.find((submission) => submission.status === 'ACCEPTED');

  if (!firstAccepted) {
    return { decided: false };
  }

  const acceptedAt = time(firstAccepted.createdAt);

  const blockingPending = ordered.some(
    (submission) =>
      submission.status === 'PENDING' &&
      submission.userId !== firstAccepted.userId &&
      time(submission.createdAt) <= acceptedAt &&
      now - time(submission.createdAt) < STALE_PENDING_MS
  );

  if (blockingPending) {
    return { decided: false };
  }

  const tiedOpponent = ordered.find(
    (submission) =>
      submission.status === 'ACCEPTED' &&
      submission.userId !== firstAccepted.userId &&
      time(submission.createdAt) === acceptedAt
  );

  const acceptedByUser = {};
  acceptedByUser[firstAccepted.userId] = firstAccepted;
  if (tiedOpponent) {
    acceptedByUser[tiedOpponent.userId] = tiedOpponent;
  }

  return {
    decided: true,
    draw: Boolean(tiedOpponent),
    winnerId: tiedOpponent ? null : firstAccepted.userId,
    winningSubmission: firstAccepted,
    acceptedByUser,
  };
};

module.exports = {
  STALE_PENDING_MS,
  determineBattleOutcome,
};
