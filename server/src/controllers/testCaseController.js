const {
  createTestCase,
  deleteTestCase,
  getTestCaseById,
  getTestCasesByProblem,
  updateTestCase,
} = require('../services/testCaseService');

const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

const createTestCaseHandler = async (req, res) => {
  try {
    const testCase = await createTestCase(req.params.problemId, req.body);

    return res.status(201).json({
      success: true,
      message: 'Test case created successfully',
      testCase,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getProblemTestCasesHandler = async (req, res) => {
  try {
    const testCases = await getTestCasesByProblem(req.params.problemId);

    return res.status(200).json({
      success: true,
      count: testCases.length,
      testCases,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getTestCaseByIdHandler = async (req, res) => {
  try {
    const testCase = await getTestCaseById(req.params.id);

    return res.status(200).json({
      success: true,
      testCase,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const updateTestCaseHandler = async (req, res) => {
  try {
    const testCase = await updateTestCase(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Test case updated successfully',
      testCase,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const deleteTestCaseHandler = async (req, res) => {
  try {
    await deleteTestCase(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Test case deleted successfully',
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

module.exports = {
  createTestCaseHandler,
  deleteTestCaseHandler,
  getProblemTestCasesHandler,
  getTestCaseByIdHandler,
  updateTestCaseHandler,
};
