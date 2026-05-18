import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';
import { calculateScore } from '../utils/scoring';
import { UomType } from '../types';

const router = Router();
router.use(authMiddleware);

// GET /api/reports/stats  (any authenticated user — used by admin dashboard)
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  const [totalUsers, totalEmployees, totalManagers, totalSheets, submittedSheets, approvedSheets, activeCycles] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'EMPLOYEE' } }),
    prisma.user.count({ where: { role: 'MANAGER' } }),
    prisma.goalSheet.count(),
    prisma.goalSheet.count({ where: { status: 'SUBMITTED' } }),
    prisma.goalSheet.count({ where: { status: 'APPROVED' } }),
    prisma.goalCycle.count({ where: { isActive: true } }),
  ]);

  const completionRate = totalSheets > 0 ? Math.round((approvedSheets / totalSheets) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      totalEmployees,
      totalManagers,
      activeCycles,
      totalGoalSheets: totalSheets,
      submittedSheets,
      approvedSheets,
      pendingApprovals: submittedSheets,
      completionRate,
    },
  });
});

router.use(requireRole('MANAGER', 'ADMIN'));

// ---------- CSV builder ----------
function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map(row => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// GET /api/reports/achievement?cycleId=&employeeId=&format=json|csv
router.get('/achievement', async (req: AuthRequest, res: Response) => {
  const { cycleId, employeeId, format = 'json' } = req.query;
  const user = req.user!;

  let employeeFilter: Record<string, unknown> = {};

  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    employeeFilter = { employeeId: { in: teamIds } };
  }
  if (employeeId) {
    employeeFilter.employeeId = employeeId as string;
  }

  const where: Record<string, unknown> = {
    status: 'APPROVED',
    ...employeeFilter,
  };
  if (cycleId) where.cycleId = cycleId as string;

  const sheets = await prisma.goalSheet.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      cycle: { select: { id: true, name: true, year: true, phase: true } },
      goals: {
        include: {
          thrustArea: { select: { name: true } },
          achievements: { orderBy: { quarter: 'asc' } },
        },
      },
    },
    orderBy: [{ cycle: { year: 'desc' } }, { employee: { name: 'asc' } }],
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  interface ReportRow {
    employee: string;
    email: string;
    department: string | null;
    cycle: string;
    goalTitle: string;
    thrustArea: string;
    uomType: string;
    target: number;
    weightage: number;
    q1Actual: number | null;
    q1Score: number;
    q2Actual: number | null;
    q2Score: number;
    q3Actual: number | null;
    q3Score: number;
    q4Actual: number | null;
    q4Score: number;
    status: string;
    [key: string]: unknown;
  }

  const reportRows: ReportRow[] = [];

  for (const sheet of sheets) {
    for (const goal of sheet.goals) {
      const row: ReportRow = {
        employee: sheet.employee.name,
        email: sheet.employee.email,
        department: sheet.employee.department,
        cycle: sheet.cycle.name,
        goalTitle: goal.title,
        thrustArea: goal.thrustArea.name,
        uomType: goal.uomType,
        target: goal.target,
        weightage: goal.weightage,
        q1Actual: null,
        q1Score: 0,
        q2Actual: null,
        q2Score: 0,
        q3Actual: null,
        q3Score: 0,
        q4Actual: null,
        q4Score: 0,
        status: 'NOT_STARTED',
      };

      for (const q of quarters) {
        const ach = goal.achievements.find(a => a.quarter === q);
        if (ach) {
          const score = calculateScore(
            goal.uomType as UomType,
            goal.target,
            ach.actual,
            goal.weightage,
            goal.targetDate,
            ach.actualDate
          );
          const key = q.toLowerCase();
          (row as Record<string, unknown>)[`${key}Actual`] = ach.actual;
          (row as Record<string, unknown>)[`${key}Score`] = score.score;
          row.status = ach.status;
        }
      }

      reportRows.push(row);
    }
  }

  if (format === 'csv') {
    const headers = [
      'Employee', 'Email', 'Department', 'Cycle', 'Goal', 'Thrust Area', 'UoM Type',
      'Target', 'Weightage (%)',
      'Q1 Actual', 'Q1 Score', 'Q2 Actual', 'Q2 Score',
      'Q3 Actual', 'Q3 Score', 'Q4 Actual', 'Q4 Score', 'Status',
    ];
    const rows = reportRows.map(r => [
      r.employee, r.email, r.department, r.cycle, r.goalTitle, r.thrustArea, r.uomType,
      r.target, r.weightage,
      r.q1Actual, r.q1Score, r.q2Actual, r.q2Score,
      r.q3Actual, r.q3Score, r.q4Actual, r.q4Score, r.status,
    ]);
    const csv = buildCsv(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="achievement-report-${Date.now()}.csv"`);
    return res.send(csv);
  }

  res.json({ success: true, data: reportRows, total: reportRows.length });
});

// GET /api/reports/completion  - check-in completion dashboard
router.get('/completion', async (req: AuthRequest, res: Response) => {
  const { cycleId } = req.query;
  const user = req.user!;

  let employeeFilter: Record<string, unknown> = {};
  if (user.role === 'MANAGER') {
    const teamIds = await prisma.user
      .findMany({ where: { managerId: user.id }, select: { id: true } })
      .then(us => us.map(u => u.id));
    employeeFilter = { employeeId: { in: teamIds } };
  }

  const where: Record<string, unknown> = { status: 'APPROVED', ...employeeFilter };
  if (cycleId) where.cycleId = cycleId as string;

  const sheets = await prisma.goalSheet.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      cycle: { select: { id: true, name: true } },
      checkIns: { select: { quarter: true, createdAt: true } },
    },
    orderBy: { employee: { name: 'asc' } },
  });

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const data = sheets.map(sheet => {
    const checkinMap: Record<string, boolean> = {};
    for (const ci of sheet.checkIns) {
      checkinMap[ci.quarter] = true;
    }
    const completedCount = quarters.filter(q => checkinMap[q]).length;
    return {
      sheetId: sheet.id,
      employee: sheet.employee,
      cycle: sheet.cycle,
      checkIns: quarters.map(q => ({
        quarter: q,
        done: !!checkinMap[q],
      })),
      completedCheckIns: completedCount,
      totalCheckIns: quarters.length,
      completionPct: Math.round((completedCount / quarters.length) * 100),
    };
  });

  const summary = {
    totalEmployees: data.length,
    fullyCompleted: data.filter(d => d.completedCheckIns === 4).length,
    partiallyCompleted: data.filter(d => d.completedCheckIns > 0 && d.completedCheckIns < 4).length,
    notStarted: data.filter(d => d.completedCheckIns === 0).length,
  };

  res.json({ success: true, data, summary });
});

// GET /api/reports/audit-trail?entityId=&from=&to=&entityType=
router.get('/audit-trail', async (req: AuthRequest, res: Response) => {
  const { entityId, entityType, from, to, goalSheetId } = req.query;

  const where: Record<string, unknown> = {};
  if (entityId) where.entityId = entityId as string;
  if (entityType) where.entityType = entityType as string;
  if (goalSheetId) where.goalSheetId = goalSheetId as string;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from as string) } : {}),
      ...(to ? { lte: new Date(to as string) } : {}),
    };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      goalSheet: {
        select: {
          id: true,
          employee: { select: { id: true, name: true } },
          cycle: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  res.json({ success: true, data: logs, total: logs.length });
});

export default router;
