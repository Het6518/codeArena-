const express = require('express');
const { login, register } = require('../controllers/authController');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route is working!',
  });
});

router.post('/register', register);
router.post('/login', login);

module.exports = router;
