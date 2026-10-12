const onlineCompilerConfig = require('../config/onlineCompilerConfig');
const onlineCompilerProvider = require('./providers/onlineCompilerProvider');
const { EXECUTION_STATUSES } = require('./execution.types');

const MAX_ERROR_MESSAGE_LENGTH = 2000;

const normalizeOutput = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
// normalize all the line endings to \n, trim trailing whitespace from each line, and trim leading/trailing whitespace from the entire output even the non sense hirepro DONT HAVE IT.
  return String(value)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

const compareOutputs = (actualOutput, expectedOutput) => {
  return normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);
};

const truncate = (value) => {
  const text = String(value || '');
  return text.length > MAX_ERROR_MESSAGE_LENGTH ? `${text.slice(0, MAX_ERROR_MESSAGE_LENGTH)}...` : text;
};

const mapExecutionStatusToSubmissionStatus = (executionStatus) => {
  if (executionStatus === EXECUTION_STATUSES.COMPILATION_ERROR) {
    return 'COMPILATION_ERROR';
  }

  if (executionStatus === EXECUTION_STATUSES.TIME_LIMIT_EXCEEDED) {
    return 'TIME_LIMIT_EXCEEDED';
  }

  if (executionStatus === EXECUTION_STATUSES.RUNTIME_ERROR) {
    return 'RUNTIME_ERROR';
  }

  return 'WRONG_ANSWER';
};

// Runs one test case and converts the provider result into a verdict. Provider/infrastructure
// failures are thrown (never turned into a verdict) so callers can report them separately.
const executeOneTestCase = async ({ sourceCode, language, testCase, timeLimitMs, provider = onlineCompilerProvider }) => {
  const result = await provider.execute({
    sourceCode,
    language,
    stdin: testCase.input,
  });

  if (result.status !== EXECUTION_STATUSES.SUCCESS) {
    return {
      passed: false,
      verdict: mapExecutionStatusToSubmissionStatus(result.status),
      execution: result,
      testCaseId: testCase.id,
    };
  }

  if (timeLimitMs && result.executionTimeMs !== null && result.executionTimeMs > timeLimitMs) {
    return {
      passed: false,
      verdict: 'TIME_LIMIT_EXCEEDED',
      execution: result,
      testCaseId: testCase.id,
    };
  }

  const passed = compareOutputs(result.stdout, testCase.expectedOutput);

  return {
    passed,
    verdict: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    execution: result,
    testCaseId: testCase.id,
  };
};

// Builds a user facing message without exposing hidden test data. Output printed by user code
// on a hidden test (stdout or stderr) could echo the hidden input, so it is withheld.
const buildFailureMessage = (result, testNumber, isHidden) => {
  const label = isHidden ? `hidden test case ${testNumber}` : `test case ${testNumber}`;

  switch (result.verdict) {
    case 'COMPILATION_ERROR':
      return truncate(result.execution.stderr || 'Compilation failed');
    case 'RUNTIME_ERROR':
      return isHidden
        ? `Runtime error on ${label}`
        : truncate(`Runtime error on ${label}\n${result.execution.stderr || ''}`.trim());
    case 'TIME_LIMIT_EXCEEDED':
      return `Time limit exceeded on ${label}`;
    default:
      return `Wrong answer on ${label}`;
  }
};

const evaluateSubmissionAgainstTestCases = async ({
  sourceCode,
  language,
  testCases,
  timeLimitMs,
  provider = onlineCompilerProvider,
}) => {
  const selectedTestCases = testCases.slice(0, onlineCompilerConfig.maxTestCasesPerProblem);
  let passedTestCases = 0;
  let executionTimeMs = null;
  let memoryKb = null;

  for (const [index, testCase] of selectedTestCases.entries()) {
    const result = await executeOneTestCase({
      sourceCode,
      language,
      testCase,
      timeLimitMs,
      provider,
    });

    if (result.execution.executionTimeMs !== null) {
      executionTimeMs = Math.max(executionTimeMs || 0, result.execution.executionTimeMs);
    }

    if (result.execution.memoryKb !== null) {
      memoryKb = Math.max(memoryKb || 0, result.execution.memoryKb);
    }

    if (!result.passed) {
      return {
        status: result.verdict,
        passedTestCases,
        totalTestCases: selectedTestCases.length,
        executionTimeMs,
        memoryKb,
        errorMessage: buildFailureMessage(result, index + 1, Boolean(testCase.isHidden)),
      };
    }

    passedTestCases += 1;
  }

  return {
    status: 'ACCEPTED',
    passedTestCases,
    totalTestCases: selectedTestCases.length,
    executionTimeMs,
    memoryKb,
    errorMessage: null,
  };
};

// "Run" executes only public sample test cases and returns full per-case detail, since the
// inputs and expected outputs are already visible to the user.
const runAgainstSampleTestCases = async ({
  sourceCode,
  language,
  testCases,
  timeLimitMs,
  provider = onlineCompilerProvider,
}) => {
  const results = [];

  for (const testCase of testCases) {
    const result = await executeOneTestCase({
      sourceCode,
      language,
      testCase,
      timeLimitMs,
      provider,
    });

    results.push({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: result.execution.stdout,
      stderr: truncate(result.execution.stderr),
      status: result.verdict,
      passed: result.passed,
      executionTimeMs: result.execution.executionTimeMs,
      memoryKb: result.execution.memoryKb,
    });

    // A compilation error is identical for every case, so stop after the first one.
    if (result.verdict === 'COMPILATION_ERROR') {
      break;
    }
  }

  const firstFailure = results.find((result) => !result.passed);

  return {
    status: firstFailure ? firstFailure.status : 'ACCEPTED',
    passedTestCases: results.filter((result) => result.passed).length,
    totalTestCases: testCases.length,
    results,
  };
};

module.exports = {
  compareOutputs,
  evaluateSubmissionAgainstTestCases,
  executeOneTestCase,
  normalizeOutput,
  runAgainstSampleTestCases,
};
