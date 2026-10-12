const { getLeaderboard } = require('../services/userService');
const { getMyBattles } = require('../battle/battleService');

const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

const getLeaderboardHandler = async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(req.user.id, req.query);

    return res.status(200).json({
      success: true,
      ...leaderboard,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getMyBattlesHandler = async (req, res) => {
  try {
    const battles = await getMyBattles(req.user.id, req.query);

    return res.status(200).json({
      success: true,
      count: battles.length,
      battles,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

module.exports = {
  getLeaderboardHandler,
  getMyBattlesHandler,
};
