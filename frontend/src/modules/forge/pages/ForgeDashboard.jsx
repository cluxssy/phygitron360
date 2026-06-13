import React from 'react';
import TrainingPanel from '../../deploy/components/TrainingPanel';
import { Zap, BookOpen, Cpu, Sparkles } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export default function ForgeDashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['org_admin', 'manager', 'trainer']);

  return (
    <div className="flex flex-col gap-8">
      {/* 🚀 Forge Hero */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-secondary/20 to-primary/20 rounded-[40px] blur-xl opacity-50"></div>
        <div className="glass-panel p-10 border-white/5 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-secondary/5 rounded-full blur-[120px]"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary mb-3 flex items-center gap-2">
                <Zap size={12} />
                Learning Path Creation // Learning Hub
              </p>
              <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic leading-none">
                The <span className="text-secondary italic">Learning</span> Forge
              </h1>
            </div>
            
            <div className="flex gap-4">
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Modules</p>
                  <p className="text-xl font-display font-black text-secondary">Unlocked</p>
               </div>
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Knowledge</p>
                  <p className="text-xl font-display font-black text-primary">Infinite</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Main Training Area */}
      <div className="animate-fade-in-up transition-all delay-200">
         {isAdmin ? (
            <TrainingPanel />
         ) : (
            <div className="glass-panel p-20 flex flex-col items-center justify-center text-center gap-6 border-white/5">
               <div className="w-20 h-20 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/20 shadow-2xl">
                  <BookOpen size={40} />
               </div>
               <div>
                  <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest mb-2">Knowledge Matrix</h2>
                  <p className="text-xs text-white/30 uppercase tracking-[0.2em] max-w-md mx-auto leading-loose">
                    Your assigned learning paths are ready in the learning hub. 
                    Check back soon for new training content.
                  </p>
               </div>
               <div className="flex gap-4">
                  <div className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                     <Cpu size={14} className="text-secondary" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/40">AI-Curated Paths</span>
                  </div>
                  <div className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                     <Sparkles size={14} className="text-primary" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Zero-Latency Upload</span>
                  </div>
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
