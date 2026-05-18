import axios, { AxiosError } from 'axios';
import {
  User,
  GoalCycle,
  ThrustArea,
  GoalSheet,
  Goal,
  Achievement,
  CheckIn,
  Notification,
  AuditLog,
  ReportRow,
  SystemStats,
  TeamMemberStatus,
  Quarter,
  SheetStatus,
} from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Unwrap { success, data } envelope + handle 401
api.interceptors.response.use(
  (response) => {
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const msg =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(msg));
  }
);

// --- Auth ---
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await api.post('/auth/login', { email, password });
    return res.data as { token: string; user: User };
  },
  logout: async (): Promise<void> => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
  },
  me: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

// --- Users ---
export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/users');
    return res.data;
  },
  getById: async (id: string): Promise<User> => {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  },
  create: async (data: Partial<User> & { password: string }): Promise<User> => {
    const res = await api.post<User>('/users', data);
    return res.data;
  },
  update: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await api.put<User>(`/users/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
  getTeam: async (): Promise<TeamMemberStatus[]> => {
    const res = await api.get<TeamMemberStatus[]>('/users/team');
    return res.data;
  },
};

// --- Goal Cycles ---
export const cyclesApi = {
  getAll: async (): Promise<GoalCycle[]> => {
    const res = await api.get<GoalCycle[]>('/cycles');
    return res.data;
  },
  getActive: async (): Promise<GoalCycle | null> => {
    const res = await api.get<GoalCycle | null>('/cycles/active');
    return res.data;
  },
  getById: async (id: string): Promise<GoalCycle> => {
    const res = await api.get<GoalCycle>(`/cycles/${id}`);
    return res.data;
  },
  create: async (data: Partial<GoalCycle>): Promise<GoalCycle> => {
    const res = await api.post<GoalCycle>('/cycles', data);
    return res.data;
  },
  update: async (id: string, data: Partial<GoalCycle>): Promise<GoalCycle> => {
    const res = await api.put<GoalCycle>(`/cycles/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/cycles/${id}`);
  },
  setActive: async (id: string): Promise<GoalCycle> => {
    const res = await api.put<GoalCycle>(`/cycles/${id}/activate`);
    return res.data;
  },
};

// --- Thrust Areas ---
export const thrustAreasApi = {
  getAll: async (): Promise<ThrustArea[]> => {
    const res = await api.get<ThrustArea[]>('/thrust-areas');
    return res.data;
  },
  create: async (data: Partial<ThrustArea>): Promise<ThrustArea> => {
    const res = await api.post<ThrustArea>('/thrust-areas', data);
    return res.data;
  },
  update: async (id: string, data: Partial<ThrustArea>): Promise<ThrustArea> => {
    const res = await api.put<ThrustArea>(`/thrust-areas/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/thrust-areas/${id}`);
  },
};

// --- Goal Sheets ---
export const goalSheetsApi = {
  getMySheet: async (cycleId?: string): Promise<GoalSheet | null> => {
    const params: Record<string, string> = {};
    if (cycleId) params.cycleId = cycleId;
    const res = await api.get<GoalSheet | null>('/goal-sheets/mine', { params });
    return res.data;
  },
  getById: async (id: string): Promise<GoalSheet> => {
    const res = await api.get<GoalSheet>(`/goal-sheets/${id}`);
    return res.data;
  },
  getAll: async (params?: {
    status?: SheetStatus;
    cycleId?: string;
    department?: string;
  }): Promise<GoalSheet[]> => {
    const res = await api.get<GoalSheet[]>('/goal-sheets', { params });
    return res.data;
  },
  getPending: async (): Promise<GoalSheet[]> => {
    const res = await api.get<GoalSheet[]>('/goal-sheets/pending');
    return res.data;
  },
  create: async (cycleId: string): Promise<GoalSheet> => {
    const res = await api.post<GoalSheet>('/goal-sheets', { cycleId });
    return res.data;
  },
  submit: async (id: string): Promise<GoalSheet> => {
    const res = await api.post<GoalSheet>(`/goal-sheets/${id}/submit`);
    return res.data;
  },
  approve: async (id: string): Promise<GoalSheet> => {
    const res = await api.post<GoalSheet>(`/goal-sheets/${id}/approve`);
    return res.data;
  },
  returnForRework: async (id: string, comment: string): Promise<GoalSheet> => {
    const res = await api.post<GoalSheet>(`/goal-sheets/${id}/return`, { comment });
    return res.data;
  },
  getTeamSheets: async (): Promise<GoalSheet[]> => {
    const res = await api.get<GoalSheet[]>('/goal-sheets');
    return res.data;
  },
};

// --- Goals ---
export const goalsApi = {
  addGoal: async (goalSheetId: string, data: Partial<Goal>): Promise<Goal> => {
    const res = await api.post<Goal>(`/goal-sheets/${goalSheetId}/goals`, data);
    return res.data;
  },
  updateGoal: async (_goalSheetId: string, goalId: string, data: Partial<Goal>): Promise<Goal> => {
    const res = await api.put<Goal>(`/goals/${goalId}`, data);
    return res.data;
  },
  deleteGoal: async (_goalSheetId: string, goalId: string): Promise<void> => {
    await api.delete(`/goals/${goalId}`);
  },
  unlockGoal: async (goalId: string): Promise<Goal> => {
    const res = await api.post<Goal>(`/admin/goals/${goalId}/unlock`);
    return res.data;
  },
};

// --- Shared Goals ---
export const sharedGoalsApi = {
  push: async (data: {
    goalData: {
      thrustAreaId: string;
      title: string;
      description?: string;
      uomType: string;
      target: number;
      targetDate?: string;
      weightage: number;
    };
    employeeIds: string[];
    cycleId?: string;
  }): Promise<{ createdCount: number; goals: Goal[] }> => {
    const res = await api.post<{ createdCount: number; goals: Goal[] }>('/shared-goals', data);
    return res.data;
  },
};

// --- Achievements ---
export const achievementsApi = {
  updateAchievement: async (
    goalId: string,
    quarter: Quarter,
    data: { actual?: number; actualDate?: string; status: string }
  ): Promise<Achievement> => {
    const res = await api.put<Achievement>(`/goals/${goalId}/achievement`, { quarter, ...data });
    return res.data;
  },
  getBySheet: async (sheetId: string): Promise<Goal[]> => {
    const res = await api.get<Goal[]>(`/goal-sheets/${sheetId}/achievements`);
    return res.data;
  },
};

// --- Check-ins ---
export const checkInsApi = {
  create: async (goalSheetId: string, quarter: Quarter, comment: string): Promise<CheckIn> => {
    const res = await api.post<CheckIn>(`/goal-sheets/${goalSheetId}/checkins`, {
      quarter,
      comment,
    });
    return res.data;
  },
  getBySheet: async (goalSheetId: string): Promise<CheckIn[]> => {
    const res = await api.get<CheckIn[]>(`/goal-sheets/${goalSheetId}/checkins`);
    return res.data;
  },
  update: async (goalSheetId: string, checkInId: string, comment: string): Promise<CheckIn> => {
    const res = await api.put<CheckIn>(`/goal-sheets/${goalSheetId}/checkins/${checkInId}`, {
      comment,
    });
    return res.data;
  },
};

// --- Notifications ---
export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const res = await api.get<Notification[]>('/notifications');
    return res.data;
  },
  markRead: async (id: string): Promise<void> => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async (): Promise<void> => {
    await api.patch('/notifications/read-all');
  },
};

// --- Reports ---
export const reportsApi = {
  getAchievementReport: async (params: {
    cycleId?: string;
    department?: string;
    employeeId?: string;
  }): Promise<ReportRow[]> => {
    const res = await api.get<ReportRow[]>('/reports/achievement', { params });
    return res.data;
  },
  getSystemStats: async (): Promise<SystemStats> => {
    const res = await api.get<SystemStats>('/reports/stats');
    return res.data;
  },
  exportCsv: async (params: {
    cycleId?: string;
    department?: string;
    employeeId?: string;
  }): Promise<Blob> => {
    const res = await api.get('/reports/achievement', {
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    return res.data as Blob;
  },
  getCompletion: async (params?: { cycleId?: string }): Promise<unknown> => {
    const res = await api.get('/reports/completion', { params });
    return res.data;
  },
};

// --- Audit Logs ---
export const auditApi = {
  getAll: async (params?: {
    entityType?: string;
    startDate?: string;
    endDate?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AuditLog[]; total: number }> => {
    const token = localStorage.getItem('token');
    const backendParams: Record<string, unknown> = {};
    if (params?.entityType) backendParams.entityType = params.entityType;
    if (params?.startDate) backendParams.from = params.startDate;
    if (params?.endDate) backendParams.to = params.endDate;
    if (params?.from) backendParams.from = params.from;
    if (params?.to) backendParams.to = params.to;
    if (params?.page) backendParams.page = params.page;
    if (params?.limit) backendParams.limit = params.limit;

    const res = await axios.get<{ success: boolean; data: AuditLog[]; total: number }>(
      'http://localhost:3001/api/reports/audit-trail',
      {
        params: backendParams,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { data: res.data.data ?? [], total: res.data.total ?? 0 };
  },
};

// --- Analytics ---

export type QoQTrendsResult = {
  individual: Array<{
    employee: { id: string; name: string; department: string | null };
    cycle: { id: string; name: string; year: number };
    quarterlyScores: Record<string, number>;
    trend: Array<{ quarter: string; score: number }>;
  }>;
  byDepartment: Array<{
    department: string;
    trend: Array<{ quarter: string; avgScore: number }>;
  }>;
};

export type GoalDistributionResult = {
  totalGoals: number;
  byThrustArea: Array<{ name: string; count: number }>;
  byUomType: Array<{ type: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
};

export type CompletionRatesResult = {
  totalSheets: number;
  checkInCompletionRate: number;
  totalCheckInSlots: number;
  completedCheckIns: number;
  quarterlyAchievementRates: Array<{
    quarter: string;
    total: number;
    completed: number;
    onTrack: number;
    completionRate: number;
  }>;
  managerCompletionRates: Array<{
    managerId: string;
    managerName: string;
    totalSlots: number;
    completed: number;
    completionRate: number;
  }>;
};

export const analyticsApi = {
  getQoQTrends: async (params?: {
    cycleId?: string;
    employeeId?: string;
    department?: string;
  }): Promise<QoQTrendsResult> => {
    const res = await api.get<QoQTrendsResult>('/analytics/qoq-trends', { params });
    return res.data;
  },

  getGoalDistribution: async (cycleId?: string): Promise<GoalDistributionResult> => {
    const res = await api.get<GoalDistributionResult>('/analytics/goal-distribution', {
      params: cycleId ? { cycleId } : undefined,
    });
    return res.data;
  },

  getCompletionRates: async (cycleId?: string): Promise<CompletionRatesResult> => {
    const res = await api.get<CompletionRatesResult>('/analytics/completion-rates', {
      params: cycleId ? { cycleId } : undefined,
    });
    return res.data;
  },
};

// --- Escalations ---
export const escalationsApi = {
  getRules: async (): Promise<
    Array<{
      id: string;
      triggerType: string;
      daysThreshold: number;
      isActive: boolean;
      createdAt: string;
    }>
  > => {
    const res = await api.get('/escalations/rules');
    return res.data as Array<{
      id: string;
      triggerType: string;
      daysThreshold: number;
      isActive: boolean;
      createdAt: string;
    }>;
  },
  createRule: async (data: {
    triggerType: string;
    daysThreshold: number;
    isActive?: boolean;
  }): Promise<unknown> => {
    const res = await api.post('/escalations/rules', data);
    return res.data;
  },
  updateRule: async (
    id: string,
    data: { daysThreshold?: number; isActive?: boolean }
  ): Promise<unknown> => {
    const res = await api.put(`/escalations/rules/${id}`, data);
    return res.data;
  },
  triggerManual: async (): Promise<unknown> => {
    const res = await api.post('/escalations/run');
    return res.data;
  },
  getAll: async (): Promise<GoalSheet[]> => {
    const res = await api.get<GoalSheet[]>('/goal-sheets');
    return res.data;
  },
  escalate: async (_goalSheetId: string, _reason: string): Promise<void> => {
    // No-op: escalation runs automatically via scheduler
  },
};

export default api;
