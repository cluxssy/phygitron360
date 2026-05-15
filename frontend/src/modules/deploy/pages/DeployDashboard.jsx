import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import EmployeeDirectory from '../components/EmployeeDirectory';
import EmployeeProfileFull from '../components/EmployeeProfileFull';
import AttendancePanel from '../components/AttendancePanel';
import TrainingPanel from '../components/TrainingPanel';
import AssetsPanel from '../components/AssetsPanel';
import OnboardingPanel from '../components/OnboardingPanel';
import MyProfile from '../components/MyProfile';
import PerformancePanel from '../components/PerformancePanel';
import AdminPanel from '../../admin/components/AdminPanel';
import DeployAnalytics from '../components/DeployAnalytics';
import EmployeeDashboard from '../components/EmployeeDashboard';
import { 
  Users, Clock, BookOpen, Package, 
  UserPlus, User, Activity, BarChart3,
  Rocket, TrendingUp, Shield, Zap, LayoutDashboard
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DeployDashboard() {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  const params = new URLSearchParams(location.search);

  // ── PBAC gates (replaces hasRole() checks) ──────────────────────────────
  const canViewAdminDash  = hasPermission('deploy.dashboard.view_admin');
  const canViewTeam       = hasPermission('deploy.employees.view');
  const canViewAttTeam    = hasPermission('deploy.attendance.view_team');
  const canManagePerf     = hasPermission('deploy.performance.manage');
  const canViewPerf       = hasPermission('deploy.performance.view');
  const canViewAssets     = hasPermission('deploy.assets.view');
  const canManageOnboard  = hasPermission('deploy.onboarding.manage');
  const canViewOnboard    = hasPermission('deploy.onboarding.view');
  const canManageTraining = hasPermission('deploy.training.manage');
  const canViewTraining   = hasPermission('deploy.training.view');
  const canManageUsers    = hasPermission('admin.users.manage');

  // Default tab based on highest permission level
  let defaultTab = 'my-dashboard';
  if (canViewAdminDash) defaultTab = 'dashboard';
  else if (canViewTeam)  defaultTab = 'team';

  const currentTab = params.get('tab') || defaultTab;
  const setTab = (tab) => navigate(`/deploy?tab=${tab}`);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        if (canViewAdminDash) {
          const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
          const data = await res.json();
          setStats(data?.counts);
        }
      } catch {}
    };
    fetchGlobalData();
  }, [canViewAdminDash, user]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Hero Bar */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">
            Deploy // Enterprise Personnel Matrix
          </p>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
            {canViewAdminDash ? 'HRMS Control Node'
              : canViewTeam   ? 'Manager Command'
              : 'Dashboard'}
          </h1>
        </div>
        {canViewAdminDash && stats && (
          <div className="flex gap-4">
            {[
              { label: 'Active', value: stats.active, color: '#10B981' },
              { label: 'Total', value: stats.total,  color: '#CC97FF' },
              { label: 'Exited', value: stats.exited, color: '#F43F5E' },
            ].map((s, i) => (
              <div key={i} className="glass-panel px-6 py-4 text-center border-white/5">
                <p className="text-2xl font-display font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Content — every render is gated by hasPermission() */}
      <div className="flex-1 min-h-0">
        {currentTab === 'dashboard'      && canViewAdminDash  && <DeployAnalytics />}
        {currentTab === 'team'           && canViewTeam        && <EmployeeDirectory />}
        {currentTab === 'profile'        && canViewTeam        && (
          <EmployeeProfileFull
            employeeCode={params.get('code')}
            onBack={() => setTab('team')}
          />
        )}
        {currentTab === 'attendance'     && canViewAttTeam     && <AttendancePanel mode="admin" />}
        {currentTab === 'my-attendance'  && <AttendancePanel mode="employee" />}
        {currentTab === 'leave'          && canViewAttTeam     && <AttendancePanel mode="admin" />}
        {currentTab === 'my-leave'       && <AttendancePanel mode="employee" />}
        {currentTab === 'performance'    && canManagePerf      && <PerformancePanel isAdmin={true} />}
        {currentTab === 'my-performance' && canViewPerf        && <PerformancePanel isAdmin={false} />}
        {currentTab === 'training'       && canViewTraining    && <TrainingPanel isAdmin={canManageTraining} />}
        {currentTab === 'allocations'    && canViewAssets      && <AssetsPanel />}
        {currentTab === 'onboard'        && canViewOnboard     && <OnboardingPanel isAdmin={canManageOnboard} />}
        {currentTab === 'admin'          && canManageUsers     && <AdminPanel />}
        {currentTab === 'my-dashboard'   && <EmployeeDashboard />}
        {currentTab === 'my-profile'     && <MyProfile />}
      </div>
    </div>
  );
}

