import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { AuthRequest } from '../types';
import { calculateScore } from '../utils/scoring';
import { UomType } from '../types';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('MANAGER', 'ADMIN'));

// GET /api/analytics/qoq-trends?cycleId=&employeeId=&department=
router.get('/qoq-trends', async (req: AuthRequest, res: Response) => {
  const { cycleId, employeeId, department } = req.query;
  const user = req.user!;

  let empWhere: Record<string, unknown> = {};
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    empWhere = { employeeId: { in: teamIds } };
  }
  if (employeeId) empWhere.employeeId = employeeId as string;
  if (department) empWhere.employee = { department: department as string };

  const sheetWhere: Record<string, unknown> = { status: 'APPROVED', ...empWhere };
  if (cycleId) sheetWhere.cycleId = cycleId as string;

  const sheets = await prisma.goalSheet.findMany({
    where: sheetWhere,
    include: {
      employee: { select: { id: true, name: true, department: true } },
      cycle: { select: { id: true, name: true, year: true } },
      goals: {
        include: { achievements: true },
      },
    },
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const trends = sheets.map(sheet => {
    const qScores: Record<string, number> = {};
    for (const q of quarters) {
      let totalWeighted = 0;
      let totalWeight = 0;
      for (const goal of sheet.goals) {
        const ach = goal.achievements.find(a => a.quarter === q);
        if (ach && ach.actual !== null) {
          const r = calculateScore(
            goal.uomType as UomType,
            goal.target,
            ach.actual,
            goal.weightage,
            goal.targetDate,
            ach.actualDate
          );
          totalWeighted += r.weightedScore;
        }
        totalWeight += goal.weightage;
      }
      qScores[q] = totalWeight > 0 ? Math.round((totalWeighted / totalWeight) * 100 * 100) / 100 : 0;
    }

    return {
      employee: sheet.employee,
      cycle: sheet.cycle,
      quarterlyScores: qScores,
      trend: quarters.map(q => ({ quarter: q, score: qScores[q] })),
    };
  });

  // Aggregate department-level stats
  const deptMap: Record<string, { scores: Record<string, number[]> }> = {};
  for (const t of trends) {
    const dept = t.employee.department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { scores: { Q1: [], Q2: [], Q3: [], Q4: [] } };
    for (const q of quarters) {
      deptMap[dept].scores[q].push(t.quarterlyScores[q]);
    }
  }

  const deptTrends = Object.entries(deptMap).map(([dept, d]) => ({
    department: dept,
    trend: quarters.map(q => ({
      quarter: q,
      avgScore:
        d.scores[q].length > 0
          ? Math.round((d.scores[q].reduce((a, b) => a + b, 0) / d.scores[q].length) * 100) / 100
          : 0,
    })),
  }));

  res.json({ success: true, data: { individual: trends, byDepartment: deptTrends } });
});

// GET /api/analytics/goal-distribution?cycleId=
router.get('/goal-distribution', async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  const user = req.user!;

  let sheetWhere: Record<string, unknown> = {};
  if (cycleId) sheetWhere.cycleId = cycleId as string;
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    sheetWhere.employeeId = { in: teamIds };
  }

  const goals = await prisma.goal.findMany({
    where: { goalSheet: sheetWhere },
    include: {
      thrustArea: { select: { name: true } },
      achievements: true,
    },
  });

  const thrustMap: Record<string, number> = {};
  const uomMap: Record<string, number> = {};
  const statusMap: Record<string, number> = { NOT_STARTED: 0, ON_TRACK: 0, COMPLETED: 0 };

  for (const goal of goals) {
    const ta = goal.thrustArea.name;
    thrustMap[ta] = (thrustMap[ta] || 0) + 1;

    uomMap[goal.uomType] = (uomMap[goal.uomType] || 0) + 1;

    const latest = goal.achievements.sort((a, b) =>
      ['Q4', 'Q3', 'Q2', 'Q1'].indexOf(a.quarter) - ['Q4', 'Q3', 'Q2', 'Q1'].indexOf(b.quarter)
    )[0];
    const st = latest ? latest.status : 'NOT_STARTED';
    statusMap[st] = (statusMap[st] || 0) + 1;
  }

  const byThrustArea = Object.entries(thrustMap).map(([name, count]) => ({ name, count }));
  const byUomType = Object.entries(uomMap).map(([type, count]) => ({ type, count }));
  const byStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  res.json({
    success: true,
    data: {
      totalGoals: goals.length,
      byThrustArea,
      byUomType,
      byStatus,
    },
  });
});

