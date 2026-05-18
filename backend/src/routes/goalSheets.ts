import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { createAuditLog } from '../utils/audit';
import { createNotification } from '../utils/notification';
import {
  sendGoalApprovedEmail,
  sendGoalReturnedEmail,
  sendGoalSubmittedEmail,
} from '../utils/email';

const router = Router();
router.use(authMiddleware);

// ---------- Helper ----------
const SHEET_INCLUDE = {
  employee: { select: { id: true, name: true, email: true, department: true } },
  cycle: true,
  approvedBy: { select: { id: true, name: true, email: true } },
  goals: {
    include: {
      thrustArea: true,
      achievements: true,
      linkedGoals: { select: { id: true, goalSheetId: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  checkIns: {
    include: { manager: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' as const },
  },
};

// ---------- Routes ----------

// GET /api/goal-sheets  (employee=own, manager=team, admin=all)
router.get('/', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { cycleId } = req.query;

  let where: Record<string, unknown> = {};
  if (cycleId) where.cycleId = cycleId as string;

  if (user.role === 'EMPLOYEE') {
    where.employeeId = user.id;
  } else if (user.role === 'MANAGER') {
    // Show sheets for direct reports
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    where.employeeId = { in: teamIds };
  }
  // ADMIN sees all

  const sheets = await prisma.goalSheet.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      cycle: { select: { id: true, name: true, year: true, phase: true } },
      approvedBy: { select: { id: true, name: true } },
      _count: { select: { goals: true, checkIns: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: sheets });
});

// GET /api/goal-sheets/mine?cycleId= (employee only)
router.get('/mine', requireRole('EMPLOYEE', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { cycleId } = req.query;

  const where: Record<string, unknown> = { employeeId: user.id };
  if (cycleId) where.cycleId = cycleId as string;

  const sheet = await prisma.goalSheet.findFirst({
    where,
    include: SHEET_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ success: true, data: sheet || null });
});

// GET /api/goal-sheets/pending  (manager or admin)
router.get('/pending', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;

  let employeeFilter: Record<string, unknown> = {};
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    employeeFilter = { employeeId: { in: teamIds } };
  }

  const sheets = await prisma.goalSheet.findMany({
    where: { status: 'SUBMITTED', ...employeeFilter },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      cycle: { select: { id: true, name: true, year: true, phase: true } },
      _count: { select: { goals: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });

  res.json({ success: true, data: sheets });
});

// GET /api/goal-sheets/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: req.params.id },
    include: SHEET_INCLUDE,
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);

  // Access control
  if (user.role === 'EMPLOYEE' && sheet.employeeId !== user.id) {
    throw createError('You do not have permission to view this goal sheet.', 403);
  }
  if (user.role === 'MANAGER') {
    const isTeam = await prisma.user.findFirst({
      where: { id: sheet.employeeId, managerId: user.id },
    });
    if (!isTeam) throw createError('This employee is not in your team.', 403);
  }

  res.json({ success: true, data: sheet });
});

// POST /api/goal-sheets  (employee creates for active cycle)
router.post('/', requireRole('EMPLOYEE', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { cycleId, employeeId } = req.body;

  // If admin is creating on behalf of an employee
  const targetEmployeeId = user.role === 'ADMIN' && employeeId ? employeeId : user.id;

  // Find active cycle
  let resolvedCycleId = cycleId;
  if (!resolvedCycleId) {
    const active = await prisma.goalCycle.findFirst({ where: { isActive: true } });
    if (!active) throw createError('No active goal cycle found. Please contact your administrator.', 400);
    resolvedCycleId = active.id;
  }

  // Check duplicate
  const existing = await prisma.goalSheet.findFirst({
    where: { employeeId: targetEmployeeId, cycleId: resolvedCycleId },
  });
  if (existing) {
    throw createError('A goal sheet already exists for this cycle.', 409);
  }

  const sheet = await prisma.goalSheet.create({
    data: { employeeId: targetEmployeeId, cycleId: resolvedCycleId, status: 'DRAFT' },
    include: SHEET_INCLUDE,
  });

  res.status(201).json({ success: true, data: sheet, message: 'Goal sheet created.' });
});

// POST /api/goal-sheets/:id/submit
router.post('/:id/submit', requireRole('EMPLOYEE'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: req.params.id },
    include: { goals: true, cycle: true, employee: { select: { name: true, email: true } } },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);
  if (sheet.employeeId !== user.id) throw createError('You can only submit your own goal sheet.', 403);
  if (sheet.status !== 'DRAFT' && sheet.status !== 'RETURNED') {
    throw createError(`Cannot submit a sheet with status: ${sheet.status}.`, 400);
  }

  // Validate goals
  if (sheet.goals.length === 0) throw createError('You must add at least one goal before submitting.', 400);
  if (sheet.goals.length > 8) throw createError('You cannot have more than 8 goals.', 400);

  const totalWeightage = sheet.goals.reduce((sum, g) => sum + g.weightage, 0);
  if (Math.abs(totalWeightage - 100) > 0.01) {
    throw createError(`Total weightage must equal 100%. Current total: ${totalWeightage}%.`, 400);
  }

  const underMinGoal = sheet.goals.find(g => g.weightage < 10);
  if (underMinGoal) {
    throw createError(`Each goal must have at least 10% weightage. Goal "${underMinGoal.title}" has ${underMinGoal.weightage}%.`, 400);
  }

  const updated = await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
    include: SHEET_INCLUDE,
  });

  await createAuditLog({
    entityType: 'GoalSheet',
    entityId: sheet.id,
    action: 'SUBMITTED',
    userId: user.id,
    goalSheetId: sheet.id,
    newValue: { status: 'SUBMITTED' },
  });

  // Notify manager
  const manager = await prisma.user.findFirst({ where: { id: user.managerId || undefined } });
  if (manager) {
    await createNotification({
      userId: manager.id,
      type: 'GOAL_SUBMITTED',
      message: `${sheet.employee.name} has submitted their goal sheet for cycle "${sheet.cycle.name}".`,
      link: `/goal-sheets/${sheet.id}`,
    });
    await sendGoalSubmittedEmail(manager.email, sheet.employee.name, sheet.cycle.name);
  }

  res.json({ success: true, data: updated, message: 'Goal sheet submitted for approval.' });
});

