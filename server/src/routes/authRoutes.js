const express = require('express');
const { login, register, me } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route is working!',
  });
});

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);

module.exports = router;
