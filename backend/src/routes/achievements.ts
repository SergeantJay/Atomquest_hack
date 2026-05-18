import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const VALID_STATUSES = ['NOT_STARTED', 'ON_TRACK', 'COMPLETED'];

// PUT /api/goals/:id/achievement
router.put('/:id/achievement', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { quarter, actual, actualDate, status } = req.body;

  if (!quarter || !VALID_QUARTERS.includes(quarter)) {
    throw createError(`Quarter is required and must be one of: ${VALID_QUARTERS.join(', ')}.`, 400);
  }
  if (status && !VALID_STATUSES.includes(status)) {
    throw createError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`, 400);
  }

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: {
      goalSheet: {
        include: { employee: { select: { managerId: true } } },
      },
      linkedGoals: true,
    },
  });

  if (!goal) throw createError('Goal not found.', 404);

  const sheet = goal.goalSheet;

  // Access control: only the employee who owns the sheet can update
  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) {
    throw createError('You can only update achievements for your own goals.', 403);
  }

  if (sheet.status !== 'APPROVED') {
    throw createError('Achievements can only be logged after the goal sheet is approved.', 400);
  }

  const old = await prisma.achievement.findUnique({
    where: { goalId_quarter: { goalId: id, quarter } },
  });

  const achievement = await prisma.achievement.upsert({
    where: { goalId_quarter: { goalId: id, quarter } },
    create: {
      goalId: id,
      quarter,
      actual: actual !== undefined ? Number(actual) : null,
      actualDate: actualDate ? new Date(actualDate) : null,
      status: status || 'ON_TRACK',
    },
    update: {
      ...(actual !== undefined ? { actual: Number(actual) } : {}),
      ...(actualDate !== undefined ? { actualDate: actualDate ? new Date(actualDate) : null } : {}),
      ...(status ? { status } : {}),
    },
  });

  await createAuditLog({
    entityType: 'Achievement',
    entityId: achievement.id,
    action: old ? 'UPDATED' : 'CREATED',
    oldValue: old,
    newValue: achievement,
    userId: user.id,
    goalSheetId: sheet.id,
  });

  // Sync to linked goals (shared goal propagation)
  if (goal.linkedGoals && goal.linkedGoals.length > 0) {
    for (const linked of goal.linkedGoals) {
      await prisma.achievement.upsert({
        where: { goalId_quarter: { goalId: linked.id, quarter } },
        create: {
          goalId: linked.id,
          quarter,
          actual: actual !== undefined ? Number(actual) : null,
          actualDate: actualDate ? new Date(actualDate) : null,
          status: status || 'ON_TRACK',
        },
        update: {
          ...(actual !== undefined ? { actual: Number(actual) } : {}),
          ...(actualDate !== undefined ? { actualDate: actualDate ? new Date(actualDate) : null } : {}),
          ...(status ? { status } : {}),
        },
      });
    }
  }

  res.json({
    success: true,
    data: achievement,
    message: `Achievement for ${quarter} updated.${goal.linkedGoals.length > 0 ? ` Synced to ${goal.linkedGoals.length} linked goal(s).` : ''}`,
  });
});

// GET /api/goal-sheets/:id/achievements
const sheetAchievementsRouter = Router({ mergeParams: true });
sheetAchievementsRouter.use(authMiddleware);

sheetAchievementsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { id: sheetId } = req.params;

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: sheetId },
    include: {
      employee: { select: { managerId: true } },
      goals: {
        include: {
          thrustArea: { select: { id: true, name: true } },
          achievements: { orderBy: { quarter: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);

  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) {
    throw createError('Access denied.', 403);
  }
  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) {
    throw createError('Not your team member.', 403);
  }

  res.json({ success: true, data: sheet.goals });
});

export { sheetAchievementsRouter };
export default router;
