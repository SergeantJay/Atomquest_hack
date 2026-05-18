import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { createNotifications } from '../utils/notification';
import { createAuditLog } from '../utils/audit';

const router = Router();
router.use(authMiddleware);

/**
 * POST /api/shared-goals
 * Admin or Manager pushes a shared goal to multiple employees.
 */
router.post('/', requireRole('ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { goalData, employeeIds, cycleId } = req.body;

  if (!goalData || !employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw createError('goalData and a non-empty employeeIds array are required.', 400);
  }

  const { thrustAreaId, title, uomType, target, weightage } = goalData;
  if (!thrustAreaId || !title || !uomType || target === undefined || weightage === undefined) {
    throw createError('goalData must include thrustAreaId, title, uomType, target, weightage.', 400);
  }

  const validUom = ['MIN', 'MAX', 'TIMELINE', 'ZERO'];
  if (!validUom.includes(uomType)) {
    throw createError(`Invalid uomType. Must be one of: ${validUom.join(', ')}.`, 400);
  }

  // Manager can only push to direct reports
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    const unauthorized = employeeIds.filter((id: string) => !teamIds.includes(id));
    if (unauthorized.length > 0) {
      throw createError('Some employees are not your direct reports.', 403);
    }
  }

  // Resolve cycle
  let resolvedCycleId = cycleId;
  if (!resolvedCycleId) {
    const active = await prisma.goalCycle.findFirst({ where: { isActive: true } });
    if (!active) throw createError('No active goal cycle. Provide a cycleId explicitly.', 400);
    resolvedCycleId = active.id;
  }

  const createdGoals = [];

  for (const empId of employeeIds) {
    // Ensure goal sheet exists
    let sheet = await prisma.goalSheet.findFirst({
      where: { employeeId: empId, cycleId: resolvedCycleId },
    });

    if (!sheet) {
      sheet = await prisma.goalSheet.create({
        data: { employeeId: empId, cycleId: resolvedCycleId, status: 'DRAFT' },
      });
    }

    // Check goal count
    const count = await prisma.goal.count({ where: { goalSheetId: sheet.id } });
    if (count >= 8) {
      continue; // skip this employee, already at max
    }

    const goal = await prisma.goal.create({
      data: {
        goalSheetId: sheet.id,
        thrustAreaId: goalData.thrustAreaId,
        title: goalData.title.trim(),
        description: goalData.description?.trim() || null,
        uomType: goalData.uomType,
        target: Number(goalData.target),
        targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
        weightage: Number(goalData.weightage),
        isShared: true,
        isLocked: false,
      },
    });

    createdGoals.push(goal);

    await createAuditLog({
      entityType: 'Goal',
      entityId: goal.id,
      action: 'SHARED_GOAL_PUSHED',
      newValue: { pushedBy: user.id, employeeId: empId },
      userId: user.id,
      goalSheetId: sheet.id,
    });
  }

  // Notify affected employees
  const notifs = employeeIds.map((empId: string) => ({
    userId: empId,
    type: 'SHARED_GOAL_ADDED',
    message: `A shared goal "${goalData.title}" has been added to your goal sheet by ${user.role === 'MANAGER' ? 'your manager' : 'admin'}.`,
    link: '/goal-sheets',
  }));
  await createNotifications(notifs);

  res.status(201).json({
    success: true,
    data: { createdCount: createdGoals.length, goals: createdGoals },
    message: `Shared goal pushed to ${createdGoals.length} of ${employeeIds.length} employee(s).`,
  });
});

export default router;
