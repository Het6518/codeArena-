const express = require('express');
const { register } = require('../controllers/authController');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Auth route is working!',
  });
});

router.post('/register', register);

module.exports = router;
