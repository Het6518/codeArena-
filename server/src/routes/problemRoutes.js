const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  createProblemHandler,
  deleteProblemHandler,
  getProblemBySlugHandler,
  getProblemsHandler,
  updateProblemHandler,
} = require('../controllers/problemController');
const { getMyProblemSubmissionsHandler } = require('../controllers/submissionController');

const router = express.Router();

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Problem route is working!',
  });
});

router.post('/', createProblemHandler);
router.get('/', getProblemsHandler);
router.get('/:problemId/submissions', authMiddleware, getMyProblemSubmissionsHandler);
router.get('/:slug', getProblemBySlugHandler);
router.put('/:id', updateProblemHandler);
router.delete('/:id', deleteProblemHandler);

module.exports = router;
