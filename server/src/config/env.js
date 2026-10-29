const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

// Fail fast on startup instead of failing on the first request that needs the value.
const validateEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL is required in production');
  }

  if (!process.env.ONLINE_COMPILER_API_KEY) {
    console.warn('ONLINE_COMPILER_API_KEY is not set; code execution requests will fail.');
  }
};

// CLIENT_URL may hold a comma separated list of allowed browser origins.
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_URL || DEFAULT_CLIENT_ORIGIN;

  return raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
};

module.exports = {
  getAllowedOrigins,
  validateEnv,
};
