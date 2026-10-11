// Standard Elo rating. K = 32 is the common choice for small, fast-moving player pools.
const K_FACTOR = 32;
const MIN_RATING = 100;

const expectedScore = (rating, opponentRating) => {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
};

// score: 1 = win, 0.5 = draw, 0 = loss (from playerA's perspective)
const calculateEloChange = (ratingA, ratingB, scoreA) => {
  const expectedA = expectedScore(ratingA, ratingB);
  const deltaA = Math.round(K_FACTOR * (scoreA - expectedA));

  return {
    newRatingA: Math.max(MIN_RATING, ratingA + deltaA),
    newRatingB: Math.max(MIN_RATING, ratingB - deltaA),
  };
};

module.exports = {
  K_FACTOR,
  calculateEloChange,
  expectedScore,
};
