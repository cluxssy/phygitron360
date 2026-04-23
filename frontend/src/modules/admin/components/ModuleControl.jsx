import React from 'react';
import { Activity, Zap, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ModuleControl({ tenantOps, onUpdate }) {
  const toggleModule = async (module) => {
    const current = tenantOps.modules_enabled || [];
    const updated = current.includes(module) 
      ? current.filter(m => m !== module)
      : [...current, module];
    
    try {
      const res = await fetch('/api/admin/tenants/current/ops', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules_enabled: updated })
      });
      if (!res.ok) throw new Error();
      onUpdate({ ...tenantOps, modules_enabled: updated });
      toast.success(`${module.toUpperCase()} module ecosystem updated`);
    } catch {
      toast.error('Ecological Sync Error');
    }
  };

  const MODULES = [
    { id: 'source', label: 'Source', desc: 'Neural Talent Acquisition & HR Pipeline' },
    { id: 'forge', label: 'Forge', desc: 'Skill Synthesis & Cognitive Hub' },
    { id: 'verify', label: 'Verify', desc: 'Deep Assessment & Validation Node' },
    { id: 'deploy', label: 'Deploy', desc: 'Core Identity & Personnel Matrix' },
  ];

  return (
    <div className="space-y-10 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MODULES.map(m => {
          const isActive = tenantOps.modules_enabled.includes(m.id);
          return (
            <div key={m.id} className={`glass-panel p-8 border-white/5 bg-white/[0.01] flex flex-col justify-between gap-10 group transition-all duration-500 hover:border-primary/30 ${isActive ? 'ring-1 ring-primary/20 bg-primary/[0.02]' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}>
              <div className="space-y-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/20'}`}>
                   <Activity size={24} className={isActive ? 'animate-pulse' : ''} />
                </div>
                <div>
                  <h4 className="text-base font-black uppercase tracking-tighter text-white group-hover:text-primary transition-colors">{m.label}</h4>
                  <p className="text-[10px] text-white/30 mt-2 uppercase leading-relaxed font-bold tracking-widest">{m.desc}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isActive ? 'text-emerald-400' : 'text-white/20'}`}>
                    {isActive ? 'Status: Integrated' : 'Status: Isolated'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-white/5'}`} />
                </div>
                <button 
                  onClick={() => toggleModule(m.id)}
                  className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 active:scale-95 ${
                    isActive 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white' 
                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black'
                  }`}
                >
                  {isActive ? 'Sever Access' : 'Integrate Node'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="glass-panel p-12 border-primary/10 bg-primary/[0.01] flex items-center justify-between relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 text-primary shadow-[0_0_100px_rgba(var(--color-primary),0.1)] transition-transform duration-1000 group-hover:scale-125">
             <ShieldCheck size={120} strokeWidth={0.5} className="opacity-5" />
        </div>
        <div className="space-y-4 relative z-10">
          <div className="flex items-center gap-3">
             <Zap size={18} className="text-primary" />
             <h3 className="text-lg font-black uppercase tracking-tighter text-primary italic">Workspace Ecosystem Enforcement</h3>
          </div>
          <p className="text-sm text-white/40 max-w-2xl leading-relaxed">
            Changes to core neural modules propagate instantly. Revoking access to a module will immediately 
            <span className="text-white/80 font-bold"> decouple restricted interfaces</span> for all non-privileged identities within this workspace. 
            Data persistence is maintained across disconnects.
          </p>
        </div>
        <div className="relative z-10">
             <div className="p-4 rounded-3xl glass-panel border-white/5 bg-black/40">
                <p className="text-[9px] font-mono text-primary uppercase tracking-[0.3em]">Protocol Layer: Enterprise</p>
             </div>
        </div>
      </div>
    </div>
  );
}
