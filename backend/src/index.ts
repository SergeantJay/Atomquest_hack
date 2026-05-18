import 'express-async-errors';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import thrustAreaRoutes from './routes/thrustAreas';
import cycleRoutes from './routes/cycles';
import goalSheetRoutes from './routes/goalSheets';
import goalRoutes, { goalSheetGoalsRouter, adminGoalRouter } from './routes/goals';
import sharedGoalRoutes from './routes/sharedGoals';
import achievementRoutes, { sheetAchievementsRouter } from './routes/achievements';
import checkInRoutes from './routes/checkIns';
import reportRoutes from './routes/reports';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import escalationRoutes from './routes/escalations';

// Scheduler
import { initScheduler } from './services/scheduler';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ──────────────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'GoalTrack API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/thrust-areas', thrustAreaRoutes);
app.use('/api/cycles', cycleRoutes);

// Goal sheets + nested routes
app.use('/api/goal-sheets', goalSheetRoutes);
app.use('/api/goal-sheets/:sheetId/goals', goalSheetGoalsRouter);       // POST add goal to sheet
app.use('/api/goal-sheets/:id/achievements', sheetAchievementsRouter);  // GET achievements
app.use('/api/goal-sheets/:id/checkins', checkInRoutes);                 // GET/POST check-ins

// Goals (standalone: PUT, DELETE) + achievement update
app.use('/api/goals', goalRoutes);
app.use('/api/goals', achievementRoutes);  // PUT /api/goals/:id/achievement

// Admin
app.use('/api/admin/goals', adminGoalRouter);  // POST /api/admin/goals/:id/unlock

// Shared goals
app.use('/api/shared-goals', sharedGoalRoutes);

// Reports & analytics
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', analyticsRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Escalations
app.use('/api/escalations', escalationRoutes);

// ─── Error Handling ─────────────────────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 GoalTrack API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);

  // Start cron scheduler
  initScheduler();
});

export default app;
