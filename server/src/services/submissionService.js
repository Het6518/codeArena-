const prisma = require('../config/prisma');
const onlineCompilerConfig = require('../config/onlineCompilerConfig');
const {
  evaluateSubmissionAgainstTestCases,
  runAgainstSampleTestCases,
} = require('../execution/executionService');
const { getCompilerForLanguage } = require('../execution/providers/onlineCompilerLanguageMap');
const BattleService = require('../battle/battleService');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MAX_SOURCE_CODE_BYTES = 64 * 1024;

// One evaluation per user at a time. This stops double-clicks and parallel requests from
// queueing several evaluations (and burning provider quota). In-memory, so per instance.
const activeEvaluations = new Set();

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parsePagination = ({ page, limit }) => {
  const parsedPage = Number.parseInt(page, 10) || DEFAULT_PAGE;
  const parsedLimit = Number.parseInt(limit, 10) || DEFAULT_LIMIT;

  return {
    page: Math.max(parsedPage, 1),
    limit: Math.min(Math.max(parsedLimit, 1), MAX_LIMIT),
  };
};

const validateSubmissionInput = (data) => {
  if (!data || typeof data !== 'object') {
    throw createHttpError('problemId, language, and sourceCode are required', 400);
  }

  const { problemId, language, sourceCode, roomCode } = data;

  if (!problemId || !language || !sourceCode) {
    throw createHttpError('problemId, language, and sourceCode are required', 400);
  }

  if (typeof problemId !== 'string' || !problemId.trim()) {
    throw createHttpError('problemId must be a valid string', 400);
  }

  if (typeof language !== 'string' || !language.trim()) {
    throw createHttpError('Language must be a valid string', 400);
  }

  if (typeof sourceCode !== 'string' || !sourceCode.trim()) {
    throw createHttpError('Source code must be a valid string', 400);
  }

  if (Buffer.byteLength(sourceCode, 'utf8') > MAX_SOURCE_CODE_BYTES) {
    throw createHttpError('Source code must be 64 KB or smaller', 413);
  }

  if (roomCode !== undefined && roomCode !== null && typeof roomCode !== 'string') {
    throw createHttpError('roomCode must be a string', 400);
  }

  getCompilerForLanguage(language);
};

const submissionSelect = {
  id: true,
  userId: true,
  problemId: true,
  battleRoomId: true,
  language: true,
  sourceCode: true,
  status: true,
  passedTestCases: true,
  totalTestCases: true,
  executionTimeMs: true,
  memoryKb: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
  problem: {
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
    },
  },
};

const submissionListSelect = { ...submissionSelect, sourceCode: false };

const withEvaluationLock = async (userId, task) => {
  if (activeEvaluations.has(userId)) {
    throw createHttpError('You already have code being evaluated. Please wait for it to finish.', 429);
  }

  activeEvaluations.add(userId);

  try {
    return await task();
  } finally {
    activeEvaluations.delete(userId);
  }
};

const loadProblemForJudging = async (problemId, { samplesOnly = false } = {}) => {
  const problem = await prisma.problem.findUnique({
    where: {
      id: problemId,
    },
    select: {
      id: true,
      isPublished: true,
      timeLimitMs: true,
      testCases: {
        where: samplesOnly ? { isHidden: false } : undefined,
        take: onlineCompilerConfig.maxTestCasesPerProblem,
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
        },
      },
    },
  });

  if (!problem || !problem.isPublished) {
    throw createHttpError('Problem not found', 404);
  }

  if (!problem.testCases.length) {
    throw createHttpError(samplesOnly ? 'Problem has no sample test cases' : 'Problem has no test cases configured', 400);
  }

  return problem;
};

