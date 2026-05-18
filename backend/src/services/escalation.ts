import prisma from '../prisma';
import { sendEscalationEmail } from '../utils/email';
import { createNotifications } from '../utils/notification';

interface EscalationResult {
  rulesRan: number;
  escalationsTriggered: number;
  details: Array<{
    triggerType: string;
    affectedUsers: string[];
    message: string;
  }>;
}

export async function runEscalationCheck(): Promise<EscalationResult> {
  const rules = await prisma.escalationRule.findMany({ where: { isActive: true } });

  const result: EscalationResult = {
    rulesRan: rules.length,
    escalationsTriggered: 0,
    details: [],
  };

  const now = new Date();

  for (const rule of rules) {
    const threshold = new Date(now.getTime() - rule.daysThreshold * 24 * 60 * 60 * 1000);

    if (rule.triggerType === 'GOAL_NOT_SUBMITTED') {
      const activeCycle = await prisma.goalCycle.findFirst({ where: { isActive: true } });
      if (!activeCycle) continue;

      const staleDrafts = await prisma.goalSheet.findMany({
        where: {
          cycleId: activeCycle.id,
          status: 'DRAFT',
          createdAt: { lte: threshold },
        },
        include: {
          employee: { select: { id: true, name: true, email: true, managerId: true } },
          cycle: { select: { name: true } },
        },
      });

      if (staleDrafts.length === 0) continue;

      const notifications = staleDrafts.map(sheet => ({
        userId: sheet.employee.id,
        type: 'ESCALATION_GOAL_NOT_SUBMITTED',
        message: `Reminder: Your goal sheet for cycle "${sheet.cycle.name}" has been in DRAFT for more than ${rule.daysThreshold} days. Please submit it for approval.`,
        link: `/goal-sheets/${sheet.id}`,
      }));

      await createNotifications(notifications);

      for (const sheet of staleDrafts) {
        await sendEscalationEmail(
          sheet.employee.email,
          `GoalTrack: Please submit your goals (overdue by ${rule.daysThreshold}+ days)`,
          `Hi ${sheet.employee.name},\n\nYour goal sheet for cycle "${sheet.cycle.name}" has been in DRAFT status for more than ${rule.daysThreshold} days.\n\nPlease log in to GoalTrack and submit your goals for manager approval.\n\nRegards,\nGoalTrack`
        );

        if (sheet.employee.managerId) {
          await sendEscalationEmail(
            (await prisma.user.findUnique({ where: { id: sheet.employee.managerId } }))?.email || '',
            `GoalTrack: ${sheet.employee.name} has not submitted goals`,
            `Hi,\n\n${sheet.employee.name} has not submitted their goal sheet for cycle "${sheet.cycle.name}" (${rule.daysThreshold}+ days overdue).\n\nRegards,\nGoalTrack`
          );
        }
      }

      result.escalationsTriggered += staleDrafts.length;
      result.details.push({
        triggerType: rule.triggerType,
        affectedUsers: staleDrafts.map(s => s.employee.email),
        message: `${staleDrafts.length} employee(s) have not submitted goals in ${rule.daysThreshold}+ days.`,
      });
    }

    if (rule.triggerType === 'GOAL_NOT_APPROVED') {
      const pendingSheets = await prisma.goalSheet.findMany({
        where: {
          status: 'SUBMITTED',
          submittedAt: { lte: threshold },
        },
        include: {
          employee: { select: { id: true, name: true, email: true, managerId: true } },
          cycle: { select: { name: true } },
        },
      });

      if (pendingSheets.length === 0) continue;

      const managerIds = [
        ...new Set(
          pendingSheets
            .map(s => s.employee.managerId)
            .filter(Boolean) as string[]
        ),
      ];

      const managerNotifs = managerIds.map(mId => ({
        userId: mId,
        type: 'ESCALATION_GOAL_NOT_APPROVED',
        message: `Reminder: You have pending goal sheet approvals that are ${rule.daysThreshold}+ days overdue. Please review them.`,
        link: '/goal-sheets/pending',
      }));
      await createNotifications(managerNotifs);

      for (const managerId of managerIds) {
        const manager = await prisma.user.findUnique({ where: { id: managerId } });
        if (manager) {
          const sheets = pendingSheets.filter(s => s.employee.managerId === managerId);
          await sendEscalationEmail(
            manager.email,
            `GoalTrack: You have ${sheets.length} pending approval(s) overdue`,
            `Hi ${manager.name},\n\nThe following employees have been waiting for goal approval for more than ${rule.daysThreshold} days:\n\n${sheets.map(s => `- ${s.employee.name} (cycle: ${s.cycle.name})`).join('\n')}\n\nPlease log in to GoalTrack to review and approve.\n\nRegards,\nGoalTrack`
          );
        }
      }

      result.escalationsTriggered += pendingSheets.length;
      result.details.push({
        triggerType: rule.triggerType,
        affectedUsers: [...new Set(pendingSheets.map(s => s.employee.managerId || ''))],
        message: `${pendingSheets.length} submitted sheet(s) awaiting approval for ${rule.daysThreshold}+ days.`,
      });
    }

    if (rule.triggerType === 'CHECKIN_NOT_DONE') {
      const month = now.getMonth() + 1;
      let currentQuarter = 'Q1';
      if (month >= 7 && month <= 9) currentQuarter = 'Q2';
      else if (month >= 10 && month <= 12) currentQuarter = 'Q3';
      else if (month >= 1 && month <= 3) currentQuarter = 'Q4';

      const approvedSheets = await prisma.goalSheet.findMany({
        where: {
          status: 'APPROVED',
          approvedAt: { lte: threshold },
        },
        include: {
          employee: { select: { id: true, name: true, email: true, managerId: true } },
          cycle: { select: { name: true } },
          checkIns: { where: { quarter: currentQuarter } },
        },
      });

      const sheetsWithoutCheckin = approvedSheets.filter(s => s.checkIns.length === 0);

      if (sheetsWithoutCheckin.length === 0) continue;

      const empNotifs = sheetsWithoutCheckin.map(sheet => ({
        userId: sheet.employee.id,
        type: 'ESCALATION_CHECKIN_NOT_DONE',
        message: `Reminder: Your ${currentQuarter} check-in for cycle "${sheet.cycle.name}" has not been completed yet.`,
        link: `/goal-sheets/${sheet.id}`,
      }));
      await createNotifications(empNotifs);

      for (const sheet of sheetsWithoutCheckin) {
        await sendEscalationEmail(
          sheet.employee.email,
          `GoalTrack: ${currentQuarter} check-in reminder`,
          `Hi ${sheet.employee.name},\n\nYour ${currentQuarter} check-in for cycle "${sheet.cycle.name}" has not been done yet.\n\nPlease log in and update your quarterly achievements.\n\nRegards,\nGoalTrack`
        );
      }

      result.escalationsTriggered += sheetsWithoutCheckin.length;
      result.details.push({
        triggerType: rule.triggerType,
        affectedUsers: sheetsWithoutCheckin.map(s => s.employee.email),
        message: `${sheetsWithoutCheckin.length} employee(s) missing ${currentQuarter} check-in.`,
      });
    }
  }

  return result;
}
