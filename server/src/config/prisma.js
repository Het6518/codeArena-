const {PrismaClient} = require('@prisma/client');
const { isRetryableConnectionError } = require('./dbErrors');

// Neon's pooler can drop an idle connection; a query that lands on a dropped connection
// is retried once on a fresh one. Pool timeouts and query errors are never retried.
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 300;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const prisma = new PrismaClient().$extends({
  query: {
    async $allOperations({ args, query }) {
      for (let attempt = 0; ; attempt += 1) {
        try {
          return await query(args);
        } catch (error) {
          if (attempt >= MAX_RETRIES || !isRetryableConnectionError(error)) {
            throw error;
          }
          await sleep(RETRY_DELAY_MS);
        }
      }
    },
  },
});

module.exports = prisma;
