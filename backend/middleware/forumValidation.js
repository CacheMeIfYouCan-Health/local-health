import { HttpError, badRequest } from '../utils/httpError.js';

/** Rejects non-numeric ids before they reach a BIGINT column. */
export function validateNumericParams(...names) {
  return (req, _res, next) => {
    for (const name of names) {
      if (!/^\d{1,18}$/.test(req.params[name] ?? '')) {
        return next(badRequest(`Path param "${name}" must be a numeric id`));
      }
    }
    next();
  };
}

// Light per-user throttle against accidental double-sends and spam bursts.
const POST_INTERVAL_MS = Number(process.env.FORUM_POST_INTERVAL_MS) || 3000;
const lastPostAt = new Map();

export function rateLimitPosts(req, _res, next) {
  const now = Date.now();
  const last = lastPostAt.get(req.userId) ?? 0;
  if (now - last < POST_INTERVAL_MS) {
    return next(new HttpError(429, 'You are posting too quickly. Try again in a moment.'));
  }
  lastPostAt.set(req.userId, now);
  if (lastPostAt.size > 10_000) lastPostAt.clear();
  next();
}
