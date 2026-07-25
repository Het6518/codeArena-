const prisma = require('../config/prisma');

const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
// .update , .delete , .findUnique , .findMany , .create , .findFirst
const createSlug = (title) => {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const validateProblemInput = (data, { partial = false } = {}) => {
  const requiredFields = [
    'title',
    'description',
    'difficulty',
    'constraints',
    'sampleInput',
    'sampleOutput',
  ];

  if (!partial) {
    const missingField = requiredFields.find((field) => !data[field]);

    if (missingField) {
      throw createHttpError(`${missingField} is required`, 400);
    }
  }

  if (data.title !== undefined && data.title.trim().length < 3) {
    throw createHttpError('Title must be at least 3 characters long', 400);
  }

  if (data.title !== undefined && !createSlug(data.title)) {
    throw createHttpError('Title must contain letters or numbers', 400);
  }

  if (data.description !== undefined && data.description.trim().length < 20) {
    throw createHttpError('Description must be at least 20 characters long', 400);
  }

  if (data.difficulty !== undefined && !VALID_DIFFICULTIES.includes(data.difficulty)) {
    throw createHttpError('Difficulty must be EASY, MEDIUM, or HARD', 400);
  }

  if (data.constraints !== undefined && !data.constraints.trim()) {
    throw createHttpError('Constraints are required', 400);
  }

  if (data.sampleInput !== undefined && !data.sampleInput.trim()) {
    throw createHttpError('Sample input is required', 400);
  }

  if (data.sampleOutput !== undefined && !data.sampleOutput.trim()) {
    throw createHttpError('Sample output is required', 400);
  }

  if (data.timeLimitMs !== undefined && (!Number.isInteger(data.timeLimitMs) || data.timeLimitMs <= 0)) {
    throw createHttpError('Time limit must be a positive integer', 400);
  }

  if (data.memoryLimitMb !== undefined && (!Number.isInteger(data.memoryLimitMb) || data.memoryLimitMb <= 0)) {
    throw createHttpError('Memory limit must be a positive integer', 400);
  }

  if (data.isPublished !== undefined && typeof data.isPublished !== 'boolean') {
    throw createHttpError('isPublished must be a boolean', 400);
  }
};

const buildProblemData = (data) => {
  const problemData = {};

  if (data.title !== undefined) {
    const cleanTitle = data.title.trim();
    problemData.title = cleanTitle;
    problemData.slug = createSlug(cleanTitle);
  }

  if (data.description !== undefined) problemData.description = data.description.trim();
  if (data.difficulty !== undefined) problemData.difficulty = data.difficulty;
  if (data.constraints !== undefined) problemData.constraints = data.constraints.trim();
  if (data.sampleInput !== undefined) problemData.sampleInput = data.sampleInput.trim();
  if (data.sampleOutput !== undefined) problemData.sampleOutput = data.sampleOutput.trim();
  if (data.explanation !== undefined) problemData.explanation = data.explanation ? data.explanation.trim() : null;
  if (data.timeLimitMs !== undefined) problemData.timeLimitMs = data.timeLimitMs;
  if (data.memoryLimitMb !== undefined) problemData.memoryLimitMb = data.memoryLimitMb;
  if (data.isPublished !== undefined) problemData.isPublished = data.isPublished;

  return problemData;
};

const createProblem = async (data) => {
  validateProblemInput(data);

  const problemData = buildProblemData(data);

  const existingProblem = await prisma.problem.findFirst({
    where: {
      OR: [{ title: problemData.title }, { slug: problemData.slug }],
    },
    select: {
      id: true,
    },
  });

  if (existingProblem) {
    throw createHttpError('Problem title already exists', 409);
  }

  try {
    return await prisma.problem.create({
      data: problemData,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        isPublished: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Problem title already exists', 409);
    }

    throw error;
  }
};

const getProblems = async () => {
  return prisma.problem.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getProblemBySlug = async (slug) => {
  const problem = await prisma.problem.findUnique({
    where: {
      slug,
    },
  });

  if (!problem) {
    throw createHttpError('Problem not found', 404);
  }

  return problem;
};

const updateProblem = async (id, data) => {
  validateProblemInput(data, { partial: true });

  const existingProblem = await prisma.problem.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProblem) {
    throw createHttpError('Problem not found', 404);
  }

  const problemData = buildProblemData(data);

  if (Object.keys(problemData).length === 0) {
    throw createHttpError('At least one field is required to update', 400);
  }

  if (problemData.title || problemData.slug) {
    const duplicateProblem = await prisma.problem.findFirst({
      where: {
        id: {
          not: id,
        },
        OR: [{ title: problemData.title }, { slug: problemData.slug }],
      },
      select: {
        id: true,
      },
    });

    if (duplicateProblem) {
      throw createHttpError('Problem title already exists', 409);
    }
  }

  try {
    return await prisma.problem.update({
      where: {
        id,
      },
      data: problemData,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        difficulty: true,
        constraints: true,
        sampleInput: true,
        sampleOutput: true,
        explanation: true,
        timeLimitMs: true,
        memoryLimitMb: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createHttpError('Problem title already exists', 409);
    }

    throw error;
  }
};

const deleteProblem = async (id) => {
  const existingProblem = await prisma.problem.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProblem) {
    throw createHttpError('Problem not found', 404);
  }

  await prisma.problem.delete({ //delete the problem from the database
    where: {
      id,
    },
  });
};

module.exports = {
  createProblem,
  deleteProblem,
  getProblemBySlug,
  getProblems,
  updateProblem,
};
