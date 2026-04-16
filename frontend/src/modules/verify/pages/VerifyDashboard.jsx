import React from 'react';
import PerformancePanel from '../../deploy/components/PerformancePanel';
import { Shield, Activity, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';

export default function VerifyDashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['org_admin', 'manager', 'assessor']);

  return (
    <div className="flex flex-col gap-8">
      {/* 🚀 Verify Hero */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-primary/20 rounded-[40px] blur-xl opacity-50"></div>
        <div className="glass-panel p-10 border-white/5 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px]"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-3 flex items-center gap-2">
                <Shield size={12} />
                Cognitive Assessment Matrix // Verify Node
              </p>
              <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic leading-none">
                Performance <span className="text-primary italic">Verification</span>
              </h1>
            </div>
            
            <div className="flex gap-4">
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Authenticity</p>
                  <p className="text-xl font-display font-black text-emerald-400">100%</p>
               </div>
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Calibration</p>
                  <p className="text-xl font-display font-black text-primary">Active</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Main Assessment Area */}
      <div className="animate-fade-in-up transition-all delay-200">
        <PerformancePanel isAdmin={isAdmin} />
      </div>

      {/* 🚀 Guidance Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
        <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary shrink-0"><Activity size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">Neural markers are analyzed against career benchmarks.</p>
        </div>
        <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 shrink-0"><Shield size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">All evaluations are cryptographically signed by management.</p>
        </div>
        <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-secondary shrink-0"><CheckCircle size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">Quarterly syncs ensure continuous mission alignment.</p>
        </div>
      </div>
    </div>
  );
}
