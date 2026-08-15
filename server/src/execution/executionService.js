const onlineCompilerConfig = require('../config/onlineCompilerConfig');
const onlineCompilerProvider = require('./providers/onlineCompilerProvider');
const { EXECUTION_STATUSES } = require('./execution.types');

const normalizeOutput = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
// normalize all the line endings to \n, trim trailing whitespace from each line, and trim leading/trailing whitespace from the entire output even the non sense hirepro DONT HAVE IT.
  return String(value)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
};

const compareOutputs = (actualOutput, expectedOutput) => {
  return normalizeOutput(actualOutput) === normalizeOutput(expectedOutput);
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

const executeOneTestCase = async ({ sourceCode, language, testCase }) => {
  const result = await onlineCompilerProvider.execute({
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

  const passed = compareOutputs(result.stdout, testCase.expectedOutput);

  return {
    passed,
    verdict: passed ? 'ACCEPTED' : 'WRONG_ANSWER',
    execution: result,
    testCaseId: testCase.id,
  };
};

const evaluateSubmissionAgainstTestCases = async ({ sourceCode, language, testCases }) => {
  const selectedTestCases = testCases.slice(0, onlineCompilerConfig.maxTestCasesPerProblem);

  for (const testCase of selectedTestCases) {
    const result = await executeOneTestCase({
      sourceCode,
      language,
      testCase,
    });

    if (!result.passed) {
      return result.verdict;
    }
  }

  return 'ACCEPTED';
};

module.exports = {
  compareOutputs,
  evaluateSubmissionAgainstTestCases,
  executeOneTestCase,
  normalizeOutput,
};
