const onlineCompilerConfig = require('../../config/onlineCompilerConfig');
const { EXECUTION_STATUSES } = require('../execution.types');
const { getCompilerForLanguage } = require('./onlineCompilerLanguageMap');

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeProviderStatus = (result) => {
  const errorText = String(result.error || '').toLowerCase();
  const signal = result.signal;

  if (signal === 9 || errorText.includes('time limit') || errorText.includes('timeout')) {
    return EXECUTION_STATUSES.TIME_LIMIT_EXCEEDED;
  }

  if (result.status === 'success' && Number(result.exit_code) === 0) {
    return EXECUTION_STATUSES.SUCCESS;
  }

  if (errorText.includes('compile') || errorText.includes('syntax') || errorText.includes('compilation')) {
    return EXECUTION_STATUSES.COMPILATION_ERROR;
  }

  return EXECUTION_STATUSES.RUNTIME_ERROR;
};

const normalizeExecutionResult = (result) => {
  if (!result || typeof result !== 'object') {
    throw createHttpError('Malformed execution provider response', 502);
  }

  return {
    stdout: result.output || '',
    stderr: result.error || '',
    status: normalizeProviderStatus(result),
    exitCode: Number.isFinite(Number(result.exit_code)) ? Number(result.exit_code) : null,
    executionTime: result.time === undefined || result.time === null ? null : Number(result.time),
    memory: result.memory === undefined || result.memory === null ? null : Number(result.memory),
  };
};

const execute = async ({ sourceCode, language, stdin = '' }) => {
  if (!onlineCompilerConfig.apiKey) {
    throw createHttpError('Execution provider is not configured', 500);
  }

  const compiler = getCompilerForLanguage(language);
  const baseUrl = onlineCompilerConfig.baseUrl.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), onlineCompilerConfig.requestTimeoutMs);

  let response;

  try {
    response = await fetch(`${baseUrl}/api/run-code-sync/`, {
      method: 'POST',
      headers: {
        Authorization: onlineCompilerConfig.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compiler,
        code: sourceCode,
        input: stdin,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError('Execution provider request timed out', 504);
    }

    throw createHttpError('Execution provider is unavailable', 503);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw createHttpError('Execution provider authentication failed', 502);
  }

  if (response.status === 429) {
    throw createHttpError('Execution provider rate limit exceeded', 429);
  }

  if (!response.ok) {
    throw createHttpError('Execution provider failed', 502);
  }

  const result = await response.json();
  return normalizeExecutionResult(result);
};

module.exports = {
  execute,
};
