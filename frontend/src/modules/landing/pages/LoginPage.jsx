import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Activity, Command, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const detectSubdomain = () => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (hostname.includes('localhost')) {
      if (parts.length >= 2 && parts[0] !== 'www') {
         return parts[0]; 
      }
      return 'public';
    }

    if (parts.length > 2 && parts[0] !== 'www') return parts[0];
    return 'public';
  };

  const [workspaceId, setWorkspaceId] = useState(detectSubdomain());

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ workspace_id: workspaceId, username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        login(data.user);
        const uRoles = (data.user.roles || [data.user.role]).map(r => r ? r.toLowerCase() : '');
        if (uRoles.includes('super_admin')) {
          navigate('/superadmin');
        } else if (uRoles.includes('org_admin')) {
          navigate('/admin');
        } else if (uRoles.includes('manager')) {
          navigate('/deploy?tab=team');
        } else if (uRoles.includes('candidate')) {
          navigate('/source?tab=my-application');
        } else {
          navigate('/deploy');
        }
      } else {
        setError(data.detail || 'Access Denied: Invalid Credentials.');
      }
    } catch (err) {
      setError('Phygitron 360 Network Interrupted: Check Connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#040812] text-white flex items-center justify-center p-6 overflow-hidden">
      {/* Cinematic Luminous Overlay */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#CC97FF]/10 blur-[150px] rounded-full animate-pulse opacity-40 will-change-transform" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-[#10B981]/10 blur-[150px] rounded-full animate-pulse opacity-30 will-change-transform" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Portal Branding */}
        <div className="mb-12 flex flex-col items-center">
          <div onClick={() => navigate('/')} className="cursor-pointer w-16 h-16 bg-primary flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(204,151,255,0.4)] mb-6 transition-all hover:scale-110">
             <Command className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter uppercase mb-2">Phygitron <span className="text-primary">360</span></h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-on-surface-variant opacity-60">Unified Intelligence Portal</p>
        </div>

        <div className="glass-panel p-1 border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="bg-[#0B1326]/60 backdrop-blur-3xl rounded-[22px] p-10">
             <div className="mb-10">
                <h2 className="text-2xl font-display font-extrabold text-white mb-2 uppercase">Platform Auth</h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#CC97FF] opacity-70">Initialize System Access</p>
             </div>

             {error && (
               <div className="mb-8 rounded-2xl bg-error/10 p-4 text-xs text-[#FFB4AB] border border-error/20 flex gap-3 items-center animate-shake">
                  <Zap size={16} /> {error}
               </div>
             )}

             <form onSubmit={handleLogin} className="space-y-6">
               <div>
                 <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Identity Node</label>
                 <div className="relative">
                   <User className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
                   <input
                     type="text"
                     value={username}
                     onChange={(e) => setUsername(e.target.value)}
                     className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                     placeholder="Username"
                     required
                   />
                 </div>
               </div>

               <div>
                 <div className="flex justify-between items-center mb-3 ml-1">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Key Matrix</label>
                   <button type="button" onClick={() => navigate('/forgot-password')} className="text-[9px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">
                     Reset Protocol?
                   </button>
                 </div>
                 <div className="relative">
                   <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
                   <input
                     type="password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                     placeholder="••••••••"
                     required
                   />
                 </div>
               </div>

               <button
                 type="submit"
                 disabled={loading}
                 className="w-full bg-primary text-black font-extrabold text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_10px_30px_rgba(204,151,255,0.3)] hover:bg-white hover:shadow-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
               >
                 {loading ? 'Authorizing Node...' : 'Initialize Launch'}
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
               </button>
             </form>

             <div className="mt-10 pt-10 border-t border-white/5 text-center">
                <button 
                  onClick={() => navigate('/')} 
                  className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                >
                  Return to Matrix Overview
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
