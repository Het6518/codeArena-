// Usage: npm run make-admin -- user@example.com
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const makeAdmin = async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();

  if (!email) {
    console.error('Usage: npm run make-admin -- <email>');
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'ADMIN' },
    select: { username: true, email: true, role: true },
  });

  console.log(`${user.username} <${user.email}> is now ${user.role}`);
};

makeAdmin()
  .catch((error) => {
    console.error(error.code === 'P2025' ? 'No user with that email' : error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
