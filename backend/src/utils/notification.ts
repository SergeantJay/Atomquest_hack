import prisma from '../prisma';

interface CreateNotificationOptions {
  userId: string;
  type: string;
  message: string;
  link?: string;
}

export async function createNotification(options: CreateNotificationOptions): Promise<void> {
  try {
    await prisma.notification.create({
      data: { userId: options.userId, type: options.type, message: options.message, link: options.link || null },
    });
  } catch (err) {
    console.error('[NOTIFICATION] Failed to create notification:', err);
  }
}

export async function createNotifications(notifications: CreateNotificationOptions[]): Promise<void> {
  try {
    await prisma.notification.createMany({
      data: notifications.map(n => ({ userId: n.userId, type: n.type, message: n.message, link: n.link || null })),
    });
  } catch (err) {
    console.error('[NOTIFICATION] Failed to create notifications:', err);
  }
}
