const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createSubmissionHandler,
  getMySubmissionsHandler,
  getSubmissionByIdHandler,
} = require('../controllers/submissionController');

const router = express.Router();

router.use(authMiddleware);

router.post('/', createSubmissionHandler);
router.get('/me', getMySubmissionsHandler);
router.get('/:id', getSubmissionByIdHandler);

module.exports = router;
