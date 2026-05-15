import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Activity, Command, ArrowRight, Zap, Shield, Globe, Layout, Sparkles, Database } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#040812] text-white selection:bg-primary/30 selection:text-white overflow-x-hidden">
      {/* Cinematic Ambient Lighting Matrix */}
      <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[1200px] h-[1200px] bg-[#CC97FF]/10 blur-[200px] rounded-full animate-pulse opacity-20 will-change-transform" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[1000px] h-[1000px] bg-[#10B981]/10 blur-[200px] rounded-full animate-pulse opacity-15 will-change-transform" style={{ animationDelay: '3s' }} />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-12 py-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-[0_0_20px_rgba(204,151,255,0.4)]">
             <Command className="text-black" size={20} />
          </div>
            <span className="font-display font-black text-2xl tracking-tighter text-white uppercase italic group-hover:text-primary transition-colors">
              Phygitron <span className="text-primary">360</span>
            </span>
        </div>
        <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest opacity-60">
           <span className="hover:opacity-100 transition-opacity cursor-pointer">Source</span>
           <span className="hover:opacity-100 transition-opacity cursor-pointer">Forge</span>
           <span className="hover:opacity-100 transition-opacity cursor-pointer">Verify</span>
           <span className="hover:opacity-100 transition-opacity cursor-pointer">Deploy</span>
           <button 
             onClick={() => navigate('/login')} 
             className="px-6 py-3 glass-panel border-primary/20 text-primary hover:bg-primary/10 transition-all ml-4"
           >
              Launch Portal
           </button>
        </div>
      </nav>

      <main className="relative z-10 grid lg:grid-cols-2 gap-20 items-center px-24 py-12 min-h-[calc(100vh-120px)]">
        <div className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-8">
             <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Phygitron 360 v1.0 Live</span>
             </div>
          </div>
            <h1 className="text-7xl md:text-8xl font-display font-extrabold text-white tracking-tighter leading-[0.9] mb-8 uppercase italic animate-fade-in-up">
              Phygitron <br/> <span className="text-primary text-glow-primary">360 Core</span>
            </h1>
            <p className="text-xl md:text-2xl text-on-surface-variant font-medium max-w-2xl mx-auto mb-12 opacity-80 tracking-tight leading-relaxed animate-fade-in-up delay-100">
              The Enterprise Intelligence Matrix for Neural Selection, Skills Validation, and Human Capital Calibration.
            </p>
          
          <div className="flex gap-6">
             <button 
                onClick={() => navigate('/login')} 
                className="btn-primary group flex items-center gap-4 px-10 py-5"
             >
                Initialize Terminal <ArrowRight className="group-hover:translate-x-2 transition-transform" />
             </button>
             <button className="px-10 py-5 glass-panel text-[11px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                The Ecosystem
             </button>
          </div>
        </div>

        <div className="relative group animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
           <div className="absolute inset-0 bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-all opacity-40" />
           <div className="grid grid-cols-2 gap-4 relative z-10">
              {[
                { icon: Globe, label: 'Source', desc: 'Neural Sourcing & Vector Matching', color: '#CC97FF', stat: '142M Nodes' },
                { icon: Database, label: 'Forge', desc: 'Adaptive Neural LXP Platform', color: '#10B981', stat: '89 Hubs' },
                { icon: Shield, label: 'Verify', desc: 'Secure Cognitive Assessment Lab', color: '#F59E0B', stat: '24 Tests' },
                { icon: Layout, label: 'Deploy', desc: 'Unified Personnel HRMS Stage', color: '#6366F1', stat: '1K Deployed' },
              ].map((m, i) => (
                <div key={i} className="glass-panel p-8 group hover:-translate-y-2 transition-all cursor-pointer">
                   <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-xl"
                      style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}25` }}
                   >
                      <m.icon size={22} />
                   </div>
                   <h3 className="text-xl font-display font-extrabold text-white mb-2 uppercase">{m.label}</h3>
                   <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40 mb-4">{m.stat}</div>
                   <p className="text-xs text-on-surface-variant font-medium leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
                      {m.desc}
                   </p>
                </div>
              ))}
           </div>
        </div>
      </main>

      <footer className="relative z-10 px-24 py-12 flex justify-between items-center opacity-30 border-t border-white/5">
         <div className="text-[10px] font-bold uppercase tracking-[0.3em]">Phygitron 360 Ecosystem // Node-1 Base</div>
         <div className="flex gap-8 text-[9px] font-bold uppercase tracking-widest">
            <span>Identity Protocol</span>
            <span>Secure Matrix</span>
            <span>System Status: Optimal</span>
         </div>
      </footer>
    </div>
  );
}