const createSubmission = async (userId, data, { provider } = {}) => {
  validateSubmissionInput(data);

  const cleanProblemId = data.problemId.trim();
  const cleanLanguage = data.language.trim().toLowerCase();
  const cleanSourceCode = data.sourceCode.trim();

  return withEvaluationLock(userId, async () => {
    const problem = await loadProblemForJudging(cleanProblemId);

    const battleRoom = data.roomCode
      ? await BattleService.validateBattleSubmission(userId, data.roomCode, cleanProblemId)
      : null;

    // createdAt is the authoritative "received" time used to rank battle submissions.
    const initialSubmission = await prisma.submission.create({
      data: {
        userId,
        problemId: cleanProblemId,
        battleRoomId: battleRoom ? battleRoom.id : null,
        language: cleanLanguage,
        sourceCode: cleanSourceCode,
        status: 'PENDING',
      },
      select: { id: true },
    });

    let evaluation;

    try {
      evaluation = await evaluateSubmissionAgainstTestCases({
        sourceCode: cleanSourceCode,
        language: cleanLanguage,
        testCases: problem.testCases,
        timeLimitMs: problem.timeLimitMs,
        provider,
      });
    } catch (error) {
      // Infrastructure failure: record it as INTERNAL_ERROR, never as a wrong answer.
      const failedSubmission = await prisma.submission.update({
        where: { id: initialSubmission.id },
        data: {
          status: 'INTERNAL_ERROR',
          errorMessage: error.statusCode ? error.message : 'Code execution failed unexpectedly',
        },
        select: { id: true, userId: true, status: true, battleRoomId: true },
      });

      if (failedSubmission.battleRoomId) {
        await BattleService.onBattleSubmissionEvaluated(failedSubmission);
      }

      error.submissionId = initialSubmission.id;
      error.statusCode = error.statusCode && error.statusCode !== 500 ? error.statusCode : 502;
      throw error;
    }

    const submission = await prisma.submission.update({
      where: {
        id: initialSubmission.id,
      },
      data: evaluation,
      select: submissionSelect,
    });

    let battle = null;

    if (submission.battleRoomId) {
      const finishedRoom = await BattleService.onBattleSubmissionEvaluated(submission);
      battle = finishedRoom ? { finished: true, winnerId: finishedRoom.winnerId } : { finished: false };
    }

    return { submission, battle };
  });
};

// Runs code against public sample test cases only. Nothing is persisted.
const runCode = async (userId, data, { provider } = {}) => {
  validateSubmissionInput(data);

  const cleanProblemId = data.problemId.trim();
  const cleanLanguage = data.language.trim().toLowerCase();

  return withEvaluationLock(userId, async () => {
    const problem = await loadProblemForJudging(cleanProblemId, { samplesOnly: true });

    return runAgainstSampleTestCases({
      sourceCode: data.sourceCode.trim(),
      language: cleanLanguage,
      testCases: problem.testCases,
      timeLimitMs: problem.timeLimitMs,
      provider,
    });
  });
};

const getSubmissionById = async (userId, submissionId) => {
  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: submissionSelect,
  });

  // Respond 404 for other users' submissions too, so ids cannot be probed.
  if (!submission || submission.userId !== userId) {
    throw createHttpError('Submission not found', 404);
  }

  return submission;
};

const getMySubmissions = async (userId, query) => {
  const { page, limit } = parsePagination(query);
  const skip = (page - 1) * limit;

  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
      select: submissionListSelect,
    }),
    prisma.submission.count({
      where: {
        userId,
      },
    }),
  ]);

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMyProblemSubmissions = async (userId, problemId) => {
  const problem = await prisma.problem.findUnique({
    where: {
      id: problemId,
    },
    select: {
      id: true,
    },
  });

  if (!problem) {
    throw createHttpError('Problem not found', 404);
  }

  return prisma.submission.findMany({
    where: {
      userId,
      problemId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: MAX_LIMIT,
    select: submissionSelect,
  });
};

module.exports = {
  createSubmission,
  getMyProblemSubmissions,
  getMySubmissions,
  getSubmissionById,
  runCode,
};
