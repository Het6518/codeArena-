// Pure helpers that turn a DeepMind CodeContests row into a CodeArena problem.
// No network or database access here, so the rules are unit-testable.

const MAX_TESTS = 6; // matches onlineCompilerConfig.maxTestCasesPerProblem
const MAX_PUBLIC_TESTS = 2;
const MAX_INPUT_CHARS = 20000;
const MAX_OUTPUT_CHARS = 900; // provider truncates stdout at 999 characters
const MAX_DESCRIPTION_CHARS = 6000;

const CODEFORCES_SOURCE = 2;
const EXCLUDED_TAGS = ['interactive', '*special'];

// Statements whose answer is not unique, needs float tolerance, needs interaction, or
// depends on an image cannot be judged by exact output comparison.
const UNJUDGEABLE_PATTERNS = [
  /\bprint any\b/i,
  /\boutput any\b/i,
  /\bany of them\b/i,
  /\bany one of them\b/i,
  /\bif there are (several|multiple|many)\b/i,
  /\bif there (is|are) more than one\b/i,
  /\bany (valid|possible|such|correct|suitable|optimal)\b/i,
  /\babsolute or relative error\b/i,
  /\brelative or absolute error\b/i,
  /\babsolute error\b/i,
  /\bin (any|arbitrary) order\b/i,
  /\bany (answer|solution|way|of the)\b/i,
  /\b(several|multiple|many) (possible )?(answers|solutions)\b/i,
  /\bmore than one (answer|solution)\b/i,
  /\byou (may|can) (print|output)\b/i,
  /\binteract/i,
  /\bflush\b/i,
  /<image>/i,
];

const DIFFICULTY_BUCKETS = [
  { difficulty: 'EASY', min: 800, max: 1200 },
  { difficulty: 'MEDIUM', min: 1300, max: 1800 },
  { difficulty: 'HARD', min: 1900, max: 2400 },
];

const toNumber = (value) => (typeof value === 'bigint' ? Number(value) : Number(value || 0));

const getDifficulty = (cfRating) => {
  const bucket = DIFFICULTY_BUCKETS.find(({ min, max }) => cfRating >= min && cfRating <= max);
  return bucket ? bucket.difficulty : null;
};

// Cheap pre-filter on the light columns, before downloading statements and tests.
const isCandidate = (row) => {
  return (
    toNumber(row.source) === CODEFORCES_SOURCE &&
    getDifficulty(toNumber(row.cf_rating)) !== null &&
    !row.is_description_translated &&
    !row.input_file &&
    !row.output_file &&
    !(row.cf_tags || []).some((tag) => EXCLUDED_TAGS.includes(tag))
  );
};

const isJudgeableStatement = (description) => {
  return Boolean(description) && !UNJUDGEABLE_PATTERNS.some((pattern) => pattern.test(description));
};

// "1339_C. Powered Addition" -> "Powered Addition"
const parseTitle = (name) => {
  const match = /^\d+_[A-Z]\d?\.\s*(.+)$/.exec(name || '');
  return (match ? match[1] : name || '').trim();
};

