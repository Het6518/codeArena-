const express = require('express');
const { login, register, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimit');

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later',
});

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route is working!',
  });
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, me);

module.exports = router;
