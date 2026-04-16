import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, CheckCircle, Clock, Zap, Activity, Shield, AlertCircle
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAssessments, setPendingAssessments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, assessRes] = await Promise.all([
          fetch('/api/dashboard/employee-stats', { credentials: 'include' }),
          fetch(`/api/assessments/${user?.employee_code}/${new Date().getFullYear()}`, { credentials: 'include' })
        ]);
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setProfile(statsData);
        }
        
        if (assessRes.ok) {
          const assessData = await assessRes.json();
          const pending = assessData.filter(a => a.status === 'Not Started' || a.status === 'Draft');
          setPendingAssessments(pending);
        }
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.employee_code) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-lg shadow-primary/20"></div>
      </div>
    );
  }

  if (!user?.employee_code) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
         <div className="w-20 h-20 rounded-3xl bg-error/10 border border-error/20 flex items-center justify-center text-error mb-6">
            <AlertCircle size={32} />
         </div>
         <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter mb-2">Neural Link <span className="text-error">Severed</span></h2>
         <p className="text-white/40 text-xs max-w-md uppercase tracking-widest leading-relaxed">
            Your identity sequence has not been synced with a personnel matrix. <br/> 
            Return to the Management portal and complete an Outbound Invite.
         </p>
      </div>
    );
  }

  const emp = profile?.employee || {};
  const leaves = profile?.leaves || {};
  const kras = profile?.kras || { total: 0, completed: 0 };
  const attendance = profile?.attendance || {};

  return (
    <div className="space-y-8 max-w-6xl animate-fade-in-up pb-12">
      {/* 🚀 Header Experience */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-indigo/20 to-secondary/20 rounded-[40px] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
        <div className="glass-panel p-10 border-white/5 flex flex-col md:flex-row items-center md:items-start gap-10 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-primary/5 rounded-full blur-[120px] animate-pulse"></div>
          
          {/* Avatar Area */}
          <div className="relative group/avatar">
            <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-indigo rounded-[34px] blur-md opacity-20 group-hover/avatar:opacity-40 transition-opacity"></div>
            <div className="w-32 h-32 rounded-[32px] bg-[#0A1225] border border-white/10 flex items-center justify-center text-primary font-display font-black text-6xl shrink-0 shadow-2xl overflow-hidden z-10 relative">
              {emp.photo_path ? (
                  <img src={`/${emp.photo_path}`} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" alt="" />
              ) : (
                  (emp.name || user?.name || 'U')[0]
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1225] via-transparent to-transparent opacity-40"></div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#0A1225] border border-white/10 flex items-center justify-center p-1.5 shadow-lg group-hover/avatar:scale-110 transition-transform">
               <Shield className="text-primary" size={12} />
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex-1 text-center md:text-left z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-3 flex items-center justify-center md:justify-start gap-2">
                  <div className="w-8 h-[1px] bg-primary/30"></div>
                  Neural Identity // {emp.employee_code}
                </div>
                <h1 className="text-5xl font-display font-black text-white uppercase tracking-tighter leading-none mb-2">
                  {emp.name || user?.name}
                </h1>
                <p className="text-base text-white/40 font-bold uppercase tracking-widest flex items-center justify-center md:justify-start gap-3">
                  {emp.designation} <span className="w-1.5 h-1.5 rounded-full bg-white/10"></span> {emp.team}
                </p>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-2">
                 <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 group/status cursor-default">
                    <div className="relative">
                       <div className={`w-3 h-3 rounded-full ${attendance.status === 'Present' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                      Matrix Status: <span className={attendance.status === 'Present' ? 'text-emerald-400' : 'text-rose-400'}>{attendance.status || 'OFFLINE'}</span>
                    </span>
                 </div>
              </div>
            </div>

            {/* Quarter Progress */}
            <div className="mt-8">
               <div className="flex justify-between items-end mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Quarter Cycle Progress</p>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Q{Math.floor((new Date().getMonth() + 3) / 3)} // {new Date().getFullYear()}</p>
               </div>
               <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div 
                    className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-full relative"
                    style={{ width: `${((new Date().getMonth() % 3) / 3) * 100 + (new Date().getDate() / 90) * 100}%` }}
                  >
                    <div className="absolute top-0 right-0 w-8 h-full bg-white/20 blur-md"></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Tactical Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: Clock, label: 'Leave Balance', value: leaves.casual_total - leaves.casual_used || 0, color: 'text-primary', sub: 'Days Available' },
          { icon: CheckCircle, label: 'KRAs Locked', value: `${kras.completed}/${kras.total}`, color: 'text-emerald-400', sub: 'Success Rate' },
          { icon: Zap, label: 'Neural Uplink', value: profile?.training?.completed || 0, color: 'text-[#CC97FF]', sub: 'Modules Done' },
          { icon: Activity, label: 'Sectors Controlled', value: profile?.assets?.total || 0, color: 'text-blue-400', sub: 'Workstations' }
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-8 border-white/5 hover:border-white/10 transition-all hover:scale-[1.02] flex flex-col items-center justify-center text-center group">
            <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 ${stat.color} mb-4 group-hover:scale-110 transition-transform`}>
               <stat.icon size={24} />
            </div>
            <p className="text-4xl font-display font-black text-white mb-1">{stat.value}</p>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{stat.label}</p>
            <div className="w-6 h-[1px] bg-white/10 my-3"></div>
            <p className="text-[8px] font-black uppercase tracking-widest text-white/10 group-hover:text-white/20">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 🚀 Active Objectives */}
        <div className="glass-panel p-10 border-white/5 relative overflow-hidden">
           <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-30"></div>
           
           <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 mb-10 flex items-center gap-4">
            <AlertCircle size={16} className="text-primary" /> 
            Immediate Vector Required
            <div className="flex-1 h-[1px] bg-white/5"></div>
          </h3>
          
          {pendingAssessments.length > 0 ? (
            <div className="space-y-6">
              {pendingAssessments.map((a, idx) => (
                <div key={idx} className="group relative">
                  <div className="absolute -inset-2 bg-primary/10 rounded-3xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="relative p-6 rounded-3xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div>
                      <h4 className="text-base font-black text-white uppercase tracking-tighter mb-1">Self-Assessment Sync</h4>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary/60 font-black">Timeline: {a.quarter} // {year}</p>
                    </div>
                    <button 
                      onClick={() => navigate('/verify')}
                      className="w-full sm:w-auto px-8 py-3.5 bg-primary text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                      Initialize
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-30">
              <Shield size={48} className="text-white/20 mb-6" />
              <p className="text-[10px] uppercase tracking-[0.4em] font-black text-white/60">No Active Vulnerabilities</p>
            </div>
          )}
        </div>

        {/* 🚀 Terminal Output */}
        <div className="glass-panel p-10 border-white/5">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/40 mb-10 flex items-center gap-4">
             Broadcasting Node
             <div className="flex-1 h-[1px] bg-white/5"></div>
          </h3>
          
          <div className="space-y-4">
            {profile?.notifications && profile.notifications.length > 0 ? (
              profile.notifications.slice(0, 4).map((n, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all cursor-default group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{n.title}</p>
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Received</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">{n.message}</p>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                 <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic tracking-widest">Awaiting Uplink Signals...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

