const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildProblem,
  cleanMath,
  extractConstraints,
  getDifficulty,
  isCandidate,
  isJudgeableStatement,
  parseTitle,
  selectTestCases,
} = require('../prisma/lib/codeContests');

const statement = `You have an array a of length n. Find the smallest T.

Input

The first line contains a single integer t (1 ≤ t ≤ 10^{4}) — the number of test cases.

The second line contains n integers a_{1}, …, a_{n} (-10^{9} ≤ a_{i} ≤ 10^{9}).

Output

For each test case, print the minimum number of seconds.

Example

Input


1
3


Output


2

Note

In the first test case the answer is 2.`;

const baseRow = {
  name: '1339_C. Powered Addition',
  source: 2n,
  cf_rating: 1500,
  cf_tags: ['greedy'],
  cf_contest_id: 1339n,
  cf_index: 'C',
  is_description_translated: false,
  input_file: '',
  output_file: '',
  description: statement,
  time_limit: { seconds: 1n, nanos: 0n },
  memory_limit_bytes: 268435456n,
  public_tests: { input: ['1\n3\n'], output: ['2\n'] },
  private_tests: { input: ['1\n4\n', '1\n5\n', '1\n3\n'], output: ['3\n', '3\n', '2\n'] },
  generated_tests: { input: [], output: [] },
};

test('title and difficulty mapping', () => {
  assert.equal(parseTitle('1339_C. Powered Addition'), 'Powered Addition');
  assert.equal(parseTitle('1296_E2. String Coloring (hard version)'), 'String Coloring (hard version)');
  assert.equal(getDifficulty(800), 'EASY');
  assert.equal(getDifficulty(1500), 'MEDIUM');
  assert.equal(getDifficulty(2400), 'HARD');
  assert.equal(getDifficulty(3000), null);
  assert.equal(getDifficulty(0), null);
});

test('candidate pre-filter keeps only plain Codeforces problems', () => {
  assert.ok(isCandidate(baseRow));
  assert.ok(!isCandidate({ ...baseRow, source: 1n }));
  assert.ok(!isCandidate({ ...baseRow, cf_tags: ['interactive'] }));
  assert.ok(!isCandidate({ ...baseRow, cf_tags: ['*special'] }));
  assert.ok(!isCandidate({ ...baseRow, input_file: 'input.txt' }));
});

test('statements needing a checker are rejected', () => {
  assert.ok(isJudgeableStatement(statement));
  assert.ok(!isJudgeableStatement('If there are multiple answers, print any of them.'));
  assert.ok(!isJudgeableStatement('Your answer is accepted if its absolute or relative error does not exceed 1e-6.'));
  assert.ok(!isJudgeableStatement('This is an interactive problem.'));
  assert.ok(!isJudgeableStatement('See the picture <image> below.'));
});

test('math cleanup and constraint extraction', () => {
  assert.equal(cleanMath('a_{1} and 2^{x-1} and 10^{4}'), 'a_1 and 2^(x-1) and 10^4');
  assert.deepEqual(extractConstraints(cleanMath('integer t (1 ≤ t ≤ 10^{4}) and n (1 ≤ n ≤ 2 ⋅ 10^5)')), [
    '1 ≤ t ≤ 10^4',
    '1 ≤ n ≤ 2 ⋅ 10^5',
  ]);
});

test('test selection: samples first, hidden after, deduplicated, size-limited', () => {
  const tests = selectTestCases({
    ...baseRow,
    private_tests: {
      input: ['1\n3\n', 'x'.repeat(30000), '1\n9\n'],
      output: ['2\n', '1\n', 'y'.repeat(2000)],
    },
  });

  // Duplicate of the sample, oversized input and oversized output are all dropped.
  assert.equal(tests.length, 1);
  assert.equal(tests[0].isHidden, false);
});

test('buildProblem produces a judgeable problem with attribution', () => {
  const { problem, testCases, skip } = buildProblem(baseRow);

  assert.equal(skip, undefined);
  assert.equal(problem.title, 'Powered Addition');
  assert.equal(problem.difficulty, 'MEDIUM');
  assert.equal(problem.timeLimitMs, 2000);
  assert.equal(problem.memoryLimitMb, 256);
  assert.equal(problem.sampleInput, '1\n3');
  assert.equal(problem.sampleOutput, '2');
  assert.equal(problem.explanation, 'In the first test case the answer is 2.');
  assert.match(problem.description, /^You have an array/);
  assert.match(problem.description, /\nInput\nThe first line/);
  assert.match(problem.description, /CC BY 4\.0/);
  assert.ok(!problem.description.includes('Example'), 'examples block is removed from the statement');
  assert.match(problem.constraints, /1 ≤ t ≤ 10\^4/);
  assert.deepEqual(
    testCases.map((testCase) => testCase.isHidden),
    [false, true, true]
  );
});

test('buildProblem skips problems without enough tests', () => {
  const { skip } = buildProblem({ ...baseRow, private_tests: { input: [], output: [] } });
  assert.equal(skip, 'not enough usable tests');
});
