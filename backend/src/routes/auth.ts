import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authMiddleware, generateToken } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw createError('Email and password are required.', 400);

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) throw createError('Invalid email or password.', 401);

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) throw createError('Invalid email or password.', 401);

  const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role as 'EMPLOYEE' | 'MANAGER' | 'ADMIN', managerId: user.managerId });

  res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department, managerId: user.managerId } } });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, department: true, managerId: true, manager: { select: { id: true, name: true, email: true } }, createdAt: true },
  });
  if (!user) throw createError('User not found.', 404);
  res.json({ success: true, data: user });
});

export default router;
