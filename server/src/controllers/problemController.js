const {
  createProblem,
  deleteProblem,
  getProblemBySlug,
  getProblems,
  updateProblem,
} = require('../services/problemService');

const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

const createProblemHandler = async (req, res) => {
  try {
    const problem = await createProblem(req.body);

    return res.status(201).json({
      success: true,
      message: 'Problem created successfully',
      problem,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getProblemsHandler = async (req, res) => {
  try {
    const problems = await getProblems();

    return res.status(200).json({
      success: true,
      count: problems.length,
      problems,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getProblemBySlugHandler = async (req, res) => {
  try {
    const problem = await getProblemBySlug(req.params.slug);

    return res.status(200).json({
      success: true,
      problem,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const updateProblemHandler = async (req, res) => {
  try {
    const problem = await updateProblem(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Problem updated successfully',
      problem,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const deleteProblemHandler = async (req, res) => {
  try {
    await deleteProblem(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Problem deleted successfully',
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

module.exports = {
  createProblemHandler,
  deleteProblemHandler,
  getProblemBySlugHandler,
  getProblemsHandler,
  updateProblemHandler,
};
