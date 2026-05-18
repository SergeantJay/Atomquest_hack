import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req: AuthRequest, res: Response) => {
  const cycles = await prisma.goalCycle.findMany({ orderBy: [{ year: 'desc' }, { createdAt: 'desc' }], include: { _count: { select: { goalSheets: true } } } });
  res.json({ success: true, data: cycles });
});

router.get('/active', async (_req: AuthRequest, res: Response) => {
  const cycle = await prisma.goalCycle.findFirst({ where: { isActive: true }, include: { _count: { select: { goalSheets: true } } } });
  res.json({ success: true, data: cycle || null });
});

router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { name, year, phase, windowOpens, windowCloses, isActive } = req.body;
  const validPhases = ['GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4'];
  if (!name || !year || !phase || !windowOpens || !windowCloses) throw createError('name, year, phase, windowOpens, and windowCloses are required.', 400);
  if (!validPhases.includes(phase)) throw createError(`Invalid phase.`, 400);
  const cycle = await prisma.goalCycle.create({ data: { name: name.trim(), year: Number(year), phase, windowOpens: new Date(windowOpens), windowCloses: new Date(windowCloses), isActive: isActive ?? false } });
  res.status(201).json({ success: true, data: cycle, message: 'Goal cycle created.' });
});

router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, year, phase, windowOpens, windowCloses, isActive } = req.body;
  const existing = await prisma.goalCycle.findUnique({ where: { id } });
  if (!existing) throw createError('Goal cycle not found.', 404);
  const data: Record<string, unknown> = {};
  if (name) data.name = name.trim();
  if (year) data.year = Number(year);
  if (phase) data.phase = phase;
  if (windowOpens) data.windowOpens = new Date(windowOpens);
  if (windowCloses) data.windowCloses = new Date(windowCloses);
  if (isActive !== undefined) data.isActive = isActive;
  const cycle = await prisma.goalCycle.update({ where: { id }, data });
  res.json({ success: true, data: cycle, message: 'Goal cycle updated.' });
});

router.put('/:id/activate', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.goalCycle.findUnique({ where: { id } });
  if (!existing) throw createError('Goal cycle not found.', 404);
  await prisma.goalCycle.updateMany({ data: { isActive: false } });
  const cycle = await prisma.goalCycle.update({ where: { id }, data: { isActive: true } });
  res.json({ success: true, data: cycle, message: `Cycle "${cycle.name}" is now active.` });
});

router.patch('/:id/activate', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const existing = await prisma.goalCycle.findUnique({ where: { id } });
  if (!existing) throw createError('Goal cycle not found.', 404);
  await prisma.goalCycle.updateMany({ data: { isActive: false } });
  const cycle = await prisma.goalCycle.update({ where: { id }, data: { isActive: true } });
  res.json({ success: true, data: cycle, message: `Cycle "${cycle.name}" is now active.` });
});

export default router;
