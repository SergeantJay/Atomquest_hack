import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode: number): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  if (process.env.NODE_ENV === 'development') {
    console.error('[ERROR]', { message, statusCode, stack: err.stack, path: req.path, method: req.method });
  } else {
    if (statusCode >= 500) console.error('[ERROR]', message, err.stack);
  }

  if (err.message?.includes('Unique constraint')) {
    res.status(409).json({ success: false, error: 'A record with this information already exists.' });
    return;
  }

  if (err.message?.includes('Record to update not found') || err.message?.includes('No record was found')) {
    res.status(404).json({ success: false, error: 'The requested resource was not found.' });
    return;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found.` });
}
