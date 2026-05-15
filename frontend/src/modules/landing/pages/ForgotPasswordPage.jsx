import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Command, ArrowRight, CheckCircle, Zap } from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
    } catch {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#040812] text-white flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-[#CC97FF]/10 blur-[150px] rounded-full animate-pulse opacity-40 will-change-transform" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        {/* Portal Branding */}
        <div className="mb-12 flex flex-col items-center">
          <div onClick={() => navigate('/')} className="cursor-pointer w-16 h-16 bg-primary flex items-center justify-center rounded-2xl shadow-[0_0_40px_rgba(204,151,255,0.4)] mb-6 transition-all hover:scale-110">
             <Command className="text-black" size={32} />
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tighter uppercase mb-2">Phygitron <span className="text-primary">360</span></h1>
        </div>

        <div className="glass-panel p-1 border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
          <div className="bg-[#0B1326]/60 backdrop-blur-3xl rounded-[22px] p-10">
            {success ? (
               <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-display font-extrabold text-white mb-2 uppercase">Protocol Initiated</h2>
                  <p className="text-[12px] text-white/50 pb-6 uppercase tracking-widest leading-relaxed">
                     If the identity node exists, reset instructions have been dispatched.
                  </p>
                  <button onClick={() => navigate('/login')} className="w-full bg-white/5 text-white font-extrabold text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                    Return to Matrix
                  </button>
               </div>
            ) : (
               <>
                 <div className="mb-10">
                    <h2 className="text-2xl font-display font-extrabold text-white mb-2 uppercase">Reset Protocol</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#CC97FF] opacity-70">Initialize Recovery Sequence</p>
                 </div>

                 {error && (
                   <div className="mb-8 rounded-2xl bg-error/10 p-4 text-xs text-[#FFB4AB] border border-error/20 flex gap-3 items-center animate-shake">
                      <Zap size={16} /> {error}
                   </div>
                 )}

                 <form onSubmit={handleSubmit} className="space-y-6">
                   <div>
                     <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Identity Vector (Email)</label>
                     <div className="relative">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
                       <input
                         type="email"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                         className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                         placeholder="agent@matrix.com"
                         required
                       />
                     </div>
                   </div>

                   <button
                     type="submit"
                     disabled={loading}
                     className="w-full bg-primary text-black font-extrabold text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_10px_30px_rgba(204,151,255,0.3)] hover:bg-white hover:shadow-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                   >
                     {loading ? 'Transmitting...' : 'Dispatch Reset'}
                     <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                 </form>

                 <div className="mt-10 pt-10 border-t border-white/5 text-center">
                    <button 
                      onClick={() => navigate('/login')} 
                      className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                    >
                      Cancel Recovery
                    </button>
                 </div>
               </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
