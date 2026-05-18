import { Router, Response } from 'express';
import prisma from '../prisma';
import { authMiddleware } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../types';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { unreadOnly } = req.query;
  const where: Record<string, unknown> = { userId: req.user!.id };
  if (unreadOnly === 'true') where.isRead = false;
  const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  const unreadCount = await prisma.notification.count({ where: { userId: req.user!.id, isRead: false } });
  res.json({ success: true, data: notifications, unreadCount });
});

router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif) throw createError('Notification not found.', 404);
  if (notif.userId !== req.user!.id) throw createError('Access denied.', 403);
  const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
  res.json({ success: true, data: updated });
});

router.patch('/read-all', async (req: AuthRequest, res: Response) => {
  await prisma.notification.updateMany({ where: { userId: req.user!.id, isRead: false }, data: { isRead: true } });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

export default router;
