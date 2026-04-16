import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Zap, Shield, Database, Send, 
  Terminal, Layout as LayoutIcon, 
  LogOut, Bell, Settings, Search,
  ChevronRight, Command, Briefcase,
  CheckCircle, Rocket, Layers,
  Compass, Activity, User, Globe,
  Cpu, Monitor, Star, Filter, Home, Upload, Users,
  LayoutDashboard, BarChart3, Clock, BookOpen, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../core/auth/AuthContext';
import OrgAdminSetupModal from '../modules/deploy/components/OrgAdminSetupModal';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole, refreshUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [deployView, setDeployView] = useState('admin');

  const isL2 = hasRole(['org_admin', 'super_admin']);
  const isL3 = hasRole(['manager']);
  const canSwitchView = isL2 || isL3;

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
        }
      } catch (e) {}
    };
    if (user) fetchNotifs();
  }, [user]);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch(`/api/notifications/read-all`, { method: 'POST', credentials: 'include' });
      setNotifications([]);
    } catch {}
  };

  const allModules = [
    { 
      id: 'superadmin', name: 'Overlord', path: '/superadmin', icon: Globe, color: 'text-secondary', roles: ['super_admin'],
      options: [
        { label: 'Tenants', icon: Globe, search: '', default: true },
        { label: 'Analytics', icon: Activity, search: '', default: false },
        { label: 'License Lab', icon: Zap, search: '', default: false },
      ]
    },
    { 
      id: 'dashboard', name: 'Dashboard', path: '/admin', icon: LayoutDashboard, color: 'text-primary', roles: ['org_admin', 'manager'],
      options: [
        { label: 'Overview', icon: Home, search: '', default: true },
        { label: 'Users', icon: Shield, search: '?tab=users', default: false },
        { label: 'Analytics', icon: BarChart3, search: '?tab=stats', default: false },
      ]
    },
    { 
      id: 'source', name: 'Source', path: '/source', icon: Database, color: 'text-primary', roles: ['org_admin', 'recruiter', 'manager', 'candidate'],
      options: [
        { label: 'Home', icon: Home, search: '?tab=home', default: true },
        { label: 'Directory', icon: Users, search: '?tab=directory', default: false },
        { label: 'Jobs', icon: Briefcase, search: '?tab=jobs', default: false },
        { label: 'Upload Resume', icon: Upload, search: '?tab=upload', default: false },
      ]
    },
    { 
      id: 'forge', name: 'Forge', path: '/forge', icon: Zap, color: 'text-secondary', roles: ['org_admin', 'trainer', 'manager', 'employee'],
      options: [
        { label: 'Academy', icon: Home, search: '?tab=academy', default: true },
        { label: 'Courses', icon: Layers, search: '?tab=courses', default: false },
        { label: 'My Learning', icon: Star, search: '?tab=my-learning', default: false },
        { label: 'Certificates', icon: CheckCircle, search: '?tab=certs', default: false },
      ]
    },
    { 
      id: 'verify', name: 'Verify', path: '/verify', icon: Shield, color: 'text-indigo', roles: ['org_admin', 'assessor', 'manager', 'employee'],
      options: [
        { label: 'Skill Check', icon: Home, search: '?tab=home', default: true },
        { label: 'Assessments', icon: Shield, search: '?tab=tests', default: false },
        { label: 'Results', icon: Activity, search: '?tab=results', default: false },
        { label: 'Builder', icon: Cpu, search: '?tab=builder', default: false },
      ]
    },
    { 
      id: 'deploy', name: 'Deploy', path: '/deploy', icon: Rocket, color: 'text-error', roles: ['org_admin', 'manager', 'employee'],
      options: (canSwitchView && deployView === 'admin') ? [
        { label: 'Analytics', icon: LayoutDashboard, search: '?tab=dashboard', default: true },
        { label: 'Personnel', icon: Users, search: '?tab=team', default: false },
        { label: 'Attendance', icon: Star, search: '?tab=attendance', default: false },
        { label: 'Performance', icon: BarChart3, search: '?tab=performance', default: false },
        { label: 'Allocations', icon: CheckCircle, search: '?tab=allocations', default: false },
        { label: 'Onboard', icon: User, search: '?tab=onboard', default: false },
      ] : [
        { label: 'Dashboard', icon: LayoutDashboard, search: '?tab=my-dashboard', default: true },
        { label: 'My Profile', icon: User, search: '?tab=my-profile', default: false },
        { label: 'My Attendance', icon: Clock, search: '?tab=my-attendance', default: false },
        { label: 'My Performance', icon: Activity, search: '?tab=my-performance', default: false },
      ]
    },
  ];

  const modules = allModules.filter(m => {
    const isSuper = user?.role === 'super_admin';
    
    // If Superadmin, ONLY show the Superadmin (Overlord) dashboard for a focused experience
    if (isSuper) {
        return m.id === 'superadmin';
    }
    
    const roleMatch = hasRole(m.roles);
    if (!roleMatch) return false;
    
    // Dashboard is a core module, others require being enabled in tenant settings
    if (m.id === 'dashboard') return true;
    
    return user?.modules_enabled?.includes(m.id);
  });

  const activeModule = modules.find(m => 
    location.pathname.startsWith(m.path) || (m.id === 'source' && location.pathname === '/admin')
  ) || modules[0];

  return (
    <div className="flex h-screen w-full bg-[#040812] text-white overflow-hidden font-sans selection:bg-primary/30">
      
      {/* 🚀 PRIMARY SIDEBAR (switcher) */}
      <aside className="w-[88px] flex flex-col items-center py-8 bg-[#060E20] border-r border-white/5 z-50 shrink-0 transform-gpu">
        <div 
          onClick={() => navigate('/')}
          className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-10 cursor-pointer shadow-lg hover:scale-110 active:scale-95 transition-all duration-200"
        >
          <Command className="text-black" size={26} />
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          {modules.map((m) => (
            <Link 
              key={m.id}
              to={m.path}
              className={`group relative w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-200 ${
                activeModule.id === m.id 
                ? 'bg-primary/10 border border-primary/20 shadow-md transform-gpu' 
                : 'hover:bg-white/5 opacity-40 hover:opacity-100'
              }`}
            >
              <m.icon size={22} className={activeModule.id === m.id ? m.color : 'text-white'} />
              {activeModule.id === m.id && (
                <div className="absolute -left-1 w-1 h-8 bg-primary rounded-full shadow-sm" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-6 mt-auto">
           <button onClick={() => logout()} className="w-14 h-14 flex items-center justify-center rounded-2xl opacity-40 hover:opacity-100 hover:bg-error/10 text-error transition-all duration-200">
              <LogOut size={20} />
           </button>
        </div>
      </aside>

      {/* 🚀 SECONDARY SIDEBAR (command) */}
      <aside className="w-[280px] flex flex-col bg-[#060E20]/40 backdrop-blur-lg border-r border-white/5 shrink-0 transform-gpu">
         <div className="p-8 pb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-1">Active World</h3>
            <h2 className="text-2xl font-display font-extrabold text-white tracking-tighter uppercase italic">{activeModule.name}</h2>
            {activeModule.id === 'deploy' && canSwitchView && (
                <div className="mt-4 flex bg-white/5 rounded-xl p-1">
                    <button 
                        onClick={() => { setDeployView('admin'); navigate('/deploy?tab=' + (isL2 ? 'dashboard' : 'team')); }}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${deployView === 'admin' ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                    >
                        Management
                    </button>
                    <button 
                        onClick={() => { setDeployView('employee'); navigate('/deploy?tab=my-dashboard'); }}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${deployView === 'employee' ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                    >
                        Personal
                    </button>
                </div>
            )}
         </div>

         <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar">
            {activeModule.options.map((opt, idx) => {
               const isActive = location.search.includes(opt.search) || (!location.search && opt.default);
               return (
               <div 
                 key={idx}
                 onClick={() => navigate(`${activeModule.path}${opt.search}`)}
                 className={`flex items-center gap-4 px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 ${
                   isActive ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'hover:bg-white/5 text-on-surface-variant hover:text-white'
                 }`}
               >
                  <opt.icon size={18} className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest">{opt.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
               </div>
               );
            })}
         </div>

         <div className="mt-auto p-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-4 px-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center font-display font-bold text-primary">
                    {user?.name?.[0] || 'A'}
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-white truncate tracking-tight">{user?.name || 'Admin'}</p>
                    <p className="text-[9px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest truncate">
                        {(user?.role || 'User').toUpperCase()}
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <button 
                  onClick={() => setShowNotif(!showNotif)} 
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${showNotif ? 'bg-primary text-black' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}
                >
                    <Bell size={16} />
                    {notifications.length > 0 && <span className="text-[10px] font-black">{notifications.length}</span>}
                </button>
                <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 transition-all">
                    <Settings size={16} />
                </button>
            </div>

            {showNotif && (
                <div className="absolute bottom-32 left-8 w-72 bg-[#060E20] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50">Neural Alerts</h3>
                        {notifications.length > 0 && (
                            <button onClick={markAllRead} className="text-[10px] text-primary hover:underline font-black">PURGE</button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
                        {notifications.length === 0 ? (
                            <p className="text-[10px] text-white/30 text-center py-4 font-bold uppercase">All clear</p>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} onClick={() => markRead(n.id)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/10">
                                    <p className="text-[10px] font-black text-white uppercase tracking-wider mb-1">{n.title}</p>
                                    <p className="text-[9px] text-white/40 leading-snug font-bold">{n.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
         </div>
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 overflow-auto p-12 custom-scrollbar transform-gpu">
          {children}
        </div>
      </main>

      {/* 🚀 Ambient Lighting Background */}
      <div className="fixed inset-0 pointer-events-none z-0 transform-gpu">
          <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[800px] bg-primary/5 blur-[120px] rounded-full will-change-transform opacity-40" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[800px] bg-indigo/5 blur-[120px] rounded-full will-change-transform opacity-30" />
      </div>


      {user?.role === 'org_admin' && !user?.employee_code && (
        <OrgAdminSetupModal 
            user={user} 
            onComplete={(code) => {
                refreshUser();
            }} 
        />
      )}
    </div>
  );
}
