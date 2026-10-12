const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = require('../middleware/requireAdmin');
const {
  createTestCaseHandler,
  deleteTestCaseHandler,
  getProblemTestCasesHandler,
  getTestCaseByIdHandler,
  updateTestCaseHandler,
} = require('../controllers/testCaseController');

const router = express.Router({ mergeParams: true }); // merge params is used to access the problemId from the parent route, app.use('/api/problems/:problemId/testcases', testCaseRoutes);

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test case route is working!',
  });
});

// Test cases include hidden inputs and expected outputs, so every route is admin-only.
// Ordinary users receive public samples through GET /api/problems/:slug instead.
router.use(authMiddleware, requireAdmin);

router.post('/', createTestCaseHandler);
router.get('/', getProblemTestCasesHandler);
router.get('/:id', getTestCaseByIdHandler);
router.put('/:id', updateTestCaseHandler);
router.delete('/:id', deleteTestCaseHandler);

module.exports = router;
