import prisma from '../prisma';

interface AuditOptions {
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
  userId: string;
  goalSheetId?: string;
}

export async function createAuditLog(options: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId,
        action: options.action,
        oldValue: options.oldValue !== undefined ? JSON.stringify(options.oldValue) : null,
        newValue: options.newValue !== undefined ? JSON.stringify(options.newValue) : null,
        userId: options.userId,
        goalSheetId: options.goalSheetId || null,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}
