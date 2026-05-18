import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  FileText,
  CheckSquare,
  TrendingUp,
  Users,
  Clock,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { goalSheetsApi, cyclesApi, reportsApi, usersApi } from '../services/api';
import { GoalSheet, GoalCycle, SystemStats, TeamMemberStatus } from '../types';
import StatusBadge from '../components/StatusBadge';
import ProgressBar from '../components/ProgressBar';
import { format } from 'date-fns';

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [cycle, setCycle] = useState<GoalCycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sheetData, cycleData] = await Promise.all([
          goalSheetsApi.getMySheet(),
          cyclesApi.getActive(),
        ]);
        setSheet(sheetData);
        setCycle(cycleData);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalWeightage = sheet?.goals?.reduce((acc, g) => acc + g.weightage, 0) ?? 0;
  const completedGoals = sheet?.goals?.filter((g) => g.achievements?.some((a) => a.status === 'COMPLETED')).length ?? 0;
  const totalGoals = sheet?.goals?.length ?? 0;

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
        <p className="text-sm text-gray-500 mt-1">{cycle ? `Active cycle: ${cycle.name}` : 'No active goal cycle at this time.'}</p>
      </div>

      {cycle && (
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Active Cycle</p>
              <h2 className="text-xl font-bold mt-1">{cycle.name}</h2>
              <p className="text-indigo-200 text-sm mt-1">Phase: {cycle.phase}</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-xs">Window</p>
              <p className="text-sm font-medium mt-0.5">
                {format(new Date(cycle.windowOpens), 'MMM d')} – {format(new Date(cycle.windowCloses), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 text-indigo-600" /></div>
            <div><p className="text-xs text-gray-500">Total Goals</p><p className="text-2xl font-bold text-gray-900">{totalGoals}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><Target className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-gray-500">Total Weightage</p><p className={`text-2xl font-bold ${totalWeightage === 100 ? 'text-emerald-600' : 'text-red-500'}`}>{totalWeightage}%</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-gray-500">Goals Completed</p><p className="text-2xl font-bold text-gray-900">{completedGoals}/{totalGoals}</p></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Goal Sheet Status</h3>
          {sheet && <StatusBadge status={sheet.status} />}
        </div>
        {!sheet ? (
          <div className="text-center py-6">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-4">You haven't created a goal sheet for this cycle yet.</p>
            {cycle && <Link to="/goals/create" className="btn-primary">Create Goal Sheet</Link>}
          </div>
        ) : (
          <div className="space-y-3">
            {totalGoals > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Overall Progress</span>
                  <span>{totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0}%</span>
                </div>
                <ProgressBar value={totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0} showLabel={false} />
              </div>
            )}
            <div className="flex gap-3 pt-2 flex-wrap">
              <Link to="/goals/create" className="btn-secondary text-sm">{sheet.status === 'DRAFT' ? 'Edit Goals' : 'View Goals'}</Link>
              {sheet.status === 'APPROVED' && <Link to="/goals/achievements" className="btn-primary text-sm">Update Achievements</Link>}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/goals/create" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors"><FileText className="w-5 h-5 text-indigo-600" /></div>
          <div className="flex-1"><p className="text-sm font-medium text-gray-900">My Goal Sheet</p><p className="text-xs text-gray-500">Create or edit your goals</p></div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
        </Link>
        <Link to="/goals/achievements" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
          <div className="flex-1"><p className="text-sm font-medium text-gray-900">Update Achievements</p><p className="text-xs text-gray-500">Record quarterly progress</p></div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
        </Link>
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<GoalSheet[]>([]);
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [pendingData, teamData] = await Promise.all([goalSheetsApi.getPending(), usersApi.getTeam()]);
        setPending(pendingData);
        setTeam(teamData);
      } catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  const approvedCount = team.filter((m) => m.goalSheet?.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Hello {user?.name?.split(' ')[0]}, here's an overview of your team's progress.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-amber-700">Pending Approvals</p><p className="text-2xl font-bold text-amber-800">{pending.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Team Members</p><p className="text-2xl font-bold text-gray-900">{team.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center"><CheckSquare className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-gray-500">Sheets Approved</p><p className="text-2xl font-bold text-gray-900">{approvedCount}/{team.length}</p></div>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Pending Approvals</h3>
            <Link to="/approvals" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pending.slice(0, 3).map((sheet) => (
              <Link key={sheet.id} to={`/approvals/${sheet.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-indigo-600">{sheet.employee?.name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{sheet.employee?.name}</p>
                  <p className="text-xs text-gray-500">{sheet.cycle?.name}</p>
                </div>
                <StatusBadge status={sheet.status} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Team Goal Sheet Status</h3>
          <Link to="/team/check-in" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">Check-ins <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        {team.length === 0 ? (
          <div className="text-center py-8"><Users className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-500">No team members found</p></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {team.map((member) => (
              <div key={member.employee.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-indigo-600">{member.employee.name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{member.employee.name}</p>
                  <p className="text-xs text-gray-500">{member.employee.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{member.checkInsCompleted} check-ins</span>
                  {member.goalSheet ? <StatusBadge status={member.goalSheet.status} size="sm" /> : <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">No sheet</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/approvals" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center"><CheckSquare className="w-5 h-5 text-amber-600" /></div>
          <div className="flex-1"><p className="text-sm font-medium text-gray-900">Review Approvals</p><p className="text-xs text-gray-500">{pending.length} awaiting review</p></div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </Link>
        <Link to="/team/check-in" className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
          <div className="flex-1"><p className="text-sm font-medium text-gray-900">Team Check-ins</p><p className="text-xs text-gray-500">Quarterly progress reviews</p></div>
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </Link>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try { const data = await reportsApi.getSystemStats(); setStats(data); }
      catch { /* ignore */ } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: <Users className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50' },
    { label: 'Active Cycles', value: stats?.activeCycles ?? 0, icon: <Clock className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50' },
    { label: 'Goal Sheets', value: stats?.totalGoalSheets ?? 0, icon: <FileText className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: <AlertTriangle className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50' },
    { label: 'Approved Sheets', value: stats?.approvedSheets ?? 0, icon: <CheckSquare className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50' },
    { label: 'Completion Rate', value: `${stats?.completionRate ?? 0}%`, icon: <TrendingUp className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50' },
  ];

  const adminLinks = [
    { to: '/admin/users', icon: <Users className="w-5 h-5 text-indigo-600" />, label: 'User Management', desc: 'Add, edit, assign roles' },
    { to: '/admin/cycles', icon: <Clock className="w-5 h-5 text-blue-600" />, label: 'Cycle Management', desc: 'Configure goal cycles' },
    { to: '/admin/thrust-areas', icon: <Target className="w-5 h-5 text-teal-600" />, label: 'Thrust Areas', desc: 'Manage focus areas' },
    { to: '/admin/reports', icon: <BarChart2 className="w-5 h-5 text-amber-600" />, label: 'Reports', desc: 'Achievement reports & export' },
    { to: '/admin/analytics', icon: <TrendingUp className="w-5 h-5 text-purple-600" />, label: 'Analytics', desc: 'QoQ trends & insights' },
    { to: '/admin/audit', icon: <FileText className="w-5 h-5 text-gray-600" />, label: 'Audit Trail', desc: 'Change history' },
    { to: '/admin/escalations', icon: <AlertTriangle className="w-5 h-5 text-red-600" />, label: 'Escalations', desc: 'Overdue & escalated items' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">System-wide overview and quick actions</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>{card.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Overall Completion Rate</h3>
          <ProgressBar value={stats.completionRate} size="lg" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{stats.approvedSheets} of {stats.totalGoalSheets} sheets approved</span>
            <span>{stats.submittedSheets} pending review</span>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminLinks.map((link) => (
            <Link key={link.to} to={link.to} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-indigo-300 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-50 transition-colors">{link.icon}</div>
              <div className="flex-1"><p className="text-sm font-medium text-gray-900">{link.label}</p><p className="text-xs text-gray-500">{link.desc}</p></div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'MANAGER') return <ManagerDashboard />;
  return <EmployeeDashboard />;
};

export default Dashboard;
