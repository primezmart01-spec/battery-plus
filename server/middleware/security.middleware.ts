import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CustomRequest extends Request {
  requestId?: string;
  startTime?: number;
}

export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Prevent cross-site scripting filter bypass
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Generate unique request correlation ID
  const requestId = crypto.randomUUID();
  (req as CustomRequest).requestId = requestId;
  (req as CustomRequest).startTime = Date.now();
  res.setHeader('X-Request-Id', requestId);

  next();
}

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void {
  const reqId = (req as CustomRequest).requestId || 'unknown';
  // Redact secrets and internal paths from production client logs
  console.error(`[Error] [Request ID: ${reqId}]`, {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Never return stack traces, db queries, or internal file paths to client
  res.status(err.status || 500).json({
    success: false,
    error: err.isPublic ? err.message : 'An error occurred while processing your request. Please try again.',
    requestId: reqId
  });
}