// GET /api/analytics/completion-rates?cycleId=
router.get('/completion-rates', async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  const user = req.user!;

  let empFilter: Record<string, unknown> = {};
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    empFilter = { employeeId: { in: teamIds } };
  }

  const sheetWhere: Record<string, unknown> = { status: 'APPROVED', ...empFilter };
  if (cycleId) sheetWhere.cycleId = cycleId as string;

  const sheets = await prisma.goalSheet.findMany({
    where: sheetWhere,
    include: {
      employee: { select: { id: true, name: true, department: true, managerId: true } },
      cycle: { select: { name: true } },
      checkIns: { select: { quarter: true, managerId: true } },
      goals: {
        include: { achievements: { select: { quarter: true, status: true, actual: true } } },
      },
    },
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const qStats: Record<string, { total: number; completed: number; onTrack: number }> = {};
  for (const q of quarters) {
    qStats[q] = { total: 0, completed: 0, onTrack: 0 };
  }

  let totalCheckInSlots = 0;
  let completedCheckIns = 0;

  const managerMap: Record<string, { name: string; totalSlots: number; completed: number }> = {};

  for (const sheet of sheets) {
    const checkInQuarters = new Set(sheet.checkIns.map(ci => ci.quarter));

    const managerId = sheet.employee.managerId;
    if (managerId) {
      const mgr = await prisma.user.findUnique({ where: { id: managerId }, select: { name: true } });
      if (!managerMap[managerId]) {
        managerMap[managerId] = { name: mgr?.name || managerId, totalSlots: 0, completed: 0 };
      }
    }

    for (const q of quarters) {
      totalCheckInSlots++;
      if (checkInQuarters.has(q)) completedCheckIns++;

      if (managerId && managerMap[managerId]) {
        managerMap[managerId].totalSlots++;
        if (checkInQuarters.has(q)) managerMap[managerId].completed++;
      }

      for (const goal of sheet.goals) {
        const ach = goal.achievements.find(a => a.quarter === q);
        qStats[q].total++;
        if (ach?.status === 'COMPLETED') qStats[q].completed++;
        if (ach?.status === 'ON_TRACK') qStats[q].onTrack++;
      }
    }
  }

  const checkInCompletionRate =
    totalCheckInSlots > 0 ? Math.round((completedCheckIns / totalCheckInSlots) * 100) : 0;

  const quarterlyAchievementRates = quarters.map(q => ({
    quarter: q,
    total: qStats[q].total,
    completed: qStats[q].completed,
    onTrack: qStats[q].onTrack,
    completionRate:
      qStats[q].total > 0 ? Math.round((qStats[q].completed / qStats[q].total) * 100) : 0,
  }));

  const managerCompletionRates = Object.entries(managerMap).map(([id, d]) => ({
    managerId: id,
    managerName: d.name,
    totalSlots: d.totalSlots,
    completed: d.completed,
    completionRate: d.totalSlots > 0 ? Math.round((d.completed / d.totalSlots) * 100) : 0,
  }));

  res.json({
    success: true,
    data: {
      totalSheets: sheets.length,
      checkInCompletionRate,
      totalCheckInSlots,
      completedCheckIns,
      quarterlyAchievementRates,
      managerCompletionRates,
    },
  });
});

export default router;
