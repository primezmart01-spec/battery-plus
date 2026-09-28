import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne, run } from '../db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  adminId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'chaudhary_battery_f10_secure_jwt_secret_2026_super_safe_min32';

export function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Extract user from token in headers or cookies
export function authenticateOptional(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === 'cbf10_token') {
        token = val;
        break;
      }
    }
  }

  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      const user = queryOne<AuthenticatedUser>(
        'SELECT id, email, first_name, last_name, phone, role, status FROM users WHERE id = ?;',
        [decoded.id]
      );
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  }
  next();
}

// Require valid authentication
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  authenticateOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.'
      });
      return;
    }
    next();
  });
}

// Require Admin or Super Admin role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator privileges required.'
      });
      return;
    }
    req.adminId = req.user.id;
    next();
  });
}

// Audit logger for sensitive actions
export function logAuditAction(
  adminId: string | undefined,
  adminEmail: string | undefined,
  action: string,
  targetType: string,
  targetId: string,
  ipAddress: string,
  details: string
): void {
  try {
    const now = Date.now();
    const id = `audit_${now}_${Math.random().toString(36).substring(2, 7)}`;
    run(
      `INSERT INTO audit_logs (id, admin_id, admin_email, action, target_type, target_id, ip_address, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, adminId || 'system', adminEmail || 'system', action, targetType, targetId, ipAddress, details, now]
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// Rate limiting in-memory map
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: { windowMs: number; maxAttempts: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}_${ip}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (record.count >= options.maxAttempts) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.status(429).json({
        success: false,
        error: options.message,
        retryAfterSeconds: waitSeconds
      });
      return;
    }

    record.count += 1;
    next();
  };
}
