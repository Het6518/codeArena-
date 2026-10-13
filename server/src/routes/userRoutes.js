const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { me } = require('../controllers/authController');
const { getLeaderboardHandler, getMyBattlesHandler, getProfileHandler } = require('../controllers/userController');

const router = express.Router();

router.use(authMiddleware);

router.get('/me', me);
router.get('/me/battles', getMyBattlesHandler);
router.get('/leaderboard', getLeaderboardHandler);
// Public profile by handle. Declared last so it never shadows the fixed paths above.
router.get('/:username/profile', getProfileHandler);

module.exports = router;
