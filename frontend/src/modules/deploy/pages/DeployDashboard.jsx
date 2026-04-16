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
  const { user, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  const params = new URLSearchParams(location.search);
  
  const isL2 = hasRole(['org_admin', 'super_admin']);
  const isL3 = hasRole('manager');

  let defaultTab = 'my-dashboard';
  if (isL2) defaultTab = 'dashboard';
  else if (isL3) defaultTab = 'team';
  
  const currentTab = params.get('tab') || defaultTab;

  const setTab = (tab) => navigate(`/deploy?tab=${tab}`);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        if (isL2) {
            const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
            const data = await res.json();
            setStats(data?.counts);
        }
      } catch {}
    };
    fetchGlobalData();
  }, [isL2, user]);


  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Hero Bar */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">
            Deploy // Enterprise Personnel Matrix
          </p>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
            {currentTab.startsWith('my-') || currentTab === 'leave' && !isL2 && !isL3
                ? 'Dashboard' 
                : isL2 ? 'HRMS Control Node' 
                : isL3 ? 'Manager Command' 
                : 'Dashboard'}
          </h1>
        </div>
        {isL2 && stats && (
          <div className="flex gap-4">
            {[
              { label: 'Active', value: stats.active, color: '#10B981' },
              { label: 'Total', value: stats.total, color: '#CC97FF' },
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

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {currentTab === 'dashboard' && isL2 && <DeployAnalytics />}
        {currentTab === 'team' && (isL2 || isL3) && <EmployeeDirectory />}
        {currentTab === 'profile' && (isL2 || isL3) && (
          <EmployeeProfileFull 
            employeeCode={params.get('code')} 
            onBack={() => setTab('team')} 
          />
        )}
        {currentTab === 'attendance' && <AttendancePanel mode="admin" />}
        {currentTab === 'my-attendance' && <AttendancePanel mode="employee" />}
        {currentTab === 'leave' && <AttendancePanel mode="admin" />}
        {currentTab === 'my-leave' && <AttendancePanel mode="employee" />}
        {currentTab === 'performance' && <PerformancePanel isAdmin={isL2 || isL3} />}
        {currentTab === 'my-performance' && <PerformancePanel isAdmin={false} />}
        {currentTab === 'training' && (isL2 || isL3) && <TrainingPanel />}
        {currentTab === 'allocations' && isL2 && <AssetsPanel />}
        {currentTab === 'onboard' && isL2 && <OnboardingPanel />}
        {currentTab === 'admin' && isL2 && <AdminPanel />}
        {currentTab === 'my-dashboard' && <EmployeeDashboard />}
        {currentTab === 'my-profile' && <MyProfile />}
      </div>
    </div>
  );
}
