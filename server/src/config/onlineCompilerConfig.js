const onlineCompilerConfig = {
  baseUrl: process.env.ONLINE_COMPILER_BASE_URL || 'https://api.onlinecompiler.io',
  apiKey: process.env.ONLINE_COMPILER_API_KEY || '',
  requestTimeoutMs: Number(process.env.ONLINE_COMPILER_TIMEOUT_MS) || 35000,
  maxTestCasesPerProblem: 6,
};

module.exports = onlineCompilerConfig;
