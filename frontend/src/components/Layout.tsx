import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Target,
  LayoutDashboard,
  FileText,
  CheckSquare,
  TrendingUp,
  Users,
  ClipboardList,
  BarChart2,
  Shield,
  AlertTriangle,
  Repeat,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Share2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from './NotificationBell';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    label: 'Dashboard',
    roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'],
  },
  {
    to: '/goals/create',
    icon: <FileText className="w-5 h-5" />,
    label: 'My Goals',
    roles: ['EMPLOYEE'],
  },
  {
    to: '/goals/achievements',
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Achievement Update',
    roles: ['EMPLOYEE'],
  },
  {
    to: '/approvals',
    icon: <CheckSquare className="w-5 h-5" />,
    label: 'Pending Approvals',
    roles: ['MANAGER'],
  },
  {
    to: '/team/check-in',
    icon: <ClipboardList className="w-5 h-5" />,
    label: 'Team Check-ins',
    roles: ['MANAGER'],
  },
  {
    to: '/shared-goals',
    icon: <Share2 className="w-5 h-5" />,
    label: 'Shared Goals',
    roles: ['MANAGER', 'ADMIN'],
  },
  {
    to: '/admin/users',
    icon: <Users className="w-5 h-5" />,
    label: 'User Management',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/cycles',
    icon: <Repeat className="w-5 h-5" />,
    label: 'Cycles',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/thrust-areas',
    icon: <Target className="w-5 h-5" />,
    label: 'Thrust Areas',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/reports',
    icon: <BarChart2 className="w-5 h-5" />,
    label: 'Reports',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/analytics',
    icon: <TrendingUp className="w-5 h-5" />,
    label: 'Analytics',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/completion',
    icon: <CheckSquare className="w-5 h-5" />,
    label: 'Completion Dashboard',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/audit',
    icon: <Shield className="w-5 h-5" />,
    label: 'Audit Trail',
    roles: ['ADMIN'],
  },
  {
    to: '/admin/escalations',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'Escalations',
    roles: ['ADMIN'],
  },
];

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const getRoleLabel = (role: string) => {
    if (role === 'EMPLOYEE') return 'Employee';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'ADMIN') return 'Administrator';
    return role;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === 'ADMIN') return 'bg-purple-100 text-purple-700';
    if (role === 'MANAGER') return 'bg-blue-100 text-blue-700';
    return 'bg-indigo-100 text-indigo-700';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Target className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">GoalTrack</h1>
          <p className="text-xs text-gray-500">Performance Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span
                className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${getRoleBadgeColor(user?.role ?? '')}`}
              >
                {getRoleLabel(user?.role ?? '')}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                {user?.department && (
                  <p className="text-xs text-gray-400">{user.department}</p>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-white shadow-xl">
            <button
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-gray-500">
              {user?.department && (
                <span>Department: <span className="text-gray-700">{user.department}</span></span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
