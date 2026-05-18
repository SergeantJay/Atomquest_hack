import { Request } from 'express';

export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export type GoalSheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';
export type UomType = 'MIN' | 'MAX' | 'TIMELINE' | 'ZERO';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type AchievementStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED';
export type CyclePhase = 'GOAL_SETTING' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type EscalationTrigger = 'GOAL_NOT_SUBMITTED' | 'GOAL_NOT_APPROVED' | 'CHECKIN_NOT_DONE';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  managerId?: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ScoreResult {
  score: number;
  weightedScore: number;
}
