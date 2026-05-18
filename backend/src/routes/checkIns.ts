import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { createNotification } from '../utils/notification';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// POST /api/goal-sheets/:id/checkins  (manager or admin)
router.post('/', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id: sheetId } = req.params;
  const { quarter, comment } = req.body;

  if (!quarter || !['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
    throw createError('A valid quarter (Q1, Q2, Q3, Q4) is required.', 400);
  }
  if (!comment || !comment.trim()) {
    throw createError('Comment is required for a check-in.', 400);
  }

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { employee: { select: { id: true, name: true, managerId: true } }, cycle: true },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);

  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) {
    throw createError('You can only add check-ins for your direct reports.', 403);
  }

  if (sheet.status !== 'APPROVED') {
    throw createError('Check-ins can only be added to approved (locked) goal sheets.', 400);
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      goalSheetId: sheetId,
      managerId: user.id,
      quarter,
      comment: comment.trim(),
    },
    include: {
      manager: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify employee
  await createNotification({
    userId: sheet.employee.id,
    type: 'CHECKIN_ADDED',
    message: `Your manager added a ${quarter} check-in comment for cycle "${sheet.cycle.name}".`,
    link: `/goal-sheets/${sheetId}`,
  });

  res.status(201).json({ success: true, data: checkIn, message: `${quarter} check-in added.` });
});

// PUT /api/goal-sheets/:id/checkins/:checkInId
router.put('/:checkInId', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const { checkInId } = req.params;
  const { comment } = req.body;
  if (!comment?.trim()) throw createError('Comment is required.', 400);

  const checkIn = await prisma.checkIn.update({
    where: { id: checkInId },
    data: { comment: comment.trim() },
    include: { manager: { select: { id: true, name: true } } },
  });

  res.json({ success: true, data: checkIn, message: 'Check-in updated.' });
});

// GET /api/goal-sheets/:id/checkins
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id: sheetId } = req.params;

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { employee: { select: { managerId: true } } },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);

  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) {
    throw createError('Access denied.', 403);
  }
  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) {
    throw createError('Not your team member.', 403);
  }

  const checkIns = await prisma.checkIn.findMany({
    where: { goalSheetId: sheetId },
    include: { manager: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: checkIns });
});

export default router;
