import jwt from 'jsonwebtoken';

// Web clients send the httpOnly `token` cookie; the mobile app has no cookie
// jar, so it sends the same JWT as `Authorization: Bearer <token>`.
export function readUserId(req) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch {
    return null;
  }
}

export default function requireAuth(req, res, next) {
  const userId = readUserId(req);
  if (!userId) return res.status(401).json({ message: 'Not signed in' });
  req.userId = userId;
  next();
}

/** Sets req.userId when signed in, but lets anonymous requests through. */
export function optionalAuth(req, _res, next) {
  req.userId = readUserId(req);
  next();
}
