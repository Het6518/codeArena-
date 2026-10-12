const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const createRateLimiter = require('../middleware/rateLimit');
const {
  createSubmissionHandler,
  getMySubmissionsHandler,
  getSubmissionByIdHandler,
  runCodeHandler,
} = require('../controllers/submissionController');

const router = express.Router();

// Each run/submit fans out to several provider calls, so execution is limited per user.
const executionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user.id,
  message: 'Too many executions, please wait a minute before trying again',
});

router.use(authMiddleware);

router.post('/', executionLimiter, createSubmissionHandler);
router.post('/run', executionLimiter, runCodeHandler);
router.get('/me', getMySubmissionsHandler);
router.get('/:id', getSubmissionByIdHandler);

module.exports = router;
