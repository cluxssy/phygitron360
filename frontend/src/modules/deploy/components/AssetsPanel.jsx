import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Package, CheckCircle, XCircle } from 'lucide-react';

const ASSET_LABELS = {
  ob_laptop: 'Laptop', ob_laptop_bag: 'Laptop Bag', ob_headphones: 'Headphones',
  ob_mouse: 'Mouse', ob_extra_hardware: 'Extra Hardware', ob_client_assets: 'Client Assets',
  ob_id_card: 'ID Card', ob_email_access: 'Email Access', ob_groups: 'Groups Access',
  ob_mediclaim: 'Mediclaim', ob_pf: 'PF',
};

const CLEARANCE_LABELS = {
  cl_laptop: 'Laptop Returned', cl_laptop_bag: 'Bag Returned', cl_headphones: 'Headphones Returned',
  cl_mouse: 'Mouse Returned', cl_id_card: 'ID Card Surrendered', cl_email_disabled: 'Email Disabled',
  cl_groups_removed: 'Access Removed', cl_assets_verified: 'Client Assets Verified',
  cl_mediclaim_settled: 'Mediclaim Terminated', cl_accounts_clearance: 'Accounts Clearance',
};

export default function AssetsPanel() {
  const [employees, setEmployees] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [assets, setAssets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/employees', { credentials: 'include' })
      .then(r => r.json()).then(d => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  const loadAssets = async (code) => {
    setSelectedCode(code);
    if (!code) { setAssets(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/assets/${code}`, { credentials: 'include' });
      const data = await res.json();
      setAssets(data);
    } catch { toast.error('Failed to load allocations'); }
    finally { setLoading(false); }
  };

  const toggleAsset = (field) => {
    setAssets(prev => ({ ...prev, [field]: prev[field] ? 0 : 1 }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/assets/${selectedCode}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assets)
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Sync failed');
      }
      
      toast.success('Allocation protocols updated!');
    } catch (e) { 
      toast.error(e.message || 'Sync failed'); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 border-white/5 flex items-center gap-6">
        <Package size={20} className="text-primary shrink-0" />
        <select
          value={selectedCode}
          onChange={e => loadAssets(e.target.value)}
          className="flex-1 glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none"
        >
          <option value="" className="bg-[#080f1f]">Select deployment unit to view allocations</option>
          {employees.map(e => (
            <option key={e.employee_code} value={e.employee_code} className="bg-[#080f1f]">
              {e.name} ({e.employee_code})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {assets && !loading && (
        <div className="animate-fade-in-up space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Onboarding */}
              <div className="glass-panel border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-primary/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Deployment // Onboarding Protocol</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-x divide-y divide-white/5">
                  {Object.entries(ASSET_LABELS).map(([field, label]) => (
                    <button
                      key={field}
                      onClick={() => toggleAsset(field)}
                      className={`p-4 flex items-center gap-4 transition-all text-left hover:bg-white/[0.03] ${
                        assets[field] ? 'bg-emerald-500/[0.05]' : ''
                      }`}
                    >
                      {assets[field]
                        ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                        : <XCircle size={16} className="text-white/10 shrink-0" />
                      }
                      <span className={`text-[10px] font-black uppercase tracking-widest ${assets[field] ? 'text-white' : 'text-white/20'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Clearance */}
              <div className="glass-panel border-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-amber-500/5">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Separation // Clearance Protocol</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-x divide-y divide-white/5">
                  {Object.entries(CLEARANCE_LABELS).map(([field, label]) => (
                    <button
                      key={field}
                      onClick={() => toggleAsset(field)}
                      className={`p-4 flex items-center gap-4 transition-all text-left hover:bg-white/[0.03] ${
                        assets[field] ? 'bg-amber-500/[0.05]' : ''
                      }`}
                    >
                      {assets[field]
                        ? <CheckCircle size={16} className="text-amber-500 shrink-0" />
                        : <XCircle size={16} className="text-white/10 shrink-0" />
                      }
                      <span className={`text-[10px] font-black uppercase tracking-widest ${assets[field] ? 'text-white' : 'text-white/20'}`}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
          </div>

          <div className="glass-panel border-white/5 p-6">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-3 italic">Command Remarks & Lifecycle Logs</label>
            <textarea
              value={assets.ob_remarks || ''}
              onChange={e => setAssets(prev => ({ ...prev, ob_remarks: e.target.value }))}
              rows={3}
              className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-5 py-4 rounded-2xl focus:outline-none resize-none placeholder-white/5"
              placeholder="Record any deviations or asset conditions during lifecycle..."
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="px-12 py-4 bg-primary text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              {saving ? 'Syncing...' : 'Lock Assessment Protocols'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
