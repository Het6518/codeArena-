// Imports judgeable Codeforces problems from DeepMind CodeContests (CC BY 4.0).
//
// Usage:
//   npm run import:problems                         # 40 easy, 40 medium, 20 hard
//   npm run import:problems -- --easy 10 --medium 5 --hard 0 --dry-run
//   npm run import:problems -- --unpublished        # import for review, not shown to users
//
// Only the small columns are downloaded (statement + tests); the dataset's bundled
// solutions, which make up almost all of its size, are never fetched. Re-running is safe:
// problems whose slug already exists are skipped.
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { DIFFICULTY_BUCKETS, buildProblem, isCandidate } = require('./lib/codeContests');

const DATASET = 'deepmind/code_contests';
const PARQUET_LIST_URL = `https://datasets-server.huggingface.co/parquet?dataset=${DATASET}`;
const LIGHT_COLUMNS = ['name', 'source', 'cf_rating', 'cf_tags', 'is_description_translated', 'input_file', 'output_file'];
const HEAVY_COLUMNS = ['description', 'public_tests', 'private_tests', 'time_limit', 'memory_limit_bytes', 'cf_contest_id', 'cf_index'];
const BATCH_SIZE = 6;

const prisma = new PrismaClient();

const parseArgs = (argv) => {
  const args = { easy: 40, medium: 40, hard: 20, dryRun: false, publish: true, seed: 42 };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--easy') args.easy = Number(value);
    if (flag === '--medium') args.medium = Number(value);
    if (flag === '--hard') args.hard = Number(value);
    if (flag === '--seed') args.seed = Number(value);
    if (flag === '--dry-run') args.dryRun = true;
    if (flag === '--unpublished') args.publish = false;
  }

  for (const key of ['easy', 'medium', 'hard', 'seed']) {
    if (!Number.isInteger(args[key]) || args[key] < 0) {
      throw new Error(`--${key} must be a non-negative integer`);
    }
  }

  return args;
};

// Same slug rule as src/services/problemService.js.
const createSlug = (title) => {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Small seeded PRNG so a given --seed always picks the same problems.
const createRandom = (seed) => {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const shuffle = (items, random) => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

const getParquetUrls = async () => {
  const response = await fetch(PARQUET_LIST_URL);
  if (!response.ok) {
    throw new Error(`Could not list dataset files (HTTP ${response.status})`);
  }
  const data = await response.json();
  return data.parquet_files.filter((file) => file.split === 'train').map((file) => file.url);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const quotas = { EASY: args.easy, MEDIUM: args.medium, HARD: args.hard };
  const imported = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const skipped = {};

  // hyparquet is ESM-only.
  const { asyncBufferFromUrl, cachedAsyncBuffer, parquetMetadataAsync, parquetReadObjects } = await import('hyparquet');
  const { compressors } = await import('hyparquet-compressors');

  console.log(`Importing up to ${args.easy} easy, ${args.medium} medium, ${args.hard} hard problems${args.dryRun ? ' (dry run)' : ''}`);

  const files = [];
  for (const url of await getParquetUrls()) {
    const file = cachedAsyncBuffer(await asyncBufferFromUrl({ url }));
    const metadata = await parquetMetadataAsync(file);
    files.push({ url, file, metadata });
  }

  // Pass 1: light columns only, to find candidate rows.
  const candidates = [];
  for (const [fileIndex, { file, metadata }] of files.entries()) {
    const rows = await parquetReadObjects({ file, metadata, compressors, columns: LIGHT_COLUMNS });
    rows.forEach((row, rowIndex) => {
      if (isCandidate(row)) {
        candidates.push({ fileIndex, rowIndex, light: row });
      }
    });
  }
  console.log(`Found ${candidates.length} Codeforces candidates in ${files.length} files`);

  const existing = await prisma.problem.findMany({ select: { title: true, slug: true } });
  const usedTitles = new Set(existing.map((problem) => problem.title.toLowerCase()));
  const usedSlugs = new Set(existing.map((problem) => problem.slug));

  const readRow = async ({ fileIndex, rowIndex, light }, columns) => {
    const { file, metadata } = files[fileIndex];
    const [row] = await parquetReadObjects({ file, metadata, compressors, columns, rowStart: rowIndex, rowEnd: rowIndex + 1 });
    return { ...light, ...row };
  };

  // Generated tests are only downloaded when the official tests are not enough.
  const prepare = async (candidate) => {
    let row = await readRow(candidate, HEAVY_COLUMNS);
    let built = buildProblem(row);

    if (built.skip === 'not enough usable tests') {
      row = { ...row, ...(await readRow(candidate, ['generated_tests'])) };
      built = buildProblem(row);
    }

    return built;
  };

  const quotaFull = (difficulty) => imported[difficulty] >= quotas[difficulty];
  const allQuotasFull = () => Object.keys(quotas).every(quotaFull);

  const queue = shuffle(candidates, createRandom(args.seed)).filter((candidate) => quotas[DIFFICULTY_BUCKETS.find(
    ({ min, max }) => Number(candidate.light.cf_rating) >= min && Number(candidate.light.cf_rating) <= max
  ).difficulty] > 0);

  for (let start = 0; start < queue.length && !allQuotasFull(); start += BATCH_SIZE) {
    const batch = queue.slice(start, start + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((candidate) => prepare(candidate).catch((error) => ({ skip: `read failed: ${error.message}` })))
    );

    for (const built of results) {
      if (built.skip) {
        skipped[built.skip] = (skipped[built.skip] || 0) + 1;
        continue;
      }

      const { problem, testCases } = built;
      if (quotaFull(problem.difficulty)) continue;

      let title = problem.title;
      if (usedTitles.has(title.toLowerCase())) {
        title = `${problem.title} (CF ${problem.contestRef})`;
      }
      const slug = createSlug(title);

      if (title.length < 3 || !slug || usedTitles.has(title.toLowerCase()) || usedSlugs.has(slug)) {
        skipped['already imported'] = (skipped['already imported'] || 0) + 1;
        continue;
      }

      const { contestRef, ...problemData } = problem;

      if (!args.dryRun) {
        await prisma.problem.create({
          data: {
            ...problemData,
            title,
            slug,
            isPublished: args.publish,
            testCases: { create: testCases },
          },
        });
      }

      usedTitles.add(title.toLowerCase());
      usedSlugs.add(slug);
      imported[problem.difficulty] += 1;
      console.log(
        `${args.dryRun ? '[dry] ' : ''}+ ${problem.difficulty.padEnd(6)} ${title} (CF ${contestRef}, ${testCases.length} tests)`
      );
    }
  }

  console.log('\nImported:', imported);
  console.log('Skipped:', skipped);

  for (const difficulty of Object.keys(quotas)) {
    if (!quotaFull(difficulty)) {
      console.log(`Note: only ${imported[difficulty]} of ${quotas[difficulty]} ${difficulty} problems passed the filters.`);
    }
  }
};

main()
  .catch((error) => {
    console.error('Import failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
