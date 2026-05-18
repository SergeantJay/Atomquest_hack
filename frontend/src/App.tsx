import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GoalSheetCreate from './pages/employee/GoalSheetCreate';
import GoalSheetView from './pages/employee/GoalSheetView';
import AchievementUpdate from './pages/employee/AchievementUpdate';
import PendingApprovals from './pages/manager/PendingApprovals';
import ApprovalDetail from './pages/manager/ApprovalDetail';
import TeamCheckIn from './pages/manager/TeamCheckIn';
import SharedGoals from './pages/manager/SharedGoals';
import UserManagement from './pages/admin/UserManagement';
import CycleManagement from './pages/admin/CycleManagement';
import ThrustAreaManagement from './pages/admin/ThrustAreaManagement';
import Reports from './pages/admin/Reports';
import CompletionDashboard from './pages/admin/CompletionDashboard';
import AuditTrail from './pages/admin/AuditTrail';
import Analytics from './pages/admin/Analytics';
import EscalationManagement from './pages/admin/EscalationManagement';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading GoalTrack...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Employee routes */}
        <Route path="goals/create" element={<GoalSheetCreate />} />
        <Route path="goals/view" element={<GoalSheetView />} />
        <Route path="goals/achievements" element={<AchievementUpdate />} />

        {/* Manager routes */}
        <Route path="approvals" element={<PendingApprovals />} />
        <Route path="approvals/:id" element={<ApprovalDetail />} />
        <Route path="team/check-in" element={<TeamCheckIn />} />
        <Route path="shared-goals" element={<SharedGoals />} />

        {/* Admin routes */}
        <Route path="admin/users" element={<UserManagement />} />
        <Route path="admin/cycles" element={<CycleManagement />} />
        <Route path="admin/thrust-areas" element={<ThrustAreaManagement />} />
        <Route path="admin/reports" element={<Reports />} />
        <Route path="admin/completion" element={<CompletionDashboard />} />
        <Route path="admin/audit" element={<AuditTrail />} />
        <Route path="admin/analytics" element={<Analytics />} />
        <Route path="admin/escalations" element={<EscalationManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
