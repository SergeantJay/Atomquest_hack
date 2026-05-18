export type Role = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
export type SheetStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RETURNED';
export type UoMType = 'MIN' | 'MAX' | 'TIMELINE' | 'ZERO';
export type GoalStatus = 'NOT_STARTED' | 'ON_TRACK' | 'COMPLETED';
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
  managerId?: string;
  manager?: User;
}

export interface ThrustArea {
  id: string;
  name: string;
  description?: string;
}

export interface GoalCycle {
  id: string;
  name: string;
  year: number;
  phase: string;
  windowOpens: string;
  windowCloses: string;
  isActive: boolean;
}

export interface Achievement {
  id: string;
  goalId: string;
  quarter: Quarter;
  actual?: number;
  actualDate?: string;
  status: GoalStatus;
  score?: number;
}

export interface Goal {
  id: string;
  goalSheetId: string;
  thrustAreaId: string;
  thrustArea?: ThrustArea;
  title: string;
  description?: string;
  uomType: UoMType;
  target: number;
  targetDate?: string;
  weightage: number;
  isShared: boolean;
  isLocked: boolean;
  parentGoalId?: string;
  achievements: Achievement[];
}

export interface GoalSheet {
  id: string;
  employeeId: string;
  employee?: User;
  cycleId: string;
  cycle?: GoalCycle;
  status: SheetStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: User;
  goals: Goal[];
  checkIns?: CheckIn[];
}

export interface CheckIn {
  id: string;
  goalSheetId: string;
  managerId: string;
  manager?: User;
  quarter: Quarter;
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  user?: User;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ReportRow {
  employee: string;
  email: string;
  department?: string | null;
  cycle: string;
  goalTitle: string;
  thrustArea: string;
  uomType: UoMType;
  target: number;
  weightage: number;
  q1Actual?: number | null;
  q1Score?: number;
  q2Actual?: number | null;
  q2Score?: number;
  q3Actual?: number | null;
  q3Score?: number;
  q4Actual?: number | null;
  q4Score?: number;
  status: string;
}

export interface SystemStats {
  totalUsers: number;
  totalEmployees: number;
  totalManagers: number;
  activeCycles: number;
  totalGoalSheets: number;
  submittedSheets: number;
  approvedSheets: number;
  pendingApprovals: number;
  completionRate: number;
}

export interface TeamMemberStatus {
  employee: User;
  goalSheet?: GoalSheet;
  checkInsCompleted: number;
}
