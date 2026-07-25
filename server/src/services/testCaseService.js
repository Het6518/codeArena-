const prisma = require('../config/prisma');

const MAX_TEST_CASES_PER_PROBLEM = 6;

const createHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateTestCaseInput = (data, { partial = false } = {}) => {
  if (!partial) {
    if (data.input === undefined || data.expectedOutput === undefined) {
      throw createHttpError('Input and expected output are required', 400);
    }
  }

  if (data.input !== undefined && typeof data.input !== 'string') {
    throw createHttpError('Input must be a string', 400);
  }

  if (data.expectedOutput !== undefined && typeof data.expectedOutput !== 'string') {
    throw createHttpError('Expected output must be a string', 400);
  }

  if (data.isHidden !== undefined && typeof data.isHidden !== 'boolean') {
    throw createHttpError('isHidden must be a boolean', 400);
  }
};

const buildTestCaseData = (data) => {
  const testCaseData = {};

  if (data.input !== undefined) testCaseData.input = data.input;
  if (data.expectedOutput !== undefined) testCaseData.expectedOutput = data.expectedOutput;
  if (data.isHidden !== undefined) testCaseData.isHidden = data.isHidden;

  return testCaseData;
};

const createTestCase = async (problemId, data) => {
  validateTestCaseInput(data);

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

  const testCaseCount = await prisma.testCase.count({
    where: {
      problemId,
    },
  });

  if (testCaseCount >= MAX_TEST_CASES_PER_PROBLEM) {
    throw createHttpError('A problem can have a maximum of 6 test cases', 400);
  }

  return prisma.testCase.create({
    data: {
      problemId,
      ...buildTestCaseData(data),
    },
    select: {
      id: true,
      problemId: true,
      input: true,
      expectedOutput: true,
      isHidden: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const getTestCasesByProblem = async (problemId) => {
  const problem = await prisma.problem.findUnique({
    where: {
      id: problemId,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      testCases: {
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          problemId: true,
          input: true,
          expectedOutput: true,
          isHidden: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!problem) {
    throw createHttpError('Problem not found', 404);
  }

  return problem.testCases;
};

const getTestCaseById = async (id) => {
  const testCase = await prisma.testCase.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      problemId: true,
      input: true,
      expectedOutput: true,
      isHidden: true,
      createdAt: true,
      updatedAt: true,
      problem: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!testCase) {
    throw createHttpError('Test case not found', 404);
  }

  return testCase;
};

const updateTestCase = async (id, data) => {
  validateTestCaseInput(data, { partial: true });

  const testCaseData = buildTestCaseData(data);

  if (Object.keys(testCaseData).length === 0) {
    throw createHttpError('At least one field is required to update', 400);
  }

  const existingTestCase = await prisma.testCase.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingTestCase) {
    throw createHttpError('Test case not found', 404);
  }

  return prisma.testCase.update({
    where: {
      id,
    },
    data: testCaseData,
    select: {
      id: true,
      problemId: true,
      input: true,
      expectedOutput: true,
      isHidden: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

const deleteTestCase = async (id) => {
  const existingTestCase = await prisma.testCase.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existingTestCase) {
    throw createHttpError('Test case not found', 404);
  }

  await prisma.testCase.delete({
    where: {
      id,
    },
  });
};

module.exports = {
  createTestCase,
  deleteTestCase,
  getTestCaseById,
  getTestCasesByProblem,
  updateTestCase,
};
