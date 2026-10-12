// Small fixed-window rate limiter kept in process memory. It is enough for a single
// backend instance; multiple instances would need a shared store such as Redis.
const createRateLimiter = ({ windowMs, max, keyGenerator, message }) => {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) {
        hits.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        message: message || 'Too many requests, please try again later',
      });
    }

    return next();
  };
};

module.exports = createRateLimiter;
