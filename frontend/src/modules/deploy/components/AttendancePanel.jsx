import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Clock, CheckCircle, XCircle, LogIn, LogOut, Calendar, Users, BarChart3 } from 'lucide-react';

export default function AttendancePanel({ isAdmin }) {
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
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

      if (isAdmin) {
        const [al, dl] = await Promise.all([
          fetch('/api/attendance/leave/all-requests', { credentials: 'include' }).then(r => r.json()),
          fetch('/api/attendance/admin/today', { credentials: 'include' }).then(r => r.json()),
        ]);
        setAllLeaves(Array.isArray(al) ? al : []);
        setDailyLog(Array.isArray(dl) ? dl : []);
      }
    } catch { toast.error('Failed to load attendance data'); }
    finally { setLoading(false); }
  };

  const clockIn = async () => {
    try {
      const res = await fetch('/api/attendance/clock-in', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      toast.success('Clocked in!');
      loadData();
    } catch (e) { toast.error(e.message || 'Failed to clock in'); }
  };

  const clockOut = async () => {
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_log: workLog || 'No log provided' })
      });
      if (!res.ok) throw new Error();
      toast.success('Clocked out!');
      setWorkLog('');
      loadData();
    } catch { toast.error('Failed to clock out'); }
  };

  const leaveAction = async (id, action) => {
    try {
      const fd = new FormData();
      fd.append('action', action);
      await fetch(`/api/attendance/leave/action/${id}`, { method: 'POST', credentials: 'include', body: fd });
      toast.success(`Leave ${action}`);
      loadData();
    } catch { toast.error('Action failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Clock In/Out Widget */}
      <div className="glass-panel p-8 border-white/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Today's Status</p>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${status?.clocked_in ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'} animate-pulse`} />
              <p className="text-2xl font-display font-black text-white uppercase tracking-tighter">
                {status?.clocked_in ? 'On Duty' : 'Off Duty'}
              </p>
            </div>
            {status?.clock_in_time && (
              <p className="text-xs text-white/40 mt-2">In since: <span className="text-white/70 font-bold">{status.clock_in_time}</span></p>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            {status?.clocked_in ? (
              <>
                <textarea
                  value={workLog}
                  onChange={e => setWorkLog(e.target.value)}
                  placeholder="Brief work log before clocking out..."
                  rows={2}
                  className="glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none w-full md:w-80 resize-none"
                />
                <button onClick={clockOut}
                  className="flex items-center justify-center gap-3 px-8 py-3 bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-red-500/30 transition-all border border-red-500/20">
                  <LogOut size={14} /> Clock Out
                </button>
              </>
            ) : (
              <button onClick={clockIn}
                className="flex items-center justify-center gap-3 px-8 py-3 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-lg shadow-primary/20">
                <LogIn size={14} /> Clock In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Leave Balance */}
      {leaveBalance && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Sick Leave', used: leaveBalance.sick_used, total: leaveBalance.sick_total, color: '#F43F5E' },
            { label: 'Casual Leave', used: leaveBalance.casual_used, total: leaveBalance.casual_total, color: '#F59E0B' },
            { label: 'Privilege', used: leaveBalance.privilege_used || 0, total: leaveBalance.privilege_total || 15, color: '#6366F1' },
          ].map((lb, i) => (
            <div key={i} className="glass-panel p-6 border-white/5">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{lb.label}</span>
                <span className="text-xs font-bold" style={{ color: lb.color }}>{lb.total - lb.used} left</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 mb-2">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${(lb.used / lb.total) * 100}%`, background: lb.color }} />
              </div>
              <p className="text-[10px] text-white/30">{lb.used}/{lb.total} used</p>
            </div>
          ))}
        </div>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex gap-3">
            {[
              { id: 'today', label: "Today's Log" },
              { id: 'leaves', label: 'Pending Leaves' },
            ].map(t => (
              <button key={t.id} onClick={() => setAdminTab(t.id)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  adminTab === t.id ? 'bg-primary text-black' : 'glass-panel border-white/5 text-white/40 hover:text-white'
                }`}>{t.label}
              </button>
            ))}
          </div>

          {adminTab === 'today' && (
            <div className="glass-panel border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Employee', 'Clock In', 'Clock Out', 'Status'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailyLog.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-[10px] text-white/20 uppercase font-black">No attendance records for today</td></tr>
                  ) : dailyLog.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-xs font-bold text-white">{r.employee_code}</td>
                      <td className="px-6 py-4 text-xs text-emerald-400">{r.clock_in || '—'}</td>
                      <td className="px-6 py-4 text-xs text-red-400">{r.clock_out || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          r.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{r.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'leaves' && (
            <div className="glass-panel border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Employee', 'Type', 'Dates', 'Reason', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {allLeaves.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-[10px] text-white/20 uppercase font-black">No pending leave requests</td></tr>
                  ) : allLeaves.map((l, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4 text-xs font-bold text-white">{l.employee_code}</td>
                      <td className="px-6 py-4 text-xs text-primary font-bold">{l.leave_type}</td>
                      <td className="px-6 py-4 text-xs text-white/50">{l.start_date} → {l.end_date}</td>
                      <td className="px-6 py-4 text-xs text-white/40 max-w-xs truncate">{l.reason}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => leaveAction(l.id, 'Approved')}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => leaveAction(l.id, 'Rejected')}
                            className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
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
        </div>
      )}

      {/* My Leave Requests */}
      {!isAdmin && myLeaves.length > 0 && (
        <div className="glass-panel border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40">My Leave History</h3>
          </div>
          <div className="divide-y divide-white/5">
            {myLeaves.map((l, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-xs font-bold text-white">{l.leave_type} Leave</p>
                  <p className="text-[10px] text-white/40">{l.start_date} → {l.end_date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                  l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  l.status === 'Rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
