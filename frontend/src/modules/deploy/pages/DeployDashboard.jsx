import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import EmployeeDirectory from '../components/EmployeeDirectory';
import AttendancePanel from '../components/AttendancePanel';
import TrainingPanel from '../components/TrainingPanel';
import AssetsPanel from '../components/AssetsPanel';
import OnboardingPanel from '../components/OnboardingPanel';
import MyProfile from '../components/MyProfile';
import { 
  Users, Clock, BookOpen, Package, 
  UserPlus, User, Activity, BarChart3,
  Rocket, TrendingUp, Shield, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const ADMIN_ROLES = ['Admin', 'HR', 'Management', 'org_admin', 'hr_manager', 'team_lead'];
const EMPLOYEE_ROLES = ['Employee', 'employee'];

export default function DeployDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  const params = new URLSearchParams(location.search);
  const activeTab = params.get('tab') || 'team';

  const isAdmin = ADMIN_ROLES.some(r => 
    (user?.roles || [user?.role]).map(x => x?.toLowerCase()).includes(r.toLowerCase())
  );
  const isEmployee = !isAdmin;

  const adminTabs = [
    { id: 'team', label: 'Personnel Matrix', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'training', label: 'Training', icon: BookOpen },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'onboard', label: 'Neural Onboard', icon: UserPlus },
  ];

  const employeeTabs = [
    { id: 'my-profile', label: 'My Profile', icon: User },
    { id: 'attendance', label: 'My Attendance', icon: Clock },
  ];

  const tabs = isAdmin ? adminTabs : employeeTabs;
  const defaultTab = isAdmin ? 'team' : 'my-profile';
  const currentTab = params.get('tab') || defaultTab;

  const setTab = (tab) => navigate(`/deploy?tab=${tab}`);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
        const data = await res.json();
        setStats(data?.counts);
      } catch {}
    };
    if (isAdmin) fetchStats();
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Hero Bar */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">
            Deploy // Enterprise Personnel Matrix
          </p>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
            {isAdmin ? 'HRMS Control Node' : `My Workspace`}
          </h1>
        </div>
        {isAdmin && stats && (
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

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
              currentTab === tab.id
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'glass-panel border-white/5 text-white/40 hover:text-white hover:border-white/10'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {currentTab === 'team' && isAdmin && <EmployeeDirectory />}
        {currentTab === 'attendance' && <AttendancePanel isAdmin={isAdmin} />}
        {currentTab === 'training' && isAdmin && <TrainingPanel />}
        {currentTab === 'assets' && isAdmin && <AssetsPanel />}
        {currentTab === 'onboard' && isAdmin && <OnboardingPanel />}
        {currentTab === 'my-profile' && <MyProfile />}
      </div>
    </div>
  );
}
