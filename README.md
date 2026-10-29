# CodeArena

> A full-stack, real-time competitive programming platform where developers solve problems, submit code to a judge, and compete in 1v1 battle rooms.

[![Client](https://img.shields.io/badge/client-React%20%2B%20Vite-61DAFB?logo=react&logoColor=111827)](./client)
[![API](https://img.shields.io/badge/API-Node.js%20%2B%20Express-339933?logo=node.js&logoColor=white)](./server)
[![Database](https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Realtime](https://img.shields.io/badge/realtime-Socket.IO-010101?logo=socket.io&logoColor=white)](https://socket.io/)

## Why this project

CodeArena combines the core workflows of an online judge with the pressure and feedback loop of a live coding battle. It is designed as a portfolio project for demonstrating practical software-engineering skills: authentication, API design, relational data modelling, real-time state synchronisation, sandboxed code execution, rate limiting, and transactional domain logic.

## Features

- JWT-based registration, login, protected routes, and session restoration.
- Problem browser with published problem statements, constraints, samples, and submissions history.
- Monaco-based coding workspace with language selection, sample-test runs, and final submissions.
- Separate **Run** and **Submit** paths: public samples can be previewed, while hidden tests are used for judging.
- Real-time battle lobby with room creation, six-character room codes, join/rejoin support, ready state, and presence updates.
- 1v1 battle arena with server-synchronised timing, opponent activity, battle completion, and forfeit handling.
- Verdict-based winner selection using received submission times, including draw handling.
- Elo rating updates with wins, losses, draws, solve times, and rating-change history.
- Paginated leaderboard and dashboard metrics.
- Admin-only problem and test-case management.
- Problem import script for judgeable Codeforces/DeepMind CodeContests data.
- Request rate limiting and JWT validation on both HTTP and Socket.IO boundaries.

## Architecture

CodeArena is split into a browser client and an API server. HTTP is used for authentication, problem discovery, submissions, profiles, and leaderboard reads. Socket.IO handles room membership and battle events. Prisma persists users, problems, test cases, submissions, rooms, players, and battle results in PostgreSQL. The judge provider executes submitted programs in a sandbox and returns verdict, time, memory, and diagnostic data.

```text
React/Vite client
  ├─ Axios API client ────────┐
  └─ Socket.IO client ────────┤
                              ▼
                    Node.js / Express API
                    ├─ JWT auth + middleware
                    ├─ routes + controllers
                    ├─ problem/submission/user services
                    ├─ room and battle services
                    └─ Socket.IO event handlers
                              │
                    Prisma ORM / PostgreSQL
                              │
             Sandboxed judge provider + problem dataset
```

For the interactive call-order map, see [`docs/codearena-flow-map.html`](https://github.com/Het6518/codeArena-/blob/main/docs/codearena-flow-map.html).

## Technology stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, Vite, React Router | SPA pages, protected navigation, workspace, dashboard |
| Editor | Monaco Editor | In-browser code editing |
| Client state | Zustand | Auth/session state and user refresh |
| HTTP client | Axios | Authenticated API requests and error handling |
| Realtime | Socket.IO | Lobby, presence, battle, and result events |
| Backend | Node.js, Express | REST API, middleware, controllers |
| Persistence | Prisma, PostgreSQL | Relational data and battle history |
| Execution | Sandboxed judge provider | Compile/run submissions against tests |
| Security | JWT, rate limiting, role checks | Sessions, abuse control, admin boundaries |

## Repository layout

```text
.
├── client/                 # React/Vite frontend
│   └── src/
│       ├── features/auth/  # Login and registration
│       ├── pages/          # Dashboard, problems, battles, leaderboard
│       ├── services/       # Axios and Socket.IO clients
│       ├── store/          # Zustand auth store
│       └── router/         # Protected application routes
├── server/                 # Express API and realtime server
│   ├── src/routes/         # HTTP routes
│   ├── src/controllers/    # Request handlers
│   ├── src/services/       # Domain and persistence logic
│   ├── src/socket/         # Socket.IO setup and auth
│   ├── src/room/           # Room event handlers
│   └── prisma/             # Schema, seed, and import scripts
└── docs/
    └── codearena-flow-map.html
```

## Local setup

### Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL 14 or newer, or a hosted PostgreSQL database
- A configured sandbox/judge provider for code execution

### 1. Clone and install

```bash
git clone https://github.com/Het6518/codeArena-.git
cd codeArena-

cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create environment files using the names expected by the two applications. Keep secrets out of Git.

#### Client

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

#### Server

```dotenv
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/codearena
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:5173
```

The judge-provider variables depend on the execution backend enabled in the repository. If the project uses a hosted provider, add its endpoint and credentials in the server environment; if it uses a local executor, install and configure the required language runtimes. Never commit API keys or database credentials.

### 3. Prepare the database

From `server/`, run the repository's Prisma migration or generation commands:

```bash
npx prisma generate
npx prisma migrate dev
```

If seed data is available, run the server's seed script. To create an administrator, use the repository's `make-admin` script and provide the target email.

### 4. Start the applications

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

Open the Vite URL shown in the client terminal, usually `http://localhost:5173`.

## Demo flow

### Practice submission

1. Register or log in.
2. Open **Problems** and select a published problem.
3. Write a solution in the Monaco editor.
4. Use **Run** to check the public samples.
5. Use **Submit** to run against public and hidden tests.
6. Review verdict, test count, execution time, memory, and submission history.

### Real-time battle

1. Open the battle lobby and create a room.
2. Share the six-character room code with another player.
3. Both players join and toggle **Ready**.
4. The server atomically starts the room with a random published problem that has test cases.
5. Solve and submit from the arena while the server-backed stopwatch runs.
6. Watch opponent presence and verdict activity through Socket.IO.
7. The server determines the result, applies Elo once, stores the battle history, and emits the final result to both clients.

## Engineering highlights for SDE placements

- **Concurrency:** battle start and battle finish use guarded state transitions so simultaneous requests cannot settle the same room twice.
- **Security boundaries:** JWT verification is applied to HTTP and Socket.IO; hidden tests and admin write routes are protected.
- **Data integrity:** Prisma transactions keep battle status, player results, rating changes, and user statistics consistent.
- **Realtime design:** reconnect and rejoin paths are handled so a refresh does not silently create a second player identity.
- **Performance and abuse control:** pagination, selective problem reads, rate limits, and a shared Socket.IO connection reduce unnecessary work.
- **Separation of concerns:** pages call client services; routes delegate to controllers; domain services own judging, room, rating, and user logic.

## Useful commands

```bash
# Client
npm run dev
npm run build

# Server
npm run dev
npm run start
npx prisma studio

# Import judgeable problems, when configured by the repository
npm run import:problems -- --easy 40 --medium 40 --hard 20
```

Check each package's `package.json` for the exact command names available in the current branch.


## Author

Built by [Het6518](https://github.com/Het6518).
