const { isConnectionError } = require('../config/dbErrors');

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Request body must be valid JSON' });
  }

  if (isConnectionError(error)) {
    console.error(`[${req.method} ${req.originalUrl}]`, error.message);
    return res.status(503).json({
      success: false,
      message: 'The database is temporarily unreachable. Please try again in a few seconds.',
    });
  }

  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error.message);
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : error.message,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
