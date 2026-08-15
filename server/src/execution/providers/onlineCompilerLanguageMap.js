const COMPILER_MAP = {
  cpp: 'g++-15',
  cplusplus: 'g++-15',
  'c++': 'g++-15',
  c: 'gcc-15',
  python: 'python-3.14',
  python3: 'python-3.14',
  py: 'python-3.14',
  java: 'openjdk-25',
  javascript: 'typescript-deno',
  js: 'typescript-deno',
  typescript: 'typescript-deno',
  ts: 'typescript-deno',
  go: 'go-1.26',
  rust: 'rust-1.93',
};

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getCompilerForLanguage = (language) => {
  if (!language || typeof language !== 'string') {
    throw createHttpError('Language is required', 400);
  }

  const compiler = COMPILER_MAP[language.trim().toLowerCase()];

  if (!compiler) {
    throw createHttpError('Unsupported language', 400);
  }

  return compiler;
};

module.exports = {
  COMPILER_MAP,
  getCompilerForLanguage,
};
