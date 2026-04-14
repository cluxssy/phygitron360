import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Plus, ArrowRight, User,
  ChevronDown, Download, MoreHorizontal,
  MapPin, Briefcase, Calendar, Phone, Mail,
  X, CheckCircle, XCircle, Clock, Users
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import AddEmployeeModal from './AddEmployeeModal';

const STATUS_COLORS = {
  'Active': '#10B981',
  'Notice Period': '#F59E0B',
  'Exited': '#F43F5E',
};

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterTeam, setFilterTeam] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/employees', { credentials: 'include' });
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load personnel matrix');
    } finally {
      setLoading(false);
    }
  };

  const teams = ['All', ...new Set(employees.map(e => e.team).filter(Boolean))];

  const filtered = employees.filter(e => {
    const matchSearch = !search || 
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
      e.email_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || e.employment_status === filterStatus;
    const matchTeam = filterTeam === 'All' || e.team === filterTeam;
    return matchSearch && matchStatus && matchTeam;
  });

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
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-3 px-6 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={14} /> Add Personnel
        </button>
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
                  onClick={() => setSelectedEmp(emp)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-sm shrink-0">
                        {emp.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white leading-tight">{emp.name}</p>
                        <p className="text-[10px] text-white/30 font-mono">{emp.employee_code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-white/60 font-bold">{emp.team || '—'}</td>
                  <td className="px-6 py-4 text-xs text-white/60">{emp.designation || '—'}</td>
                  <td className="px-6 py-4 text-xs text-white/40 flex items-center gap-1 mt-3">
                    {emp.location && <MapPin size={11} />} {emp.location || '—'}
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
                      View <ArrowRight size={12} />
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

      {/* Employee Profile Drawer - simplified inline */}
      {selectedEmp && (
        <EmployeeProfileDrawer emp={selectedEmp} onClose={() => setSelectedEmp(null)} onRefresh={fetchEmployees} />
      )}
    </div>
  );
}

function EmployeeProfileDrawer({ emp, onClose, onRefresh }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offboarding, setOffboarding] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/employee/${emp.employee_code}`, { credentials: 'include' });
        setDetails(await res.json());
      } catch {} finally { setLoading(false); }
    };
    fetch_();
  }, [emp.employee_code]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 rounded-3xl p-10 mx-4 animate-fade-in-up custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all">
          <X size={18} className="text-white/40" />
        </button>

        <div className="flex items-start gap-6 mb-10">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display font-black text-3xl shrink-0">
            {emp.name?.[0]}
          </div>
          <div>
            <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">{emp.name}</h2>
            <p className="text-primary font-black text-xs uppercase tracking-widest mt-1">{emp.designation} · {emp.team}</p>
            <div className="flex items-center gap-4 mt-3 text-white/30 text-xs">
              <span className="flex items-center gap-1"><Mail size={11}/> {emp.email_id}</span>
              <span className="flex items-center gap-1"><Phone size={11}/> {emp.contact_number}</span>
              <span className="flex items-center gap-1"><MapPin size={11}/> {emp.location}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'DOJ', value: emp.doj },
                { label: 'Type', value: emp.employment_type },
                { label: 'Manager', value: emp.reporting_manager },
              ].map((s, i) => (
                <div key={i} className="glass-panel p-5 border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{s.label}</p>
                  <p className="text-xs font-bold text-white">{s.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Skills */}
            {details?.skill_matrix && (
              <div className="glass-panel p-6 border-white/5">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Skill Profile</h4>
                <div className="space-y-2">
                  {details.skill_matrix.primary_skillset && (
                    <div>
                      <span className="text-[10px] text-primary font-black uppercase">Primary: </span>
                      <span className="text-xs text-white/70">{details.skill_matrix.primary_skillset}</span>
                    </div>
                  )}
                  {details.skill_matrix.secondary_skillset && (
                    <div>
                      <span className="text-[10px] text-white/40 font-black uppercase">Secondary: </span>
                      <span className="text-xs text-white/50">{details.skill_matrix.secondary_skillset}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Training */}
            {details?.training?.length > 0 && (
              <div className="glass-panel p-6 border-white/5">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4">Training Log</h4>
                <div className="space-y-2">
                  {details.training.slice(0, 5).map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{t.training_assigned}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        t.training_status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>{t.training_status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {emp.employment_status === 'Active' && (
              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => setOffboarding(true)}
                  className="flex-1 py-3 rounded-2xl border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                >
                  Initiate Offboarding
                </button>
              </div>
            )}

            {offboarding && (
              <OffboardForm empCode={emp.employee_code} onDone={() => { onClose(); onRefresh(); }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function OffboardForm({ empCode, onDone }) {
  const [exitDate, setExitDate] = useState('');
  const [exitReason, setExitReason] = useState('Resignation');
  const [exitType, setExitType] = useState('Immediate');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/employee/${empCode}/offboard`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exit_date: exitDate, exit_reason: exitReason, exit_type: exitType })
      });
      if (!res.ok) throw new Error();
      toast.success('Employee offboarded successfully');
      onDone();
    } catch {
      toast.error('Offboarding failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 border-red-500/20 space-y-4">
      <h4 className="text-xs font-black uppercase tracking-widest text-red-400">Offboarding Parameters</h4>
      <div className="grid grid-cols-2 gap-4">
        <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
          className="glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none" />
        <select value={exitType} onChange={e => setExitType(e.target.value)}
          className="glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none">
          <option className="bg-[#080f1f]" value="Immediate">Immediate Exit</option>
          <option className="bg-[#080f1f]" value="Notice Period">Notice Period</option>
        </select>
      </div>
      <input value={exitReason} onChange={e => setExitReason(e.target.value)} placeholder="Exit reason"
        className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none" />
      <button onClick={submit} disabled={submitting}
        className="w-full py-3 rounded-2xl bg-red-500/20 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/30 transition-all">
        {submitting ? 'Processing...' : 'Confirm Offboarding'}
      </button>
    </div>
  );
}
