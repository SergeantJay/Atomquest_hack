import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { runEscalationCheck } from '../services/escalation';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// GET /api/escalations/rules
router.get('/rules', async (_req: AuthRequest, res: Response) => {
  const rules = await prisma.escalationRule.findMany({
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: rules });
});

// POST /api/escalations/rules
router.post('/rules', async (req: AuthRequest, res: Response) => {
  const { triggerType, daysThreshold, isActive } = req.body;

  const validTypes = ['GOAL_NOT_SUBMITTED', 'GOAL_NOT_APPROVED', 'CHECKIN_NOT_DONE'];
  if (!triggerType || !validTypes.includes(triggerType)) {
    throw createError(`triggerType must be one of: ${validTypes.join(', ')}.`, 400);
  }
  if (!daysThreshold || Number(daysThreshold) < 1) {
    throw createError('daysThreshold must be a positive integer.', 400);
  }

  const rule = await prisma.escalationRule.create({
    data: {
      triggerType,
      daysThreshold: Number(daysThreshold),
      isActive: isActive ?? true,
    },
  });

  res.status(201).json({ success: true, data: rule, message: 'Escalation rule created.' });
});

// PUT /api/escalations/rules/:id
router.put('/rules/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { triggerType, daysThreshold, isActive } = req.body;

  const existing = await prisma.escalationRule.findUnique({ where: { id } });
  if (!existing) throw createError('Escalation rule not found.', 404);

  const data: Record<string, unknown> = {};
  if (triggerType) {
    const validTypes = ['GOAL_NOT_SUBMITTED', 'GOAL_NOT_APPROVED', 'CHECKIN_NOT_DONE'];
    if (!validTypes.includes(triggerType)) throw createError('Invalid triggerType.', 400);
    data.triggerType = triggerType;
  }
  if (daysThreshold !== undefined) data.daysThreshold = Number(daysThreshold);
  if (isActive !== undefined) data.isActive = isActive;

  const rule = await prisma.escalationRule.update({ where: { id }, data });
  res.json({ success: true, data: rule, message: 'Escalation rule updated.' });
});

// POST /api/escalations/run  (manually trigger)
router.post('/run', async (_req: AuthRequest, res: Response) => {
  console.log('[ESCALATION] Manual trigger initiated.');
  const result = await runEscalationCheck();
  res.json({ success: true, data: result, message: 'Escalation check completed.' });
});

export default router;
