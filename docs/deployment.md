# Deploy CodeArena to Render, Vercel, and Neon

The repository has two deployable folders: `server` (Node/Express and Socket.IO) and `client` (Vite/React). Create a Neon PostgreSQL database first. Keep credentials in the hosting dashboards; never commit `.env` files.

## 1. Neon

Copy the Neon **pooled** PostgreSQL connection string (the hostname contains `-pooler`) into Render's `DATABASE_URL`. Copy the **direct** connection string into Render's `DIRECT_URL`. Both should use SSL (`sslmode=require`). Prisma Client uses the pooled URL; Prisma Migrate uses the direct URL. Use the same Neon database and branch for both strings. Existing migrations in `server/prisma/migrations` are applied by `prisma migrate deploy`; do not use `prisma db push` for production.

## 2. Render API

Connect this repository as a Render Blueprint using the root `render.yaml`, or create a Node web service with root directory `server`:

| Setting | Value |
| --- | --- |
| Build | `npm ci --include=dev && npm run build` |
| Start | `npm run migrate:deploy && npm start` |
| Health check | `/api/health` |

Set `DATABASE_URL`, `DIRECT_URL`, and a long random `JWT_SECRET` as secret environment variables. Set `CLIENT_URL` to the exact Vercel origin, such as `https://codearena.vercel.app`, with no path or trailing slash. For multiple allowed frontend origins, separate them with commas. Set `ONLINE_COMPILER_API_KEY` if code execution is needed. `NODE_ENV=production` is set by the Blueprint. Render supplies `PORT` automatically. The API should be reachable at `https://YOUR-RENDER-SERVICE.onrender.com/api/health` after deployment.

The start command runs committed migrations before accepting traffic. Keep the Prisma CLI installed during build and runtime (the build command includes dev dependencies). On a service configuration that prunes dev dependencies after build, move `prisma` to production dependencies or run migrations through a separate deploy step.

## 3. Vercel frontend

Import the same repository into Vercel with **Root Directory** `client`, Framework Preset **Vite**, Build Command `npm run build`, and Output Directory `dist`. Set these Vercel environment variables for Production (and Preview if desired):

| Variable | Example |
| --- | --- |
| `VITE_API_BASE_URL` | `https://YOUR-RENDER-SERVICE.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://YOUR-RENDER-SERVICE.onrender.com` |

These values are public browser configuration, so put no secrets in `VITE_` variables. Redeploy Vercel after changing them. `client/vercel.json` rewrites browser routes to `index.html` so direct links and refreshes work.

Once Vercel gives you its production domain, update Render's `CLIENT_URL` and redeploy the API. If you use Vercel preview deployments, add only the preview origins you want to authorize; the CORS list does not allow arbitrary `*.vercel.app` origins.

## 4. Verify

Open `/api/health` on Render and expect HTTP 200 with `{"success":true,"status":"ok"}`. Open the Vercel site, refresh a nested route, register or sign in, load a database backed page, and connect to a battle room to verify Socket.IO. If migration fails, check that `DIRECT_URL` points to the same Neon branch as `DATABASE_URL` and inspect Render's deploy logs. If the browser reports CORS errors, compare its exact origin with `CLIENT_URL`.

For local development, copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env.local`, replacing the example values. Use `http://localhost:5173` for local `CLIENT_URL` and `http://localhost:5000/api` / `http://localhost:5000` for the client variables. Run `npm ci` in each folder, then `npm run build` for the client and `npm test` for the server.
