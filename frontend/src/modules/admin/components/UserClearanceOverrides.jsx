import React from 'react';
import { Shield, X, Check, Activity, Trash2 } from 'lucide-react';
import { PERMISSIONS_CATEGORIES } from './ClearanceMatrix';

export default function UserClearanceOverrides({ user, overrides, onUpdate, onClose }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="glass-panel border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in-up bg-[#0a0a0a] shadow-2xl">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">Neural Clearance Override</p>
            </div>
            <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
              Adjusting Node Access: <span className="text-primary">{user.username}</span>
            </h3>
            <p className="text-xs text-white/40 mt-2">Explicitly allow or block capabilities for this specific identity session.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/20 hover:text-white transition-all uppercase text-[10px] font-black tracking-widest bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl border border-white/5 active:scale-95"
          >
            Close Terminal
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="grid grid-cols-1 gap-12">
            {PERMISSIONS_CATEGORIES.map(cat => (
              <div key={cat.group} className="space-y-6">
                <div className="flex items-center gap-4">
                    <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/20 whitespace-nowrap">{cat.group}</h4>
                    <div className="h-px bg-white/5 flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cat.perms.map(p => {
                    const overrideValue = overrides[p.key];
                    const isOverridden = overrideValue !== undefined && overrideValue !== null;
                    
                    return (
                      <div 
                        key={p.key} 
                        className={`glass-panel p-5 border-white/5 flex items-center justify-between transition-all duration-300 hover:border-white/10 ${isOverridden ? 'bg-primary/5 border-primary/20' : 'bg-white/[0.01]'}`}
                      >
                        <div className="space-y-1">
                          <p className={`text-sm font-bold transition-colors ${isOverridden ? 'text-primary' : 'text-white/80'}`}>{p.label}</p>
                          <p className="text-[9px] text-white/20 uppercase font-mono tracking-tight">{p.key}</p>
                        </div>
                        
                        <div className="flex gap-2 p-1 glass-panel border-white/5 bg-black/40 rounded-xl">
                          <button 
                            onClick={() => onUpdate(user.id, p.key, true)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${overrideValue === true ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-white/20 hover:text-white/40'}`}
                            title="Force Allow"
                          >
                            <Check size={14} strokeWidth={4} />
                          </button>
                          <button 
                            onClick={() => onUpdate(user.id, p.key, false)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${overrideValue === false ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-white/20 hover:text-white/40'}`}
                            title="Force Block"
                          >
                            <X size={14} strokeWidth={4} />
                          </button>
                          <button 
                            onClick={() => onUpdate(user.id, p.key, null)}
                            className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!isOverridden ? 'bg-white/10 text-white' : 'text-white/10 hover:text-white/20 hover:bg-white/5'}`}
                            title="Inherit from Role"
                          >
                            <Activity size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-black/60 rounded-b-3xl flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Shield className="text-primary/40" size={18} />
                <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Modified clearances take priority over default role assignments.</p>
            </div>
            <p className="text-[9px] text-primary font-mono uppercase tracking-[0.2em] animate-pulse">Encryption Status: Active Node Restricted</p>
        </div>
      </div>
    </div>
  );
}
