import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';
import { Clock, CheckCircle, XCircle, LogIn, LogOut, Calendar, Users, BarChart3, Activity, Zap, Shield } from 'lucide-react';

export default function AttendancePanel({ mode }) {
  const { user } = useAuth();
  const isAdmin = mode === 'admin';
  const isEmployee = mode === 'employee';
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [dailyLog, setDailyLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workLog, setWorkLog] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [adminTab, setAdminTab] = useState('today');
  
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', leave_type: 'Sick', reason: '' });
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showClockOutModal, setShowClockOutModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isAdmin && adminTab === 'heatmap') {
        fetchSummary();
    }
  }, [adminTab, selectedMonth, selectedYear, isAdmin]);

  const fetchSummary = async () => {
      try {
          const res = await fetch(`/api/attendance/admin/summary?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
          const data = await res.json();
          setAttendanceSummary(Array.isArray(data) ? data : []);
      } catch { toast.error('Failed to load summary'); }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.employee_code) {
          const [s, h, b, ml] = await Promise.all([
            fetch('/api/attendance/status', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/attendance/history', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/attendance/leave/balance', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/attendance/leave/my-requests', { credentials: 'include' }).then(r => r.json()),
          ]);
          setStatus(s);
          setHistory(Array.isArray(h) ? h : []);
          setLeaveBalance(b);
          setMyLeaves(Array.isArray(ml) ? ml : []);
      }

      if (isAdmin) {
        const [al, dl] = await Promise.all([
          fetch('/api/attendance/leave/all-requests', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/attendance/admin/today', { credentials: 'include' }).then(r => r.json()),
        ]);
        setAllLeaves(Array.isArray(al) ? al : []);
        setDailyLog(Array.isArray(dl) ? dl : []);
      }
    } catch { 
        toast.error('Failed to load attendance data'); 
    } finally { 
        setLoading(false); 
    }
  };

  const clockIn = async () => {
    try {
      const res = await fetch('/api/attendance/clock-in', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Clock in failed');
      toast.success('Clocked in!');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const clockOut = async () => {
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_log: workLog || 'No log provided' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Clock out failed');
      toast.success('Clocked out!');
      setWorkLog('');
      loadData();
      setShowClockOutModal(false);
    } catch (e) { toast.error(e.message); }
  };

  const applyLeave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/attendance/leave/apply', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Application failed');
      toast.success(data.message);
      setShowLeaveForm(false);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const leaveAction = async (id, action) => {
    try {
      const fd = new FormData();
      fd.append('action', action);
      const res = await fetch(`/api/attendance/leave/action/${id}`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Action failed');
      }
      toast.success(`Leave ${action}`);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Clock In/Out Widget */}
      {isEmployee && (
        <div className="glass-panel p-8 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Clock size={120} />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Live Session // Matrix Sync</p>
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${status?.status === 'clocked_in' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/10'} ${status?.status === 'clocked_in' ? 'animate-pulse' : ''}`} />
                <p className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">
                  {status?.status === 'clocked_in' ? 'Active Uplink' : status?.status === 'completed' ? 'Session Terminated' : 'Standby Mode'}
                </p>
              </div>
              {status?.data?.clock_in && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-3 flex items-center gap-2">
                  <LogIn size={12} className="text-emerald-400" />
                  Synchronized at <span className="text-white">{status.data.clock_in}</span>
                </p>
              )}
              {status?.data?.clock_out && (
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-1 flex items-center gap-2">
                  <LogOut size={12} className="text-red-400" />
                  Closed at <span className="text-white">{status.data.clock_out}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto">
              {status?.status === 'clocked_in' ? (
                <button onClick={() => setShowClockOutModal(true)}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-red-500 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-400 transition-all font-display italic">
                  <LogOut size={14} /> Terminate Session
                </button>
              ) : status?.status === 'not_started' ? (
                <button onClick={clockIn}
                  className="flex items-center justify-center gap-3 px-10 py-5 bg-primary text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white transition-all shadow-xl shadow-primary/20 font-display italic">
                  <LogIn size={18} /> Initiate Uplink
                </button>
              ) : (
                  <div className="px-8 py-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 opacity-50">
                      <CheckCircle size={16} className="text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Quota Satisfied</span>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Balance & Action */}
      {isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                  { label: 'Sick Matrix', used: leaveBalance?.sick_used || 0, total: leaveBalance?.sick_total || 10, color: '#F43F5E', icon: Activity },
                  { label: 'Casual Matrix', used: leaveBalance?.casual_used || 0, total: leaveBalance?.casual_total || 12, color: '#F59E0B', icon: Zap },
                  { label: 'Privilege Matrix', used: leaveBalance?.privilege_used || 0, total: leaveBalance?.privilege_total || 15, color: '#6366F1', icon: Shield },
              ].map((lb, i) => (
                  <div key={i} className="glass-panel p-6 border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 text-white/5 group-hover:text-white/10 transition-colors">
                          <lb.icon size={48} />
                      </div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{lb.label}</span>
                          <span className="text-[10px] font-black font-display italic" style={{ color: lb.color }}>{lb.total - lb.used} Available</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 relative z-10">
                          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${(lb.used / lb.total) * 100}%`, background: lb.color }} />
                      </div>
                  </div>
              ))}
          </div>
          <button 
              onClick={() => setShowLeaveForm(true)}
              className="glass-panel border-white/10 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 p-6 group"
          >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                  <Calendar size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white">Request Absence</span>
          </button>
        </div>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-2">
                {[
                { id: 'today', label: "Daily Log", icon: Users },
                { id: 'leaves', label: 'Absence Queue', icon: Clock },
                { id: 'heatmap', label: 'Team Matrix', icon: BarChart3 },
                ].map(t => (
                <button key={t.id} onClick={() => setAdminTab(t.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    adminTab === t.id ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'glass-panel border-white/5 text-white/40 hover:text-white'
                    }`}>
                    <t.icon size={14} />
                    {t.label}
                </button>
                ))}
            </div>
            
            {adminTab === 'heatmap' && (
                <div className="flex gap-2">
                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="glass-panel border-white/10 text-white text-[10px] font-black uppercase tracking-widest bg-[#0b1426] px-4 py-2 rounded-xl focus:outline-none"
                    >
                        {Array.from({length: 12}, (_, i) => (
                            <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <input 
                        type="number" 
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-24 glass-panel border-white/10 text-white text-[10px] font-black uppercase tracking-widest bg-[#0b1426] px-4 py-2 rounded-xl focus:outline-none"
                    />
                </div>
            )}
          </div>

          {adminTab === 'today' && (
            <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Personnel', 'Clock In', 'Clock Out', 'Status', 'Mission Log'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailyLog.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-16 text-center text-[10px] text-white/20 uppercase font-black tracking-widest italic animate-pulse">Scanning matrix for records...</td></tr>
                  ) : dailyLog.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                          <p className="text-xs font-bold text-white uppercase italic">{r.employee_name || r.employee_code}</p>
                          <p className="text-[9px] text-white/30 font-mono tracking-tighter uppercase">{r.designation || 'Specialist'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-emerald-400">{r.clock_in || '—'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-red-500">{r.clock_out || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase italic ${
                          r.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-white/40 italic truncate max-w-[200px]">{r.work_log || 'No notes found'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'leaves' && (
            <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Applicant', 'Protocol', 'Window', 'Rationale', 'Control'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allLeaves.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-[10px] text-white/20 uppercase font-black tracking-widest italic animate-pulse">Absence Queue Clear</td></tr>
                  ) : allLeaves.map((l, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                          <p className="text-xs font-bold text-white uppercase italic">{l.employee_name || l.employee_code}</p>
                          <p className="text-[9px] text-white/30 font-mono uppercase">Level {l.applicant_role || '4'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-primary font-black uppercase italic">{l.leave_type}</td>
                      <td className="px-6 py-4 text-xs font-mono text-white/50">{l.start_date} → {l.end_date}</td>
                      <td className="px-6 py-4 text-[10px] text-white/40 max-w-xs truncate">{l.reason}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => leaveAction(l.id, 'Approved')}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => leaveAction(l.id, 'Rejected')}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black transition-all">
                            <XCircle size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'heatmap' && (
              <div className="glass-panel border-white/5 overflow-x-auto animate-fade-in-up">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                          <tr className="bg-white/5">
                              <th className="sticky left-0 bg-[#0B1326] px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30 border-r border-white/5">Personnel Matrix</th>
                              {Array.from({length: new Date(selectedYear, selectedMonth, 0).getDate()}, (_, i) => (
                                  <th key={i+1} className="px-2 py-4 text-[8px] font-black text-center text-white/20 border-r border-white/5 w-8">{i+1}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {attendanceSummary.map((emp, i) => (
                              <tr key={i} className="hover:bg-white/[0.02]">
                                  <td className="sticky left-0 bg-[#0B1326] px-6 py-3 border-r border-white/5 z-10">
                                      <p className="text-[10px] font-bold text-white uppercase italic truncate max-w-[150px]">{emp.name}</p>
                                      <p className="text-[8px] text-white/30 font-mono">{emp.code}</p>
                                  </td>
                                  {emp.days.map((d, di) => {
                                      let color = 'bg-white/5';
                                      if (d.status === 'Present') color = 'bg-emerald-500/40 border border-emerald-500/20';
                                      if (d.status === 'Half Day') color = 'bg-amber-500/40 border border-amber-500/20';
                                      if (d.status === 'Absent') color = 'bg-red-500/40 border border-red-500/20';
                                      if (d.status === 'Leave') color = 'bg-primary/40 border border-primary/20';
                                      if (d.status === 'Active') color = 'bg-emerald-400/20 border border-emerald-400/40 animate-pulse';
                                      if (d.status === 'Weekend') color = 'bg-white/[0.02]';
                                      
                                      return (
                                          <td key={di} className="p-0.5 border-r border-white/5 h-10">
                                              <div 
                                                title={`${d.date}: ${d.status}`}
                                                className={`w-full h-full rounded-sm ${color} transition-all hover:scale-110 hover:z-20 cursor-help`}
                                              />
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <div className="px-6 py-4 border-t border-white/5 flex gap-6">
                      {[
                          { label: 'Present', color: 'bg-emerald-500' },
                          { label: 'Active', color: 'bg-emerald-400 animate-pulse' },
                          { label: 'Half Day', color: 'bg-amber-500' },
                          { label: 'Absent', color: 'bg-red-500' },
                          { label: 'Leave', color: 'bg-primary' },
                      ].map(l => (
                          <div key={l.label} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${l.color}`} />
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30">{l.label}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}
        </div>
      )}

      {/* History Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance History */}
        <div className="glass-panel border-white/5 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <BarChart3 size={14} className="text-primary" /> Log History
                </h3>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5 scrollbar-hide">
                {history.length === 0 ? (
                    <p className="p-10 text-center text-[9px] uppercase font-black text-white/10">No logs decrypted</p>
                ) : history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                        <div>
                            <p className="text-xs font-black text-white italic">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-[9px] text-white/30 font-mono uppercase">Session: {h.clock_in} - {h.clock_out || '??'}</p>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase italic ${
                            h.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{h.status}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Absence History */}
        <div className="glass-panel border-white/5 overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                <Calendar size={14} className="text-secondary" /> Request History
            </h3>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5 scrollbar-hide">
            {myLeaves.length === 0 ? (
                <p className="p-10 text-center text-[9px] uppercase font-black text-white/10">No requests filed</p>
            ) : myLeaves.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="text-xs font-black text-white italic">{l.leave_type} Protocol</p>
                  <p className="text-[9px] text-white/30 font-mono uppercase">{l.start_date} to {l.end_date}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase italic ${
                  l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  l.status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                }`}>{l.status || 'Pending'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Absence Request Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in p-4">
          <form onSubmit={applyLeave} className="glass-panel border-white/10 p-10 w-full max-w-md space-y-6 relative overflow-hidden bg-[#060E20]">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Calendar size={100} /></div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-display font-black text-white uppercase italic tracking-widest mb-1">Request <span className="text-primary">Absence</span></h3>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-8">Authorization Protocol 77-A</p>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 block ml-1">Protocol Type</label>
                        <select 
                            value={leaveForm.leave_type}
                            onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                            className="w-full glass-panel border-white/10 text-white text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all uppercase font-bold"
                        >
                            <option value="Sick" className="bg-[#0b1426]">Sick Matrix</option>
                            <option value="Casual" className="bg-[#0b1426]">Casual Matrix</option>
                            <option value="Privilege" className="bg-[#0b1426]">Privilege Matrix</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 block ml-1">Commencement</label>
                            <input 
                                type="date"
                                required
                                value={leaveForm.start_date}
                                onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})}
                                className="w-full glass-panel border-white/10 text-white text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all uppercase font-mono"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 block ml-1">Termination</label>
                            <input 
                                type="date"
                                required
                                value={leaveForm.end_date}
                                onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})}
                                className="w-full glass-panel border-white/10 text-white text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all uppercase font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 block ml-1">Protocol Rationale</label>
                        <textarea 
                            required
                            placeholder="State mission-critical reasons for absence..."
                            value={leaveForm.reason}
                            onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                            rows={3}
                            className="w-full glass-panel border-white/10 text-white text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all resize-none placeholder:text-white/10"
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-10">
                    <button 
                        type="button"
                        onClick={() => setShowLeaveForm(false)}
                        className="flex-1 py-4 rounded-2xl border border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/5 transition-all"
                    >
                        Abort
                    </button>
                    <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-primary/10 font-display italic"
                    >
                        File Request
                    </button>
                </div>
            </div>
          </form>
        </div>
      )}
      {/* Clock Out Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-fade-in p-4">
          <div className="glass-panel border-white/10 p-10 w-full max-w-md space-y-8 relative overflow-hidden bg-[#060E20]">
             <div className="absolute top-0 right-0 p-8 opacity-5 text-red-500"><LogOut size={120} /></div>
             
             <div className="relative z-10 text-center">
                 <h3 className="text-2xl font-display font-black text-white uppercase italic tracking-widest mb-2">Finalize <span className="text-red-500">Session</span></h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-8">Debrief Protocol Required</p>
                 
                 <div className="space-y-6 text-left">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-red-400/60 mb-3 block ml-1">Work Rationale / Summary</label>
                        <textarea 
                            required
                            placeholder="State your accomplishments for the session..."
                            value={workLog}
                            onChange={e => setWorkLog(e.target.value)}
                            rows={4}
                            className="w-full glass-panel border-white/10 text-white text-sm bg-white/5 px-5 py-5 rounded-2xl focus:outline-none focus:border-red-500/50 transition-all resize-none placeholder:text-white/10"
                        />
                    </div>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowClockOutModal(false)}
                            className="flex-1 px-8 py-5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/5 transition-all"
                        >
                            Abort
                        </button>
                        <button 
                            onClick={clockOut}
                            className="flex-[2] px-10 py-5 bg-red-500 text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-red-400 transition-all shadow-xl shadow-red-500/20 font-display italic flex items-center justify-center gap-3"
                        >
                            Sync & Terminate <CheckCircle size={16} />
                        </button>
                    </div>
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
