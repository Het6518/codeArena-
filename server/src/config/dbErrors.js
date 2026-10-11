const { Prisma } = require('@prisma/client');

// Connection-level failures (database unreachable, timed out, pool exhausted).
const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024']);

// Subset worth retrying automatically. P2024 (pool timeout) is deliberately excluded:
// it means the pool is already overloaded, and retrying only adds more load.
const RETRYABLE_CONNECTION_CODES = new Set(['P1001', 'P1002', 'P1017']);

const errorCodeOf = (error) => (error ? error.code || error.errorCode : undefined);

const isConnectionError = (error) => {
  return error instanceof Prisma.PrismaClientInitializationError || CONNECTION_ERROR_CODES.has(errorCodeOf(error));
};

const isRetryableConnectionError = (error) => RETRYABLE_CONNECTION_CODES.has(errorCodeOf(error));

module.exports = {
  isConnectionError,
  isRetryableConnectionError,
};
