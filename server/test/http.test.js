// HTTP boundary tests that never reach the database: authentication, admin guards,
// validation that happens before any query, and error middleware.
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const createRateLimiter = require('../src/middleware/rateLimit');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

test.after(() => {
  server.close();
});

const request = (path, { method = 'GET', token, body, rawBody } = {}) => {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
};

test('protected endpoints require a token', async () => {
  for (const path of ['/users/me', '/users/leaderboard', '/submissions/me']) {
    const response = await request(path);
    assert.equal(response.status, 401, path);
  }
});

test('expired and forged tokens are rejected', async () => {
  const expired = jwt.sign({ userId: 'u1' }, 'test-secret', { expiresIn: -10 });
  const forged = jwt.sign({ userId: 'u1' }, 'wrong-secret');

  assert.equal((await request('/users/me', { token: expired })).status, 401);
  assert.equal((await request('/users/me', { token: forged })).status, 401);
});

test('problem and test case writes require authentication', async () => {
  assert.equal((await request('/problems', { method: 'POST', body: {} })).status, 401);
  assert.equal((await request('/problems/abc', { method: 'PUT', body: {} })).status, 401);
  assert.equal((await request('/problems/abc', { method: 'DELETE' })).status, 401);
  assert.equal((await request('/problems/abc/testcases')).status, 401);
  assert.equal((await request('/testcases/abc')).status, 401);
});

test('submission validation runs before any database access', async () => {
  const token = jwt.sign({ userId: 'u1' }, 'test-secret');

  const missing = await request('/submissions', { method: 'POST', token, body: {} });
  assert.equal(missing.status, 400);

  const unsupported = await request('/submissions', {
    method: 'POST',
    token,
    body: { problemId: 'p1', language: 'cobol', sourceCode: 'x' },
  });
  assert.equal(unsupported.status, 400);

  const tooLarge = await request('/submissions/run', {
    method: 'POST',
    token,
    body: { problemId: 'p1', language: 'python', sourceCode: 'x'.repeat(70 * 1024) },
  });
  assert.equal(tooLarge.status, 413);
});

test('invalid JSON and unknown routes return JSON errors', async () => {
  const badJson = await request('/auth/login', { method: 'POST', rawBody: '{oops' });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).success, false);

  const unknown = await request('/does-not-exist');
  assert.equal(unknown.status, 404);
});

test('register validates input types before querying', async () => {
  const response = await request('/auth/register', {
    method: 'POST',
    body: { username: ['x'], email: 'a@b.co', password: 'secret1' },
  });
  assert.equal(response.status, 400);
});

test('rate limiter blocks after the configured number of requests', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, keyGenerator: () => 'k' });
  const statuses = [];
  const res = {
    set() {},
    status(code) {
      statuses.push(code);
      return { json() {} };
    },
  };

  let passed = 0;
  for (let i = 0; i < 3; i += 1) {
    limiter({}, res, () => {
      passed += 1;
    });
  }

  assert.equal(passed, 2);
  assert.deepEqual(statuses, [429]);
});
