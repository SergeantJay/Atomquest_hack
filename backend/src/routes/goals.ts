import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

// ---------- Helpers ----------

async function assertSheetAccess(sheetId: string, userId: string, role: string) {
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: { employee: { select: { managerId: true } } },
  });
  if (!sheet) throw createError('Goal sheet not found.', 404);

  if (role === 'EMPLOYEE' && sheet.employeeId !== userId) {
    throw createError('Access denied to this goal sheet.', 403);
  }
  if (role === 'MANAGER' && sheet.employee.managerId !== userId) {
    throw createError('This employee is not your direct report.', 403);
  }
  return sheet;
}

function validateGoalData(data: Record<string, unknown>) {
  const { thrustAreaId, title, uomType, target, weightage } = data;
  if (!thrustAreaId || !title || !uomType || target === undefined || weightage === undefined) {
    throw createError('thrustAreaId, title, uomType, target, and weightage are required.', 400);
  }
  const validUom = ['MIN', 'MAX', 'TIMELINE', 'ZERO'];
  if (!validUom.includes(uomType as string)) {
    throw createError(`Invalid uomType. Must be one of: ${validUom.join(', ')}.`, 400);
  }
  if (Number(weightage) < 10 || Number(weightage) > 100) {
    throw createError('Weightage must be between 10% and 100%.', 400);
  }
}

// ---------- POST /api/goal-sheets/:sheetId/goals ----------
const sheetRouter = Router({ mergeParams: true });
sheetRouter.use(authMiddleware);

sheetRouter.post('/', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { sheetId } = req.params;

  const sheet = await assertSheetAccess(sheetId, user.id, user.role);

  if (user.role === 'EMPLOYEE' && sheet.status !== 'DRAFT' && sheet.status !== 'RETURNED') {
    throw createError('Goals can only be added when the sheet is in DRAFT or RETURNED status.', 400);
  }
  if (user.role === 'MANAGER' && sheet.status !== 'SUBMITTED') {
    throw createError('Managers can only edit goals on SUBMITTED sheets (during review).', 400);
  }

  const currentCount = await prisma.goal.count({ where: { goalSheetId: sheetId } });
  if (currentCount >= 8) {
    throw createError('Maximum of 8 goals per sheet. Please remove a goal before adding a new one.', 400);
  }

  const { thrustAreaId, title, description, uomType, target, targetDate, weightage } = req.body;
  validateGoalData({ thrustAreaId, title, uomType, target, weightage });

  const goal = await prisma.goal.create({
    data: {
      goalSheetId: sheetId,
      thrustAreaId,
      title: title.trim(),
      description: description?.trim() || null,
      uomType,
      target: Number(target),
      targetDate: targetDate ? new Date(targetDate) : null,
      weightage: Number(weightage),
    },
    include: { thrustArea: true, achievements: true },
  });

  await createAuditLog({
    entityType: 'Goal',
    entityId: goal.id,
    action: 'CREATED',
    newValue: goal,
    userId: user.id,
    goalSheetId: sheetId,
  });

  res.status(201).json({ success: true, data: goal, message: 'Goal added.' });
});

export { sheetRouter as goalSheetGoalsRouter };

// ---------- Routes on /api/goals/:id ----------

