import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Not signed in' });
  }
}