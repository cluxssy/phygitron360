import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Plus, ArrowRight, Mail, Phone, MapPin, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AddEmployeeModal from './AddEmployeeModal';
import HasPermission from '../../../components/common/HasPermission';

const STATUS_COLORS = {
  'Active': '#10B981',
  'Notice Period': '#F59E0B',
  'Exited': '#F43F5E',
};

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTeam, setFilterTeam] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees', { credentials: 'include' });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error('Failed to load personnel');
    } finally {
      setLoading(false);
    }
  };

  const filtered = employees.filter(e => {
    const s = search.toLowerCase();
    const matchSearch = e.name.toLowerCase().includes(s) || e.employee_code.toLowerCase().includes(s);
    const matchStatus = filterStatus === 'All' || e.employment_status === filterStatus;
    const matchTeam = filterTeam === 'All' || e.team === filterTeam;
    return matchSearch && matchStatus && matchTeam;
  });

  const teams = ['All', ...new Set(employees.map(e => e.team).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search personnel..."
              className="w-full pl-10 pr-4 py-3 glass-panel border-white/5 text-white text-xs font-bold placeholder-white/20 bg-transparent rounded-2xl focus:outline-none focus:border-primary/40"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="glass-panel border-white/5 text-white text-[10px] font-black uppercase tracking-widest bg-transparent px-4 py-3 rounded-2xl focus:outline-none cursor-pointer"
          >
            {['All', 'Active', 'Notice Period', 'Exited'].map(s => (
              <option key={s} value={s} className="bg-[#080f1f]">{s}</option>
            ))}
          </select>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="glass-panel border-white/5 text-white text-[10px] font-black uppercase tracking-widest bg-transparent px-4 py-3 rounded-2xl focus:outline-none cursor-pointer"
          >
            {teams.map(t => (
              <option key={t} value={t} className="bg-[#080f1f]">{t}</option>
            ))}
          </select>
        </div>
        <HasPermission permission="deploy.employees.create">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> Add Personnel
          </button>
        </HasPermission>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', count: employees.length, color: '#CC97FF' },
          { label: 'Active', count: employees.filter(e => e.employment_status === 'Active').length, color: '#10B981' },
          { label: 'Notice', count: employees.filter(e => e.employment_status === 'Notice Period').length, color: '#F59E0B' },
          { label: 'Exited', count: employees.filter(e => e.employment_status === 'Exited').length, color: '#F43F5E' },
          { label: 'Teams', count: new Set(employees.map(e => e.team).filter(Boolean)).size, color: '#6366F1' },
          { label: 'Results', count: filtered.length, color: '#38BDF8' },
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 border-white/5 text-center">
            <p className="text-xl font-display font-black" style={{ color: s.color }}>{s.count}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Employee Table */}
      <div className="glass-panel border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-4">
            <Users size={40} className="text-white/10" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No personnel matching parameters</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {['Personnel', 'Team', 'Designation', 'Location', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((emp, i) => (
                <tr
                  key={emp.employee_code || i}
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => navigate(`/deploy?tab=profile&code=${emp.employee_code}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-sm shrink-0 overflow-hidden">
                        {emp.photo_path ? <img src={`/${emp.photo_path}`} className="w-full h-full object-cover" alt="" /> : (emp.name?.[0] || '?')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{emp.name}</p>
                        <p className="text-[10px] text-white/30 font-mono">{emp.employee_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-white/60 font-bold">{emp.team || '—'}</td>
                  <td className="px-6 py-4 text-xs text-white/60">{emp.designation || '—'}</td>
                  <td className="px-6 py-4 text-xs text-white/40">
                    <div className="flex items-center gap-1 mt-1">
                      {emp.location && <MapPin size={11} />} {emp.location || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                      style={{
                        background: `${STATUS_COLORS[emp.employment_status] || '#6366F1'}15`,
                        color: STATUS_COLORS[emp.employment_status] || '#6366F1',
                        border: `1px solid ${STATUS_COLORS[emp.employment_status] || '#6366F1'}30`,
                      }}
                    >
                      {emp.employment_status || 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary">
                      Manage <ArrowRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); fetchEmployees(); }}
        />
      )}
    </div>
  );
}
