import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const areas = await prisma.thrustArea.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { goals: true } } } });
  res.json({ success: true, data: areas });
});

router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name?.trim()) throw createError('Thrust area name is required.', 400);
  const area = await prisma.thrustArea.create({ data: { name: name.trim(), description: description?.trim() || null } });
  res.status(201).json({ success: true, data: area, message: 'Thrust area created.' });
});

router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const existing = await prisma.thrustArea.findUnique({ where: { id } });
  if (!existing) throw createError('Thrust area not found.', 404);
  const area = await prisma.thrustArea.update({ where: { id }, data: { ...(name ? { name: name.trim() } : {}), ...(description !== undefined ? { description: description?.trim() || null } : {}) } });
  res.json({ success: true, data: area, message: 'Thrust area updated.' });
});

export default router;
