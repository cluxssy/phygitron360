import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Package, CheckCircle, XCircle } from 'lucide-react';

const ASSET_LABELS = {
  ob_laptop: 'Laptop', ob_laptop_bag: 'Laptop Bag', ob_headphones: 'Headphones',
  ob_mouse: 'Mouse', ob_extra_hardware: 'Extra Hardware', ob_client_assets: 'Client Assets',
  ob_id_card: 'ID Card', ob_email_access: 'Email Access', ob_groups: 'Groups Access',
  ob_mediclaim: 'Mediclaim', ob_pf: 'PF',
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
    } catch { toast.error('Failed to load assets'); }
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
      if (!res.ok) throw new Error();
      toast.success('Asset checklist updated!');
    } catch { toast.error('Save failed'); }
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
          <option value="" className="bg-[#080f1f]">Select an employee to view assets</option>
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
        <>
          <div className="glass-panel border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 bg-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">Onboarding Checklist</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 divide-x divide-y divide-white/5">
              {Object.entries(ASSET_LABELS).map(([field, label]) => (
                <button
                  key={field}
                  onClick={() => toggleAsset(field)}
                  className={`p-5 flex items-center gap-4 transition-all text-left hover:bg-white/[0.03] ${
                    assets[field] ? 'bg-emerald-500/[0.05]' : ''
                  }`}
                >
                  {assets[field]
                    ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                    : <XCircle size={16} className="text-white/20 shrink-0" />
                  }
                  <span className={`text-xs font-bold ${assets[field] ? 'text-white' : 'text-white/30'}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {assets.ob_remarks !== undefined && (
            <div className="glass-panel border-white/5 p-6">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Onboarding Remarks</label>
              <textarea
                value={assets.ob_remarks || ''}
                onChange={e => setAssets(prev => ({ ...prev, ob_remarks: e.target.value }))}
                rows={3}
                className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none resize-none"
                placeholder="Add remarks..."
              />
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="px-8 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Checklist'}
          </button>
        </>
      )}
    </div>
  );
}
