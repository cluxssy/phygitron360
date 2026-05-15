import React, { useState, useEffect } from 'react';
import { 
  Users, Zap, Shield, Rocket, ArrowRight, 
  Activity, Plus, Database, LayoutDashboard, 
  Globe, Clock, Bell, Settings, Search, 
  Filter, Upload, BarChart3, TrendingUp, AlertCircle, Layers
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminPanel from '../components/AdminPanel';

export default function OrgDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [health, setHealth] = useState([]);
  const [activity, setActivity] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [team, setTeam] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentTab = params.get('tab') || 'overview';
  
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [s, f, h, a, j, t, al, b] = await Promise.all([
          fetch('/api/org/dashboard-stats', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/pipeline-funnel', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/module-health', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/recent-activity', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/journey-overview', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/team-overview', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/alerts', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/org/billing-status', { credentials: 'include' }).then(r => r.json()),
        ]);
        
        setStats(s);
        setFunnel(f);
        setHealth(h);
        setActivity(a);
        setJourneys(j);
        setTeam(t);
        setAlerts(al);
        setBilling(b);
      } catch (err) {
        toast.error("Telemetry synchronization failed.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Activity className="animate-spin text-primary" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Synchronizing Strategic Matrix...</p>
      </div>
    );
  }

  const quickActions = [
    { label: 'Add User', icon: <Plus size={14}/>, action: () => navigate('/admin?tab=users') }, 
    { label: 'Create Journey', icon: <TrendingUp size={14}/>, action: () => toast.error('Journey Engine calibrating...') },
    { label: 'Bulk Upload', icon: <Upload size={14}/>, action: () => navigate('/source?tab=upload') },
    { label: 'View Reports', icon: <BarChart3 size={14}/>, action: () => navigate('/deploy?tab=dashboard') },
  ];

  if (currentTab === 'users') {
     return <div className="p-8 animate-fade-in-up"><AdminPanel /></div>;
  }

  return (
    <div className="space-y-10 animate-fade-in-up pb-20 px-8">
      {/* ── Overlord Header ── */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-4">
        <div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Command Center // {billing?.plan}</p>
           <h1 className="text-5xl font-display font-black text-white tracking-tighter uppercase italic leading-none">
             Welcome, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
           </h1>
           <p className="text-sm text-on-surface-variant font-medium opacity-60 mt-4 italic">Tuesday, 14 April 2026 · Neural status: Optimal</p>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-4 glass-panel border-emerald-500/20 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">System 100% Healthy</span>
           </div>
        </div>
      </section>

      {/* ── KPI Grid ── */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Candidates', value: stats?.total_candidates, color: '#CC97FF', icon: Database },
          { label: 'Training', value: stats?.currently_training, color: '#10B981', icon: Zap },
          { label: 'Verified', value: stats?.verified_ready, color: '#F59E0B', icon: Shield },
          { label: 'Employees', value: stats?.active_employees, color: '#6366F1', icon: Rocket },
          { label: 'Alerts', value: stats?.skill_decay_alerts, color: '#F43F5E', icon: AlertCircle, isAlert: true }
        ].map((k, i) => (
          <div key={i} className="glass-panel p-8 group hover:border-white/10 transition-all border-white/5 relative overflow-hidden bg-white/[0.01]">
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><k.icon size={48} /></div>
             <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">{k.label}</p>
             <h2 className={`text-4xl font-display font-black ${k.isAlert && k.value > 0 ? 'text-red-500' : 'text-white'} tracking-tighter leading-none`}>
               {k.isAlert && k.value > 0 ? '🔴' : ''} {k.value}
             </h2>
          </div>
        ))}
      </section>

      {/* ── Talent Funnel Visualizer ── */}
      <section className="glass-panel p-10 border-white/5 bg-white/[0.01]">
         <div className="flex justify-between items-center mb-10">
            <h3 className="text-sm font-black uppercase tracking-widest text-white italic flex items-center gap-3">
               <TrendingUp size={18} className="text-primary"/> Talent Intelligence Funnel
            </h3>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] bg-white/5 px-4 py-2 rounded-full">Real-time Pipeline Tracking</span>
         </div>
         
         <div className="flex flex-col md:flex-row items-center gap-2">
            {funnel.map((f, i) => (
               <React.Fragment key={i}>
                  <div className="flex-1 w-full glass-panel p-6 border-white/5 hover:border-primary/30 transition-all group relative">
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-2 group-hover:text-primary transition-colors">{f.stage}</p>
                     <p className="text-3xl font-display font-black text-white">{f.count}</p>
                     {i < funnel.length - 1 && (
                        <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-white/10 group-hover:text-primary transition-colors">
                           <ArrowRight size={24} />
                        </div>
                     )}
                  </div>
               </React.Fragment>
            ))}
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* ── Module Health ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Database size={16}/> Neural Module Health
            </h3>
            <div className="grid grid-cols-2 gap-4">
               {health.map((h, i) => (
                  <div key={i} className="glass-panel p-8 border-white/5 hover:border-white/10 transition-all bg-white/[0.01] flex flex-col justify-between h-40">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className="text-xs font-bold text-white">{h.module}</span>
                           <div className={`w-2 h-2 rounded-full ${h.trend === 'up' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : h.trend === 'attention' ? 'bg-amber-500 animate-pulse' : 'bg-primary'}`} />
                        </div>
                        <p className="text-lg font-display font-black text-primary uppercase tracking-tighter">{h.metric}</p>
                     </div>
                     <button 
                        onClick={() => navigate(`/${h.module.toLowerCase()}`)}
                        className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-2"
                     >
                        Navigate Node <ArrowRight size={12}/>
                     </button>
                  </div>
               ))}
            </div>
         </section>

         {/* ── Recent Activity ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Activity size={16}/> Recent Org-wide Activity
            </h3>
            <div className="glass-panel p-8 border-white/5 bg-white/[0.01] max-h-[340px] overflow-y-auto custom-scrollbar">
               <div className="space-y-6">
                  {activity.length === 0 ? (
                     <p className="text-[10px] text-white/20 uppercase font-black text-center py-20 italic">No neural events recorded in this epoch.</p>
                  ) : (
                     activity.map((a, i) => (
                        <div key={i} className="flex gap-4 group">
                           <div className="w-2 h-10 bg-white/5 rounded-full relative overflow-hidden shrink-0">
                              <div className="absolute inset-0 bg-primary/20 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[11px] text-white/80 font-bold leading-tight line-clamp-1">{a.details}</p>
                              <div className="flex items-center gap-3 mt-1 opacity-40">
                                 <span className="text-[9px] font-black uppercase tracking-widest">{a.username}</span>
                                 <span className="text-[14px] leading-none text-white/10">/</span>
                                 <span className="text-[9px] font-medium italic">{new Date(a.timestamp).toLocaleTimeString()}</span>
                              </div>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* ── Active Journeys ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Layers size={16}/> Active Talent Journeys
            </h3>
            <div className="space-y-4">
               {journeys.map((j, i) => (
                  <div key={i} className="glass-panel p-8 border-white/5 bg-white/[0.01]">
                     <p className="text-sm font-bold text-white mb-6 uppercase tracking-tight italic">{j.name} Journey</p>
                     <div className="flex gap-4">
                        {j.steps.map((s, idx) => (
                           <div key={idx} className="flex flex-col items-center gap-2">
                              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-primary">
                                 Step {s.step}
                              </div>
                              <p className="text-xs font-bold text-white">{s.count} Users</p>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </section>

         {/* ── Team Overview ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Users size={16}/> Core Team Overview
            </h3>
            <div className="glass-panel border-white/5 bg-white/[0.01] overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10">
                     <tr>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">User Node</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Clearance</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Activity</th>
                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Actions (W)</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-[11px]">
                     {team.map((u, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                           <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                           <td className="px-6 py-4 font-black uppercase text-primary/60 tracking-tighter">{u.role}</td>
                           <td className="px-6 py-4 text-white/40">{u.last_active ? new Date(u.last_active).toLocaleDateString() : 'Never'}</td>
                           <td className="px-6 py-4 font-display font-black text-base">{u.actions_week}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* ── Alerts ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Bell size={16}/> Critical Command Alerts
            </h3>
            <div className="glass-panel border-white/5 bg-white/[0.01] divide-y divide-white/5 overflow-hidden">
               {alerts.map((a, i) => (
                  <div key={i} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${a.type === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                           {a.type === 'critical' ? <Zap size={16}/> : <Clock size={16}/>}
                        </div>
                        <span className="text-xs font-bold text-white/80 group-hover:text-white transition-colors uppercase tracking-tight">{a.message}</span>
                     </div>
                     <ArrowRight size={14} className="text-white/10 group-hover:text-primary transition-colors"/>
                  </div>
               ))}
            </div>
         </section>

         {/* ── Quick Actions ── */}
         <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/40 italic flex items-center gap-3">
               <Zap size={16}/> Tactical Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
               {quickActions.map((q, i) => (
                  <button 
                    key={i}
                    onClick={q.action}
                    className="glass-panel p-6 border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-center gap-4 group"
                  >
                     <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white group-hover:bg-primary group-hover:text-black transition-all">
                        {q.icon}
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">{q.label}</span>
                  </button>
               ))}
            </div>
         </section>
      </div>

      {/* ── Billing Footer ── */}
      <footer className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Plan Matrix:</span>
               <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">{billing?.plan}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Seat Utilization:</span>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{billing?.seats}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Renewal Cycle:</span>
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{billing?.renewal}</span>
            </div>
         </div>
         <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10">Phygitron 360 // Strategic Ops Hub</p>
      </footer>
    </div>
  );
}
