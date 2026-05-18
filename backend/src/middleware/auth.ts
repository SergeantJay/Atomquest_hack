import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthUser, JwtPayload, UserRole } from '../types';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'goaltrack-super-secret-jwt-key-change-in-production-2026';

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, managerId: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'User account not found or has been deactivated.' });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Your session has expired. Please log in again.' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid authentication token.' });
    }
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}

export function generateToken(user: AuthUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}