// POST /api/goal-sheets/:id/approve  (manager or admin)
router.post('/:id/approve', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const sheet = await prisma.goalSheet.findUnique({
    where: { id: req.params.id },
    include: { goals: true, cycle: true, employee: { select: { id: true, name: true, email: true, managerId: true } } },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);
  if (sheet.status !== 'SUBMITTED') {
    throw createError(`Cannot approve a sheet with status: ${sheet.status}. Only SUBMITTED sheets can be approved.`, 400);
  }

  // Validate manager owns this employee
  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) {
    throw createError('You can only approve sheets for your direct reports.', 403);
  }

  // Lock all goals
  await prisma.goal.updateMany({
    where: { goalSheetId: sheet.id },
    data: { isLocked: true },
  });

  const updated = await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: { status: 'APPROVED', approvedAt: new Date(), approvedById: user.id },
    include: SHEET_INCLUDE,
  });

  await createAuditLog({
    entityType: 'GoalSheet',
    entityId: sheet.id,
    action: 'APPROVED',
    userId: user.id,
    goalSheetId: sheet.id,
    newValue: { status: 'APPROVED', approvedById: user.id },
  });

  await createNotification({
    userId: sheet.employee.id,
    type: 'GOAL_APPROVED',
    message: `Your goal sheet for cycle "${sheet.cycle.name}" has been approved. Your goals are now locked.`,
    link: `/goal-sheets/${sheet.id}`,
  });
  await sendGoalApprovedEmail(sheet.employee.email, sheet.cycle.name);

  res.json({ success: true, data: updated, message: 'Goal sheet approved and goals locked.' });
});

// POST /api/goal-sheets/:id/return  (manager or admin)
router.post('/:id/return', requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { comment } = req.body;

  const sheet = await prisma.goalSheet.findUnique({
    where: { id: req.params.id },
    include: { cycle: true, employee: { select: { id: true, name: true, email: true, managerId: true } } },
  });

  if (!sheet) throw createError('Goal sheet not found.', 404);
  if (sheet.status !== 'SUBMITTED') {
    throw createError(`Cannot return a sheet with status: ${sheet.status}.`, 400);
  }
  if (user.role === 'MANAGER' && sheet.employee.managerId !== user.id) {
    throw createError('You can only return sheets for your direct reports.', 403);
  }

  const updated = await prisma.goalSheet.update({
    where: { id: sheet.id },
    data: { status: 'RETURNED' },
    include: SHEET_INCLUDE,
  });

  await createAuditLog({
    entityType: 'GoalSheet',
    entityId: sheet.id,
    action: 'RETURNED',
    oldValue: { status: 'SUBMITTED' },
    newValue: { status: 'RETURNED', returnComment: comment },
    userId: user.id,
    goalSheetId: sheet.id,
  });

  await createNotification({
    userId: sheet.employee.id,
    type: 'GOAL_RETURNED',
    message: `Your goal sheet for cycle "${sheet.cycle.name}" has been returned for rework.${comment ? ` Reason: ${comment}` : ''}`,
    link: `/goal-sheets/${sheet.id}`,
  });
  await sendGoalReturnedEmail(sheet.employee.email, sheet.cycle.name);

  res.json({ success: true, data: updated, message: 'Goal sheet returned for rework.' });
});

export default router;
