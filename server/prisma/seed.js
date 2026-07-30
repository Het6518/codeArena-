const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROBLEMS = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    difficulty: 'EASY',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
    sampleInput: 'nums = [2,7,11,15], target = 9',
    sampleOutput: '[0,1]',
    explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    isPublished: true,
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true },
    ],
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    difficulty: 'EASY',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\'.',
    sampleInput: 's = "()[]{}"',
    sampleOutput: 'true',
    explanation: 'All open brackets are matched correctly by their corresponding closing bracket types.',
    timeLimitMs: 1500,
    memoryLimitMb: 256,
    isPublished: true,
    testCases: [
      { input: '()[]{}', expectedOutput: 'true', isHidden: false },
      { input: '(]', expectedOutput: 'false', isHidden: false },
      { input: '{[]}', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    title: 'LRU Cache',
    slug: 'lru-cache',
    description: `Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.

Implement the \`LRUCache\` class:
- \`LRUCache(int capacity)\` Initialize the LRU cache with positive size \`capacity\`.
- \`int get(int key)\` Return the value of the \`key\` if the key exists, otherwise return \`-1\`.
- \`void put(int key, int value)\` Update the value of the \`key\` if the key exists. Otherwise, add the \`key-value\` pair to the cache. If the number of keys exceeds the \`capacity\` from this operation, **evict** the least recently used key.

The functions \`get\` and \`put\` must each run in **O(1)** average time complexity.`,
    difficulty: 'HARD',
    constraints: '1 <= capacity <= 3000\n0 <= key <= 10^4\n0 <= value <= 10^5\nAt most 2 * 10^5 calls will be made to get and put.',
    sampleInput: '["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]',
    sampleOutput: '[null, null, null, 1, null, -1, null, -1, 3, 4]',
    explanation: 'Cache operations execute in O(1) using Doubly-Linked List + Hash Map.',
    timeLimitMs: 2500,
    memoryLimitMb: 512,
    isPublished: true,
    testCases: [
      {
        input: 'LRUCache(2); put(1,1); put(2,2); get(1); put(3,3); get(2);',
        expectedOutput: '[1, -1]',
        isHidden: false,
      },
    ],
  },
  {
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    description: `You are given an integer array \`height\` of length \`n\`. There are \`n\` vertical lines drawn such that the two endpoints of the \`i-th\` line are \`(i, 0)\` and \`(i, height[i])\`.

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.`,
    difficulty: 'MEDIUM',
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
    sampleInput: 'height = [1,8,6,2,5,4,8,3,7]',
    sampleOutput: '49',
    explanation: 'The vertical lines at indices 1 and 8 enclose area min(8, 7) * (8 - 1) = 49.',
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    isPublished: true,
    testCases: [
      { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49', isHidden: false },
      { input: '[1,1]', expectedOutput: '1', isHidden: false },
    ],
  },
];

async function seed() {
  console.log('🌱 Starting CodeArena database seeding...');

  for (const item of PROBLEMS) {
    const { testCases, ...problemData } = item;

    const existing = await prisma.problem.findUnique({
      where: { slug: problemData.slug },
    });

    if (existing) {
      console.log(`- Skipping ${problemData.title} (already exists)`);
      continue;
    }

    const created = await prisma.problem.create({
      data: {
        ...problemData,
        testCases: {
          create: testCases,
        },
      },
    });

    console.log(`✓ Created problem: ${created.title} (${created.slug})`);
  }

  console.log('✅ Database seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
