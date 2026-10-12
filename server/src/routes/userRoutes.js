const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { me } = require('../controllers/authController');
const { getLeaderboardHandler, getMyBattlesHandler } = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', me);
router.get('/me/battles', getMyBattlesHandler);
router.get('/leaderboard', getLeaderboardHandler);

module.exports = router;