// PUT /api/goals/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      goalSheet: {
        include: { employee: { select: { managerId: true } } },
      },
    },
  });

  if (!goal) throw createError('Goal not found.', 404);

  const sheet = goal.goalSheet;

  // Access check
  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) {
    throw createError('Access denied.', 403);
  }
  if (user.role === 'MANAGER') {
    if (sheet.employee.managerId !== user.id) throw createError('Not your team member.', 403);
    if (sheet.status !== 'SUBMITTED') throw createError('Managers can only edit goals on SUBMITTED sheets.', 400);
  }

  // Locked check (only admin can bypass)
  if (goal.isLocked && user.role !== 'ADMIN') {
    throw createError('This goal is locked and cannot be edited. Contact an administrator to unlock it.', 403);
  }

  // Shared goal: employees can only change weightage
  if (goal.isShared && goal.parentGoalId && user.role === 'EMPLOYEE') {
    const { weightage } = req.body;
    if (!weightage) throw createError('For shared goals, you can only update the weightage.', 400);
    if (Number(weightage) < 10) throw createError('Weightage must be at least 10%.', 400);

    const old = { weightage: goal.weightage };
    const updated = await prisma.goal.update({
      where: { id },
      data: { weightage: Number(weightage) },
      include: { thrustArea: true, achievements: true },
    });
    await createAuditLog({
      entityType: 'Goal',
      entityId: id,
      action: 'UPDATED',
      oldValue: old,
      newValue: { weightage: Number(weightage) },
      userId: user.id,
      goalSheetId: sheet.id,
    });
    return res.json({ success: true, data: updated, message: 'Goal weightage updated.' });
  }

  const { thrustAreaId, title, description, uomType, target, targetDate, weightage } = req.body;

  const old = {
    thrustAreaId: goal.thrustAreaId,
    title: goal.title,
    uomType: goal.uomType,
    target: goal.target,
    weightage: goal.weightage,
  };

  const data: Record<string, unknown> = {};
  if (thrustAreaId !== undefined) data.thrustAreaId = thrustAreaId;
  if (title !== undefined) data.title = title.trim();
  if (description !== undefined) data.description = description?.trim() || null;
  if (uomType !== undefined) {
    const validUom = ['MIN', 'MAX', 'TIMELINE', 'ZERO'];
    if (!validUom.includes(uomType)) throw createError(`Invalid uomType.`, 400);
    data.uomType = uomType;
  }
  if (target !== undefined) data.target = Number(target);
  if (targetDate !== undefined) data.targetDate = targetDate ? new Date(targetDate) : null;
  if (weightage !== undefined) {
    if (Number(weightage) < 10) throw createError('Weightage must be at least 10%.', 400);
    data.weightage = Number(weightage);
  }

  const updated = await prisma.goal.update({
    where: { id },
    data,
    include: { thrustArea: true, achievements: true },
  });

  await createAuditLog({
    entityType: 'Goal',
    entityId: id,
    action: 'UPDATED',
    oldValue: old,
    newValue: data,
    userId: user.id,
    goalSheetId: sheet.id,
  });

  res.json({ success: true, data: updated, message: 'Goal updated.' });
});

// DELETE /api/goals/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      goalSheet: { include: { employee: { select: { managerId: true } } } },
    },
  });

  if (!goal) throw createError('Goal not found.', 404);

  const sheet = goal.goalSheet;

  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) throw createError('Access denied.', 403);
  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) throw createError('Not your team member.', 403);

  if (goal.isLocked && user.role !== 'ADMIN') {
    throw createError('Cannot delete a locked goal. Contact an administrator.', 403);
  }

  if (user.role === 'EMPLOYEE' && sheet.status !== 'DRAFT' && sheet.status !== 'RETURNED') {
    throw createError('Goals can only be deleted when the sheet is in DRAFT or RETURNED status.', 400);
  }

  await prisma.goal.delete({ where: { id } });

  await createAuditLog({
    entityType: 'Goal',
    entityId: id,
    action: 'DELETED',
    oldValue: goal,
    userId: user.id,
    goalSheetId: sheet.id,
  });

  res.json({ success: true, message: 'Goal deleted.' });
});

// POST /api/admin/goals/:id/unlock  (Admin only)
const adminGoalRouter = Router();
adminGoalRouter.use(authMiddleware);

adminGoalRouter.post('/:id/unlock', requireRole('ADMIN'), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) throw createError('Goal not found.', 404);

  const updated = await prisma.goal.update({
    where: { id },
    data: { isLocked: false },
  });

  await createAuditLog({
    entityType: 'Goal',
    entityId: id,
    action: 'UNLOCKED_BY_ADMIN',
    oldValue: { isLocked: true },
    newValue: { isLocked: false },
    userId: req.user!.id,
    goalSheetId: goal.goalSheetId,
  });

  res.json({ success: true, data: updated, message: 'Goal unlocked by admin.' });
});

export { adminGoalRouter };
export default router;
