const http = require('http');
const app = require('./app');
const initializeSocket = require('./socket');
const prisma = require('./config/prisma');
const { validateEnv } = require('./config/env');
const { startBattleSweeper } = require('./battle/battleService');

validateEnv();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

initializeSocket(server);
// Closes battles whose 30-minute clock ran out, including any left running across a restart.
startBattleSweeper();

// Open the first database connection before accepting traffic. On a cold or distant
// database this takes seconds, and paying it up front avoids a burst of reconnecting
// clients all waiting on it at once. Startup continues even if it fails.
prisma
  .$connect()
  .catch((error) => console.error('Database warm-up failed:', error.message))
  .finally(() => {
    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  });
