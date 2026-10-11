const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compareOutputs,
  evaluateSubmissionAgainstTestCases,
  normalizeOutput,
  runAgainstSampleTestCases,
} = require('../src/execution/executionService');
const { normalizeExecutionResult } = require('../src/execution/providers/onlineCompilerProvider');
const { getCompilerForLanguage } = require('../src/execution/providers/onlineCompilerLanguageMap');

const ok = (stdout, extra = {}) => ({
  stdout,
  stderr: '',
  status: 'SUCCESS',
  exitCode: 0,
  executionTimeMs: 10,
  memoryKb: 1000,
  ...extra,
});

// A fake provider that answers each stdin with a scripted result.
const scriptedProvider = (handler) => ({
  calls: 0,
  async execute({ stdin }) {
    this.calls += 1;
    return handler(stdin, this.calls);
  },
});

const testCases = [
  { id: 't1', input: '2 3', expectedOutput: '5', isHidden: false },
  { id: 't2', input: '10 -4', expectedOutput: '6', isHidden: false },
  { id: 't3', input: 'SECRET 1', expectedOutput: '42', isHidden: true },
];

test('normalizeOutput handles CRLF, trailing spaces and trailing newlines', () => {
  assert.equal(normalizeOutput('1 2  \r\n3\r\n\r\n'), '1 2\n3');
  assert.equal(normalizeOutput(null), '');
  assert.ok(compareOutputs('5\n', '5'));
  assert.ok(!compareOutputs('5 6', '5\n6'));
});

test('accepted when every test case matches', async () => {
  const answers = { '2 3': '5', '10 -4': '6', 'SECRET 1': '42\n' };
  const provider = scriptedProvider((stdin) => ok(answers[stdin]));

  const result = await evaluateSubmissionAgainstTestCases({ sourceCode: 'x', language: 'python', testCases, provider });

  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.passedTestCases, 3);
  assert.equal(result.totalTestCases, 3);
  assert.equal(result.errorMessage, null);
});

test('wrong answer stops at the first failing test', async () => {
  const provider = scriptedProvider(() => ok('wrong'));

  const result = await evaluateSubmissionAgainstTestCases({ sourceCode: 'x', language: 'python', testCases, provider });

  assert.equal(result.status, 'WRONG_ANSWER');
  assert.equal(result.passedTestCases, 0);
  assert.equal(provider.calls, 1);
  assert.equal(result.errorMessage, 'Wrong answer on test case 1');
});

test('runtime error output on a hidden test is not exposed', async () => {
  const answers = { '2 3': '5', '10 -4': '6' };
  const provider = scriptedProvider((stdin) =>
    answers[stdin] ? ok(answers[stdin]) : { ...ok(''), status: 'RUNTIME_ERROR', stderr: `crash while reading ${stdin}` }
  );

  const result = await evaluateSubmissionAgainstTestCases({ sourceCode: 'x', language: 'python', testCases, provider });

  assert.equal(result.status, 'RUNTIME_ERROR');
  assert.equal(result.passedTestCases, 2);
  assert.equal(result.errorMessage, 'Runtime error on hidden test case 3');
  assert.ok(!result.errorMessage.includes('SECRET'));
});

test('compilation error returns compiler output', async () => {
  const provider = scriptedProvider(() => ({ ...ok(''), status: 'COMPILATION_ERROR', stderr: 'main.cpp:1: error: x' }));

  const result = await evaluateSubmissionAgainstTestCases({ sourceCode: 'x', language: 'cpp', testCases, provider });

  assert.equal(result.status, 'COMPILATION_ERROR');
  assert.match(result.errorMessage, /error: x/);
});

test('exceeding the problem time limit is a TLE even if output is correct', async () => {
  const provider = scriptedProvider(() => ok('5', { executionTimeMs: 3000 }));

  const result = await evaluateSubmissionAgainstTestCases({
    sourceCode: 'x',
    language: 'python',
    testCases,
    timeLimitMs: 2000,
    provider,
  });

  assert.equal(result.status, 'TIME_LIMIT_EXCEEDED');
});

test('provider failures are thrown, never turned into a verdict', async () => {
  const provider = scriptedProvider(() => {
    const error = new Error('Execution provider is unavailable');
    error.statusCode = 503;
    throw error;
  });

  await assert.rejects(
    evaluateSubmissionAgainstTestCases({ sourceCode: 'x', language: 'python', testCases, provider }),
    (error) => error.statusCode === 503
  );
});

test('run returns per-case detail for sample tests', async () => {
  const provider = scriptedProvider((stdin) => ok(stdin === '2 3' ? '5' : '0'));

  const result = await runAgainstSampleTestCases({
    sourceCode: 'x',
    language: 'python',
    testCases: testCases.slice(0, 2),
    provider,
  });

  assert.equal(result.status, 'WRONG_ANSWER');
  assert.equal(result.passedTestCases, 1);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[1].actualOutput, '0');
});

test('provider response normalization follows the onlinecompiler.io contract', () => {
  const success = normalizeExecutionResult({ output: '5\n', error: '', status: 'success', exit_code: 0, signal: null, time: '0.0248', memory: '8192' }, 'python-3.14');
  assert.equal(success.status, 'SUCCESS');
  assert.equal(success.executionTimeMs, 25);
  assert.equal(success.memoryKb, 8192);

  assert.equal(normalizeExecutionResult({ status: 'error', exit_code: 124, signal: null }, 'python-3.14').status, 'TIME_LIMIT_EXCEEDED');
  assert.equal(normalizeExecutionResult({ status: 'error', exit_code: 137, signal: 9 }, 'g++-15').status, 'TIME_LIMIT_EXCEEDED');
  assert.equal(
    normalizeExecutionResult({ output: '', error: 'main.cpp:3:5: error: expected ;', status: 'error', exit_code: 1 }, 'g++-15').status,
    'COMPILATION_ERROR'
  );
  assert.equal(
    normalizeExecutionResult({ output: '', error: '  File "main.py", line 1\nSyntaxError: invalid syntax', status: 'error', exit_code: 1 }, 'python-3.14').status,
    'COMPILATION_ERROR'
  );
  assert.equal(
    normalizeExecutionResult({ output: '', error: 'Traceback...\nZeroDivisionError', status: 'error', exit_code: 1 }, 'python-3.14').status,
    'RUNTIME_ERROR'
  );
  assert.equal(
    normalizeExecutionResult({ output: '', error: "thread 'main' panicked at src/main.rs", status: 'error', exit_code: 101 }, 'rust-1.93').status,
    'RUNTIME_ERROR'
  );
  assert.throws(() => normalizeExecutionResult(null, 'python-3.14'), (error) => error.statusCode === 502);
});

test('language map rejects unsupported languages', () => {
  assert.equal(getCompilerForLanguage('Python'), 'python-3.14');
  assert.equal(getCompilerForLanguage('cpp'), 'g++-15');
  assert.throws(() => getCompilerForLanguage('cobol'), (error) => error.statusCode === 400);
});
