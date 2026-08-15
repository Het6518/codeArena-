const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const executionProblem = {
  title: 'Add Two Numbers',
  slug: 'add-two-numbers',
  description: 'Read two integers from standard input and print their sum.',
  difficulty: 'EASY',
  constraints: '-10^9 <= a, b <= 10^9',
  sampleInput: '2 3',
  sampleOutput: '5',
  explanation: '2 + 3 = 5.',
  timeLimitMs: 2000,
  memoryLimitMb: 256,
  isPublished: true,
  testCases: [
    { input: '2 3', expectedOutput: '5', isHidden: false },
    { input: '10 -4', expectedOutput: '6', isHidden: false },
    { input: '1000000000 1', expectedOutput: '1000000001', isHidden: true },
  ],
};

const seedExecutionProblem = async () => {
  const existing = await prisma.problem.findUnique({
    where: {
      slug: executionProblem.slug,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (existing) {
    console.log(`Execution seed problem already exists: ${existing.title} (${existing.id})`);
    return;
  }

  const { testCases, ...problemData } = executionProblem;

  const created = await prisma.problem.create({
    data: {
      ...problemData,
      testCases: {
        create: testCases,
      },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
  });

  console.log(`Created execution seed problem: ${created.title} (${created.id})`);
};

seedExecutionProblem()
  .catch((error) => {
    console.error('Execution seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
