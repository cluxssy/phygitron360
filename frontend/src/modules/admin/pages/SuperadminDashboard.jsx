import React, { useState, useEffect } from 'react';
import { 
  Globe, Activity, Plus, Shield, 
  Terminal, ArrowRight, CheckCircle, 
  XCircle, Filter, Search, Zap, Cpu,
  Database, Layout as LayoutIcon, Mail,
  School, ShieldCheck, Rocket
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';

export default function SuperadminDashboard() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants');

  if (!hasRole('super_admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center">
        <Shield size={48} className="text-secondary/20" />
        <h2 className="text-xl font-display font-black text-white uppercase italic">Access Denied: Level 0 Clearance Required</h2>
      </div>
    );
  }
  const [tenants, setTenants] = useState([]);
  const [demoRequests, setDemoRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({ company_name: '', admin_email: '', admin_password: '' });
  const [provisioning, setProvisioning] = useState(false);
  
  const [showOpsModal, setShowOpsModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantOps, setTenantOps] = useState({ modules_enabled: [], plan: '', is_active: true, stats: {} });
  const [savingOps, setSavingOps] = useState(false);
  const [loadingOps, setLoadingOps] = useState(false);

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setLoading(true);
      const [tRes, dRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/auth/demo-requests')
      ]);
      
      const tData = await tRes.json();
      const dData = await dRes.json();
      
      setTenants(Array.isArray(tData) ? tData : []);
      setDemoRequests(Array.isArray(dData) ? dData : []);
    } catch (err) {
      toast.error("Global synchronization failed. Checking network layers.");
    } finally {
      setLoading(false);
    }
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    setProvisioning(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provisionForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Enterprise Workspace spawned: ${data.subdomain}.localhost`);
        setShowProvisionModal(false);
        setProvisionForm({ company_name: '', admin_email: '', admin_password: '' });
        fetchGlobalData();
      } else {
        toast.error(data.detail || "Orchestration failed.");
      }
    } catch (err) {
      toast.error("Neural link severed during provisioning.");
    } finally {
      setProvisioning(false);
    }
  };

  const openOpsModal = async (tenant) => {
    setSelectedTenant(tenant);
    setShowOpsModal(true);
    setLoadingOps(true);
    setTenantOps({ 
        ...tenant, 
        modules_enabled: tenant.modules_enabled || ['source','forge','deploy','verify'],
        stats: {} 
    });
    
    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}/ops`);
      const data = await res.json();
      setTenantOps(prev => ({ ...prev, stats: data.stats || {} }));
    } catch {
      toast.error("Failed to fetch real-time telemetry from schema.");
    } finally {
      setLoadingOps(false);
    }
  };

  const handleUpdateOps = async (e) => {
    e.preventDefault();
    setSavingOps(true);
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/ops`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            company_name: tenantOps.company_name,
            plan: tenantOps.plan,
            modules_enabled: tenantOps.modules_enabled,
            is_active: tenantOps.is_active
        })
      });
      if (res.ok) {
        toast.success("Strategic parameters updated.");
        setShowOpsModal(false);
        fetchGlobalData();
      } else {
        toast.error("Update failed.");
      }
    } catch {
       toast.error("Link unstable. Update aborted.");
    } finally {
      setSavingOps(false);
    }
  };

  const toggleModule = (mod) => {
    setTenantOps(prev => {
        const mods = prev.modules_enabled.includes(mod) 
            ? prev.modules_enabled.filter(m => m !== mod)
            : [...prev.modules_enabled, mod];
        return { ...prev, modules_enabled: mods };
    });
  };

  return (
    <div className="space-y-10 animate-fade-in-up">
      {/* ── Overlord Header ── */}
      <section className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-display font-black text-white tracking-tighter uppercase italic leading-none mb-4">
            Strategic <span className="text-secondary">Overlord</span>
          </h1>
          <p className="text-sm text-on-surface-variant font-medium opacity-60">System-wide tenant orchestration & cross-enterprise telemetry cluster.</p>
        </div>
         <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all">
              <Terminal size={14}/> Audit Vault
            </button>
            <button 
              onClick={() => setShowProvisionModal(true)}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-secondary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-secondary/20"
            >
              <Plus size={14}/> Provision Tenant
            </button>
         </div>
      </section>

      {/* ── Global Cross-Cluster Telemetry ── */}
      <section className="grid grid-cols-4 gap-6">
        {[
          { label: 'Active Enterprises', value: tenants.length || '0', icon: Globe, color: '#10B981', trend: '+2 new this week' },
          { label: 'Neural Leads', value: demoRequests.length || '0', icon: Mail, color: '#CC97FF', trend: 'Response pending' },
          { label: 'Platform Load', value: '14.2%', icon: Cpu, color: '#6366F1', trend: 'Stable' },
          { label: 'Database Health', value: '99.9%', icon: Activity, color: '#F59E0B', trend: 'Active sync' },
        ].map((m, i) => (
          <div key={i} className="glass-panel p-8 group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><m.icon size={64}/></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{m.label}</p>
             <h2 className="text-4xl font-display font-black text-white mb-3 tracking-tighter leading-none">{m.value}</h2>
             <p className="text-[10px] font-bold text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-widest">{m.trend}</p>
          </div>
        ))}
      </section>

      {/* ── Strategic Command Tabs ── */}
      <section className="space-y-6">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl w-fit border border-white/5">
          {['Tenants', 'Demo Archive', 'License Lab'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t.toLowerCase().split(' ')[0])}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.toLowerCase().split(' ')[0] ? 'bg-secondary text-black shadow-lg shadow-secondary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'tenants' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((t, i) => (
              <div key={i} className="glass-panel p-8 group relative flex flex-col justify-between h-64 border-l-4 border-secondary/50">
                 <div>
                    <div className="flex justify-between items-start mb-6">
                       <div className="p-4 rounded-xl bg-secondary/10 text-secondary border border-secondary/20">
                          <Globe size={20}/>
                       </div>
                       <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">
                          Active
                       </div>
                    </div>
                    <h3 className="text-2xl font-display font-black text-white uppercase tracking-tighter leading-tight mb-2 group-hover:text-secondary transition-colors">
                      {t.company_name}
                    </h3>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{t.subdomain}.localhost</p>
                 </div>
                 
                 <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex -space-x-2">
                       <div className="w-8 h-8 rounded-full border-2 border-[#040812] bg-[#CC97FF] flex items-center justify-center text-[10px] text-black font-black">S</div>
                       <div className="w-8 h-8 rounded-full border-2 border-[#040812] bg-[#10B981] flex items-center justify-center text-[10px] text-black font-black">V</div>
                       <div className="w-8 h-8 rounded-full border-2 border-[#040812] bg-[#F59E0B] flex items-center justify-center text-[10px] text-black font-black">F</div>
                    </div>
                    <button 
                      onClick={() => openOpsModal(t)}
                      className="text-[10px] font-black text-secondary hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2"
                    > 
                      Manage Ops <ArrowRight size={14}/>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'demo' ? (
          <div className="glass-panel overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                   <tr>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Request Node</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Job Title</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Modules</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                   {demoRequests.map((d, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                         <td className="px-8 py-6">
                            <p className="text-sm font-black text-white group-hover:text-secondary transition-colors uppercase">{d.company_name}</p>
                            <p className="text-[10px] text-white/30 font-medium lowercase italic">{d.work_email}</p>
                         </td>
                         <td className="px-8 py-6">
                            <p className="text-xs font-bold text-white/60">{d.job_title}</p>
                         </td>
                         <td className="px-8 py-6">
                            <div className="flex gap-2">
                               {d.modules_requested?.split(',').map((m, idx) => (
                                  <span key={idx} className="bg-white/5 px-3 py-1 rounded-lg text-[9px] font-black uppercase text-white/40 tracking-widest">{m}</span>
                               ))}
                            </div>
                         </td>
                         <td className="px-8 py-6 text-right">
                             <button className="px-6 py-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-black uppercase tracking-widest hover:bg-secondary hover:text-black transition-all">Provision Agent</button>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center glass-panel">
            <Zap size={48} className="text-secondary/20" />
            <div>
              <p className="text-base font-black text-white mb-1 uppercase italic tracking-widest">Neural Licensing Engine Locked</p>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Connect Billing Module X-1 to enable dynamic scaling</p>
            </div>
          </div>
        )}
      </section>
      {/* ── Provision Modal ── */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="absolute inset-0" onClick={() => !provisioning && setShowProvisionModal(false)} />
          <div className="relative w-full max-w-lg glass-panel p-10 border-white/5 animate-scale-in">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-display font-black text-white uppercase italic tracking-widest">Provision <span className="text-secondary">Workspace</span></h2>
                <button onClick={() => setShowProvisionModal(false)} className="text-white/40 hover:text-white transition-colors">
                   <Plus className="rotate-45" size={24} />
                </button>
             </div>

             <form onSubmit={handleProvision} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Enterprise Cloud Name</label>
                   <input 
                      required
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-secondary transition-all outline-none"
                      value={provisionForm.company_name}
                      onChange={e => setProvisionForm({...provisionForm, company_name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Master Admin Email</label>
                   <input 
                      required
                      type="email"
                      placeholder="admin@enterprise.com"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-secondary transition-all outline-none"
                      value={provisionForm.admin_email}
                      onChange={e => setProvisionForm({...provisionForm, admin_email: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Initialize Root Key</label>
                   <input 
                      required
                      type="password"
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:border-secondary transition-all outline-none"
                      value={provisionForm.admin_password}
                      onChange={e => setProvisionForm({...provisionForm, admin_password: e.target.value})}
                   />
                </div>

                <div className="pt-4">
                   <button 
                      disabled={provisioning}
                      className="w-full py-4 bg-secondary text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2 group"
                   >
                      {provisioning ? <Activity size={16} className="animate-spin" /> : <Plus size={16} />}
                      {provisioning ? 'Orchestrating Schema...' : 'Initialize Provisioning'}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ── Manage Ops Modal ── */}
      {showOpsModal && selectedTenant && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
           <div className="absolute inset-0" onClick={() => !savingOps && setShowOpsModal(false)} />
           <div className="relative w-full max-w-2xl glass-panel p-10 border-white/5 animate-scale-in flex flex-col gap-8">
              <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-display font-black text-white uppercase italic tracking-widest">Enterprise <span className="text-secondary">Operations</span></h2>
                    <p className="text-[10px] font-bold text-white/30 uppercase mt-1">ID: {selectedTenant.id}</p>
                 </div>
                 <button onClick={() => setShowOpsModal(false)} className="text-white/40 hover:text-white transition-colors">
                    <Plus className="rotate-45" size={24} />
                 </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 {['Personnel', 'Candidates', 'Users'].map(label => (
                    <div key={label} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                       <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">{label} Count</p>
                       <p className="text-2xl font-display font-black text-white">
                          {loadingOps ? '...' : (tenantOps.stats?.[label] ?? 0)}
                       </p>
                    </div>
                 ))}
              </div>

              <form onSubmit={handleUpdateOps} className="space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Company Alias</label>
                       <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-secondary transition-all outline-none"
                          value={tenantOps.company_name}
                          onChange={e => setTenantOps({...tenantOps, company_name: e.target.value})}
                       />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Service Tier</label>
                        <select 
                           className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-secondary transition-all outline-none appearance-none"
                           value={tenantOps.plan}
                           onChange={e => setTenantOps({...tenantOps, plan: e.target.value})}
                        >
                           <option value="starter">Starter - Trial</option>
                           <option value="growth">Growth - Standard</option>
                           <option value="enterprise">Enterprise - Unlimited</option>
                           <option value="custom">Tactical Custom</option>
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-4">Neural Module Activation</label>
                    <div className="grid grid-cols-4 gap-4">
                       {[
                         { id: 'source', name: 'Source', color: '#CC97FF', icon: Database },
                         { id: 'forge', name: 'Forge', color: '#10B981', icon: School },
                         { id: 'verify', name: 'Verify', color: '#F59E0B', icon: ShieldCheck },
                         { id: 'deploy', name: 'Deploy', color: '#6366F1', icon: Rocket }
                       ].map(mod => {
                          const active = tenantOps.modules_enabled.includes(mod.id);
                          return (
                             <button
                                key={mod.id}
                                type="button"
                                onClick={() => toggleModule(mod.id)}
                                className={`p-4 rounded-2xl border flex flex-col items-center gap-3 transition-all ${active ? 'bg-white/10 border-white/30' : 'bg-transparent border-white/5 opacity-40 hover:opacity-100'}`}
                             >
                                <div className="p-2 rounded-lg" style={{ background: active ? `${mod.color}20` : 'transparent', color: active ? mod.color : 'white' }}>
                                   {mod.id === 'source' && <Database size={18}/>}
                                   {mod.id === 'forge' && <School size={18}/>}
                                   {mod.id === 'verify' && <ShieldCheck size={18}/>}
                                   {mod.id === 'deploy' && <Rocket size={18}/>}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">{mod.name}</span>
                             </button>
                          )
                       })}
                    </div>
                 </div>

                 <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl mt-4">
                    <div>
                       <p className="text-xs font-bold text-white uppercase italic">Neural Link Status</p>
                       <p className="text-[9px] text-white/30 uppercase tracking-widest mt-1">Status: {tenantOps.is_active ? 'Active Connection' : 'Severed / Locked'}</p>
                    </div>
                    <button 
                       type="button"
                       onClick={() => setTenantOps({...tenantOps, is_active: !tenantOps.is_active})}
                       className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${tenantOps.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}
                    >
                       {tenantOps.is_active ? 'Online' : 'Offline'}
                    </button>
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button 
                       type="button"
                       onClick={() => setShowOpsModal(false)}
                       className="flex-1 py-4 bg-white/5 border border-white/10 text-white/60 font-black text-xs uppercase tracking-widest rounded-2xl hover:text-white transition-all"
                    >
                       Abort
                    </button>
                    <button 
                       disabled={savingOps}
                       type="submit"
                       className="flex-1 py-4 bg-secondary text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white transition-all shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
                    >
                       {savingOps ? <Activity size={16} className="animate-spin" /> : <Zap size={16} />}
                       Sync Parameters
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
