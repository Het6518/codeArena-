const prisma = require('../config/prisma');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

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

const validateSubmissionInput = ({ problemId, language, sourceCode }) => {
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
};

const submissionSelect = {
  id: true,
  userId: true,
  problemId: true,
  language: true,
  sourceCode: true,
  status: true,
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

const createSubmission = async (userId, data) => {
  validateSubmissionInput(data);

  const cleanProblemId = data.problemId.trim();
  const cleanLanguage = data.language.trim().toLowerCase();
  const cleanSourceCode = data.sourceCode.trim();

  const problem = await prisma.problem.findUnique({
    where: {
      id: cleanProblemId,
    },
    select: {
      id: true,
    },
  });

  if (!problem) {
    throw createHttpError('Problem not found', 404);
  }

  return prisma.submission.create({
    data: {
      userId,
      problemId: cleanProblemId,
      language: cleanLanguage,
      sourceCode: cleanSourceCode,
    },
    select: submissionSelect,
  });
};

const getSubmissionById = async (userId, submissionId) => {
  const submission = await prisma.submission.findUnique({
    where: {
      id: submissionId,
    },
    select: submissionSelect,
  });

  if (!submission) {
    throw createHttpError('Submission not found', 404);
  }

  if (submission.userId !== userId) {
    throw createHttpError('You are not allowed to view this submission', 403);
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
      select: submissionSelect,
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
    select: submissionSelect,
  });
};

module.exports = {
  createSubmission,
  getMyProblemSubmissions,
  getMySubmissions,
  getSubmissionById,
};