// Turns TeX-like fragments into readable plain text: a_{1} -> a_1, 2^{x-1} -> 2^(x-1).
const cleanMath = (text) => {
  return text
    .replace(/\$\$\$/g, '')
    .replace(/([_^])\{([A-Za-z0-9]+)\}/g, '$1$2')
    .replace(/([_^])\{([^{}]{1,30})\}/g, '$1($2)')
    .replace(/\\le(q)?\b/g, '≤')
    .replace(/\\ge(q)?\b/g, '≥')
    .replace(/\\ne(q)?\b/g, '≠')
    .replace(/\\cdot\b/g, '⋅')
    .replace(/\\times\b/g, '×')
    .replace(/\\l?dots\b/g, '…')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Codeforces statements are laid out as: legend, "Input", "Output", "Example(s)", "Note".
const SECTION_HEADERS = ['Input', 'Output', 'Examples', 'Example', 'Note'];

const splitSections = (description) => {
  const sections = { legend: [] };
  let current = 'legend';

  for (const line of description.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim();

    // Within the examples block "Input"/"Output" label sample data; stay in examples.
    if (SECTION_HEADERS.includes(trimmed) && !(current === 'examples' && (trimmed === 'Input' || trimmed === 'Output'))) {
      const key = trimmed.startsWith('Example') ? 'examples' : trimmed.toLowerCase();
      if (!sections[key]) {
        current = key;
        sections[key] = [];
        continue;
      }
    }

    sections[current].push(line);
  }

  const result = {};
  for (const [key, lines] of Object.entries(sections)) {
    result[key] = lines.join('\n').trim();
  }
  return result;
};

// Pulls bounds such as "(1 ≤ n ≤ 2 ⋅ 10^5)" out of the input section.
const extractConstraints = (inputSection) => {
  const found = [];
  const pattern = /\(([^()]*[≤≥<>][^()]*)\)/g;
  let match;

  while ((match = pattern.exec(inputSection)) !== null) {
    const constraint = match[1].replace(/\s+/g, ' ').trim();
    if (constraint.length <= 120 && !found.includes(constraint)) {
      found.push(constraint);
    }
  }

  return found.slice(0, 8);
};

const pairs = (tests) => {
  if (!tests || !Array.isArray(tests.input)) return [];
  return tests.input.map((input, index) => ({ input, output: tests.output[index] }));
};

const isUsableTest = ({ input, output }) => {
  return (
    typeof input === 'string' &&
    typeof output === 'string' &&
    input.length <= MAX_INPUT_CHARS &&
    output.trim().length > 0 &&
    output.length <= MAX_OUTPUT_CHARS
  );
};

// Multiple-answer problems almost always print a construction (edge lists, sequences,
// colorings); unique-answer problems print one value per line. Requiring one token per line
// filters checker-based problems far more reliably than wording. Decimal values are
// rejected too, since they usually come with an error tolerance.
const hasExactScalarOutputs = (testCases) => {
  return testCases.every(({ expectedOutput }) =>
    expectedOutput
      .trim()
      .split(/\r?\n/)
      .every((line) => {
        const tokens = line.trim().split(/\s+/);
        return tokens.length === 1 && !/^-?\d+\.\d+$/.test(tokens[0]);
      })
  );
};

// First public tests become visible samples; hidden tests come from the official private
// tests, then the dataset's generated tests. Duplicate inputs are skipped.
const selectTestCases = (row) => {
  const seenInputs = new Set();
  const take = (candidates, limit, isHidden, into) => {
    for (const test of candidates) {
      if (into.length >= MAX_TESTS || limit <= 0) break;
      const key = test.input.trim();
      if (!isUsableTest(test) || seenInputs.has(key)) continue;
      seenInputs.add(key);
      into.push({ input: test.input, expectedOutput: test.output, isHidden });
      limit -= 1;
    }
  };

  const selected = [];
  take(pairs(row.public_tests), MAX_PUBLIC_TESTS, false, selected);
  take(pairs(row.private_tests), MAX_TESTS, true, selected);
  take(pairs(row.generated_tests), MAX_TESTS, true, selected);
  return selected;
};

/**
 * Builds problem data (without a unique title/slug check) or returns { skip: reason }.
 */
const buildProblem = (row) => {
  const difficulty = getDifficulty(toNumber(row.cf_rating));
  if (!difficulty) return { skip: 'rating out of range' };

  if (!isJudgeableStatement(row.description)) return { skip: 'answer not uniquely judgeable' };

  const description = cleanMath(row.description);
  if (description.length > MAX_DESCRIPTION_CHARS) return { skip: 'statement too long' };

  const sections = splitSections(description);
  if (!sections.legend || !sections.input || !sections.output) return { skip: 'statement sections missing' };

  const testCases = selectTestCases(row);
  const samples = testCases.filter((test) => !test.isHidden);
  const hidden = testCases.filter((test) => test.isHidden);
  if (samples.length === 0 || hidden.length === 0 || testCases.length < 3) {
    return { skip: 'not enough usable tests' };
  }

  if (!hasExactScalarOutputs(testCases)) {
    return { skip: 'output may need a checker' };
  }

  const contestRef = `${toNumber(row.cf_contest_id)}${row.cf_index || ''}`;
  const timeLimit = row.time_limit || {};
  const cfTimeLimitMs = toNumber(timeLimit.seconds) * 1000 + Math.round(toNumber(timeLimit.nanos) / 1e6);
  const memoryLimitMb = Math.round(toNumber(row.memory_limit_bytes) / (1024 * 1024)) || 256;
  const timeLimitMs = Math.max(2000, cfTimeLimitMs);

  const constraints = [
    ...extractConstraints(sections.input),
    `Time limit: ${timeLimitMs / 1000} s`,
    `Memory limit: ${memoryLimitMb} MB`,
  ];

  const attribution = `Source: Codeforces ${contestRef}, via DeepMind CodeContests (CC BY 4.0).`;

  return {
    problem: {
      title: parseTitle(row.name),
      contestRef,
      difficulty,
      description: `${sections.legend}\n\nInput\n${sections.input}\n\nOutput\n${sections.output}\n\n${attribution}`,
      constraints: constraints.join('\n'),
      sampleInput: samples[0].input.trim(),
      sampleOutput: samples[0].expectedOutput.trim(),
      explanation: sections.note ? sections.note.slice(0, 3000) : null,
      timeLimitMs,
      memoryLimitMb,
    },
    testCases,
  };
};

module.exports = {
  DIFFICULTY_BUCKETS,
  MAX_OUTPUT_CHARS,
  MAX_TESTS,
  buildProblem,
  cleanMath,
  extractConstraints,
  getDifficulty,
  isCandidate,
  isJudgeableStatement,
  parseTitle,
  selectTestCases,
  splitSections,
};
