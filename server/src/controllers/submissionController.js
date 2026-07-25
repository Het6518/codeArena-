const {
  createSubmission,
  getMyProblemSubmissions,
  getMySubmissions,
  getSubmissionById,
} = require('../services/submissionService');

const sendErrorResponse = (res, error) => {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

const createSubmissionHandler = async (req, res) => {
  try {
    const submission = await createSubmission(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      submission,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getSubmissionByIdHandler = async (req, res) => {
  try {
    const submission = await getSubmissionById(req.user.id, req.params.id);

    return res.status(200).json({
      success: true,
      submission,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getMySubmissionsHandler = async (req, res) => {
  try {
    const result = await getMySubmissions(req.user.id, req.query);

    return res.status(200).json({
      success: true,
      count: result.submissions.length,
      pagination: result.pagination,
      submissions: result.submissions,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

const getMyProblemSubmissionsHandler = async (req, res) => {
  try {
    const submissions = await getMyProblemSubmissions(req.user.id, req.params.problemId);

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    return sendErrorResponse(res, error);
  }
};

module.exports = {
  createSubmissionHandler,
  getMyProblemSubmissionsHandler,
  getMySubmissionsHandler,
  getSubmissionByIdHandler,
};
