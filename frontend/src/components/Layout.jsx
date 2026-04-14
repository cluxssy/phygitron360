import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Zap, Shield, Database, Send, 
  Terminal, Layout as LayoutIcon, 
  LogOut, Bell, Settings, Search,
  ChevronRight, Command, Briefcase,
  CheckCircle, Rocket, Layers,
  Compass, Activity, User, Globe,
  Cpu, Monitor, Star, Filter, Home, Upload, Users,
  LayoutDashboard, BarChart3
} from 'lucide-react';
import { useAuth } from '../core/auth/AuthContext';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();

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
      id: 'dashboard', name: 'Dashboard', path: '/admin', icon: LayoutDashboard, color: 'text-primary', roles: ['org_admin', 'hr_manager'],
      options: [
        { label: 'Overview', icon: Home, search: '', default: true },
        { label: 'Analytics', icon: BarChart3, search: '?tab=stats', default: false },
      ]
    },
    { 
      id: 'source', name: 'Source', path: '/source', icon: Database, color: 'text-primary', roles: ['org_admin', 'recruiter'],
      options: [
        { label: 'Home', icon: Home, search: '?tab=home', default: true },
        { label: 'Directory', icon: Users, search: '?tab=directory', default: false },
        { label: 'Jobs', icon: Briefcase, search: '?tab=jobs', default: false },
        { label: 'Upload Resume', icon: Upload, search: '?tab=upload', default: false },
      ]
    },
    { 
      id: 'forge', name: 'Forge', path: '/forge', icon: Zap, color: 'text-secondary', roles: ['org_admin', 'trainer'],
      options: []
    },
    { 
      id: 'verify', name: 'Verify', path: '/verify', icon: Shield, color: 'text-indigo', roles: ['org_admin', 'assessor'],
      options: []
    },
    { 
      id: 'deploy', name: 'Deploy', path: '/deploy', icon: Rocket, color: 'text-error', roles: ['org_admin', 'hr_manager', 'employee', 'Admin', 'HR', 'Management', 'Employee'],
      options: [
        { label: 'Personnel', icon: Users, search: '?tab=team', default: true },
        { label: 'Attendance', icon: Star, search: '?tab=attendance', default: false },
        { label: 'Training', icon: Zap, search: '?tab=training', default: false },
        { label: 'Assets', icon: CheckCircle, search: '?tab=assets', default: false },
        { label: 'Onboard', icon: User, search: '?tab=onboard', default: false },
      ]
    },
  ];

  const modules = allModules.filter(m => {
    const isSuper = user?.role === 'super_admin';
    if (m.id === 'superadmin') return isSuper;
    if (isSuper) return true;
    return hasRole(m.roles) && user?.modules_enabled?.includes(m.id);
  });



  const activeModule = modules.find(m => 
    location.pathname.startsWith(m.path) || (m.id === 'source' && location.pathname === '/admin')
  ) || modules[0];

  return (
    <div className="flex h-screen w-full bg-[#040812] text-white overflow-hidden font-sans selection:bg-primary/30">
      
      {/* 🚀 PRIMARY SIDEBAR (switcher) - High Perf optimized */}
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

      {/* 🚀 SECONDARY SIDEBAR (command) - reduced blur radius for perf */}
      <aside className="w-[280px] flex flex-col bg-[#060E20]/40 backdrop-blur-lg border-r border-white/5 shrink-0 transform-gpu">
         <div className="p-8 pb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant opacity-40 mb-1">Active World</h3>
            <h2 className="text-2xl font-display font-extrabold text-white tracking-tighter uppercase italic">{activeModule.name}</h2>
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

         {/* Module Sidebar Footer Placeholder Removed */}
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-[72px] flex items-center justify-between px-10 bg-[#060E20]/20 backdrop-blur-md border-b border-white-5 z-10 shrink-0 transform-gpu">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em]">
                <span className="opacity-30">Phygitron 360</span>
                <span className="opacity-20 text-[16px] font-light">/</span>
                <span className="text-white">{activeModule.name.toUpperCase()}</span>
             </div>
          </div>

          <div className="flex items-center gap-4 group cursor-pointer pl-4 border-l border-white/5">
            <div className="text-right">
              <p className="text-xs font-bold text-white tracking-tight">{user?.name || 'Admin'}</p>
              <p className="text-[9px] font-bold text-on-surface-variant opacity-30 uppercase tracking-widest">
                {(user?.roles || [user?.role]).join(' • ')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center font-display font-bold text-primary">
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-12 custom-scrollbar transform-gpu">
          {children}
        </div>
      </main>

      {/* 🚀 Optimized Ambient Lighting Background */}
      <div className="fixed inset-0 pointer-events-none z-0 transform-gpu">
          <div className="absolute top-[-10%] left-[-10%] w-[1000px] h-[800px] bg-primary/5 blur-[120px] rounded-full will-change-transform opacity-40" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[800px] bg-indigo/5 blur-[120px] rounded-full will-change-transform opacity-30" />
      </div>

    </div>
  );
}



