import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', requireRole('ADMIN'), async (_req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, department: true, managerId: true, manager: { select: { id: true, name: true } }, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: users });
});

router.get('/team', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const members = await prisma.user.findMany({
    where: { managerId: req.user!.id },
    select: { id: true, name: true, email: true, role: true, department: true, managerId: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: members });
});

router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, email, password, role, department, managerId } = req.body;
  if (!name || !email || !password || !role) throw createError('Name, email, password, and role are required.', 400);
  const validRoles = ['EMPLOYEE', 'MANAGER', 'ADMIN'];
  if (!validRoles.includes(role)) throw createError(`Invalid role. Must be one of: ${validRoles.join(', ')}.`, 400);
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name.trim(), email: email.toLowerCase().trim(), password: hashed, role, department: department || null, managerId: managerId || null },
    select: { id: true, name: true, email: true, role: true, department: true, managerId: true, createdAt: true },
  });
  res.status(201).json({ success: true, data: user, message: 'User created successfully.' });
});

router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, role, department, managerId } = req.body;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw createError('User not found.', 404);
  const updateData: Record<string, unknown> = {};
  if (name) updateData.name = name.trim();
  if (email) updateData.email = email.toLowerCase().trim();
  if (password) updateData.password = await bcrypt.hash(password, 12);
  if (role) { if (!['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(role)) throw createError('Invalid role.', 400); updateData.role = role; }
  if (department !== undefined) updateData.department = department;
  if (managerId !== undefined) updateData.managerId = managerId || null;
  const user = await prisma.user.update({ where: { id }, data: updateData, select: { id: true, name: true, email: true, role: true, department: true, managerId: true, updatedAt: true } });
  res.json({ success: true, data: user, message: 'User updated successfully.' });
});

router.delete('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (id === req.user!.id) throw createError('You cannot delete your own account.', 400);
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw createError('User not found.', 404);
  await prisma.user.delete({ where: { id } });
  res.json({ success: true, message: 'User deleted successfully.' });
});

export default router;
