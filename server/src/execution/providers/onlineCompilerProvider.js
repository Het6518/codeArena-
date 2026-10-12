const onlineCompilerConfig = require('../../config/onlineCompilerConfig');
const { EXECUTION_STATUSES } = require('../execution.types');
const { getCompilerForLanguage } = require('./onlineCompilerLanguageMap');

// Provider contract (onlinecompiler.io, POST /api/run-code-sync/):
//   response: { output, error, status: 'success'|'error', exit_code, signal, time (s), total (s), memory (KB) }
//   exit_code 124 => 30s wall-clock timeout, signal 9 / exit 137 => killed (time or memory).
//   output and error are truncated by the provider at 999 characters.
const TIMEOUT_EXIT_CODES = [124, 137];
const COMPILED_COMPILERS = ['g++-15', 'gcc-15', 'openjdk-25', 'go-1.26', 'rust-1.93'];
const RUNTIME_ERROR_MARKERS = /panicked|panic:|exception in thread|segmentation fault|core dumped|traceback|uncaught/i;
const COMPILE_ERROR_MARKERS = /\berror\b|undefined:|cannot find symbol|syntaxerror|compil/i;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProviderStatus = (result, compiler) => {
  const errorText = String(result.error || '');
  const exitCode = toNumberOrNull(result.exit_code);
  const signal = toNumberOrNull(result.signal);

  if (signal === 9 || TIMEOUT_EXIT_CODES.includes(exitCode) || /time limit|timed out|timeout/i.test(errorText)) {
    return EXECUTION_STATUSES.TIME_LIMIT_EXCEEDED;
  }

  if (result.status === 'success' && exitCode === 0) {
    return EXECUTION_STATUSES.SUCCESS;
  }

  const looksLikeRuntimeFailure = RUNTIME_ERROR_MARKERS.test(errorText);
  const isCompiledLanguage = COMPILED_COMPILERS.includes(compiler);

  if (!looksLikeRuntimeFailure && /syntaxerror/i.test(errorText)) {
    return EXECUTION_STATUSES.COMPILATION_ERROR;
  }

  if (isCompiledLanguage && !looksLikeRuntimeFailure && !result.output && COMPILE_ERROR_MARKERS.test(errorText)) {
    return EXECUTION_STATUSES.COMPILATION_ERROR;
  }

  return EXECUTION_STATUSES.RUNTIME_ERROR;
};

const normalizeExecutionResult = (result, compiler) => {
  if (!result || typeof result !== 'object') {
    throw createHttpError('Malformed execution provider response', 502);
  }

  const timeSeconds = toNumberOrNull(result.time);

  return {
    stdout: result.output || '',
    stderr: result.error || '',
    status: normalizeProviderStatus(result, compiler),
    exitCode: toNumberOrNull(result.exit_code),
    executionTimeMs: timeSeconds === null ? null : Math.round(timeSeconds * 1000),
    memoryKb: toNumberOrNull(result.memory),
  };
};

const execute = async ({ sourceCode, language, stdin = '' }) => {
  if (!onlineCompilerConfig.apiKey) {
    throw createHttpError('Execution provider is not configured', 503);
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
    throw createHttpError('Execution provider is busy, please retry in a few seconds', 429);
  }

  if (!response.ok) {
    throw createHttpError('Execution provider failed', 502);
  }

  let result;

  try {
    result = await response.json();
  } catch (error) {
    throw createHttpError('Malformed execution provider response', 502);
  }

  return normalizeExecutionResult(result, compiler);
};

module.exports = {
  execute,
  normalizeExecutionResult,
};
