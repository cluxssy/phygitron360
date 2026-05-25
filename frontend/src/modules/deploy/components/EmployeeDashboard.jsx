import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  User, CheckCircle, Clock, Activity, Shield, AlertCircle,
  Calendar, TrendingUp, Bell, BookOpen, ChevronRight,
  LogIn, LogOut, Award, Zap, BarChart3, Star
} from 'lucide-react';

const fmt = (t) => {
  if (!t) return '--';
  return String(t).substring(0, 5);
};

const fmtDate = (d) => {
  if (!d) return '--';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const statusColor = (s) => {
  if (!s) return 'text-black/30';
  const l = s.toLowerCase();
  if (l === 'present') return 'text-emerald-500';
  if (l === 'half day') return 'text-amber-500';
  if (l === 'absent') return 'text-red-500';
  if (l === 'active') return 'text-emerald-500';
  return 'text-black/50';
};

const leaveStatusBadge = (s) => {
  if (s === 'Approved') return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
  if (s === 'Rejected') return 'bg-red-500/10 text-red-500 border border-red-500/20';
  return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
};

const trainingStatusBadge = (s) => {
  if (s === 'Completed') return 'bg-emerald-500/10 text-emerald-600';
  if (s === 'In Progress') return 'bg-blue-500/10 text-blue-600';
  return 'bg-black/5 text-black/40';
};

export default function EmployeeDashboard({ mode = 'employee', user }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockingOut, setClockingOut] = useState(false);
  const [workLog, setWorkLog] = useState('');
  const [showClockOutModal, setShowClockOutModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/employee-stats', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      toast.error(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClockIn = async () => {
    try {
      const res = await fetch('/api/attendance/clock-in', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Clock-in failed');
      toast.success('Clocked in!');
      fetchData();
    } catch (e) { toast.error(e.message); }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_log: workLog })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Clock-out failed');
      toast.success('Clocked out!');
      setShowClockOutModal(false);
      setWorkLog('');
      fetchData();
    } catch (e) { toast.error(e.message); }
    finally { setClockingOut(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const emp = profile?.employee || {};
  const leaves = profile?.leaves || {};
  const kras = profile?.kras || { total: 0, completed: 0 };
  const training = profile?.training || { total: 0, completed: 0 };
  const trainingList = profile?.training_list || [];
  const attendance = profile?.attendance || {};
  const attMonth = attendance.month || { present: 0, half_day: 0, absent: 0 };
  const attToday = attendance.today;
  const recentLeaves = profile?.recent_leaves || [];
  const notifications = profile?.notifications || [];
  const latestPerf = profile?.latest_performance;
  const assetsTotal = profile?.assets?.total || 0;

  const isClockedIn = attToday?.clock_in && !attToday?.clock_out;
  const isClockedOut = attToday?.clock_out;
  const leaveBalance = (leaves.casual_total || 0) - (leaves.casual_used || 0);
  const krasPercent = kras.total ? Math.round((kras.completed / kras.total) * 100) : 0;
  const trainingPercent = training.total ? Math.round((training.completed / training.total) * 100) : 0;

  // DOJ → tenure
  const tenureStr = (() => {
    if (!emp.doj) return null;
    try {
      const ms = Date.now() - new Date(emp.doj).getTime();
      const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
      const mos = Math.floor((ms % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
      return yrs > 0 ? `${yrs}y ${mos}m` : `${mos}m`;
    } catch { return null; }
  })();

  const photoSrc = emp.photo_path
    ? (emp.photo_path.startsWith('http') ? emp.photo_path : `/${emp.photo_path}`)
    : null;

  const totalMonthDays = attMonth.present + attMonth.half_day + attMonth.absent;
  const attendanceRate = totalMonthDays > 0
    ? Math.round(((attMonth.present + attMonth.half_day * 0.5) / totalMonthDays) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in-up pb-16">

      {/* ─── HERO HEADER ─── */}
      <div className="bg-gradient-to-br from-[#7c3aed] via-[#8b5cf6] to-[#a78bfa] rounded-[2.5rem] p-8 shadow-[0_20px_60px_rgba(124,58,237,0.25)] relative overflow-hidden">
        {/* BG decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden flex-shrink-0 shadow-xl shadow-black/20 border-2 border-white/20">
            {photoSrc ? (
              <img src={photoSrc} alt={emp.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-4xl font-black">
                {(emp.name || user?.name || 'U')[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Employee Dashboard</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight italic mb-1">
              {emp.name || user?.name || 'Welcome'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {emp.designation && (
                <span className="bg-white/15 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                  {emp.designation}
                </span>
              )}
              {emp.team && (
                <span className="bg-white/10 text-white/80 text-[11px] font-bold px-3 py-1 rounded-full">
                  {emp.team}
                </span>
              )}
              {emp.location && (
                <span className="bg-white/10 text-white/80 text-[11px] font-bold px-3 py-1 rounded-full">
                  📍 {emp.location}
                </span>
              )}
              {tenureStr && (
                <span className="bg-white/10 text-white/80 text-[11px] font-bold px-3 py-1 rounded-full">
                  ⏱ {tenureStr} tenure
                </span>
              )}
            </div>
          </div>

          {/* Clock In/Out widget */}
          <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-center min-w-[180px] flex-shrink-0">
            <p className="text-white/60 text-[9px] font-black uppercase tracking-widest mb-3">Today's Status</p>
            <div className={`text-lg font-black mb-1 ${isClockedOut ? 'text-emerald-300' : isClockedIn ? 'text-amber-300 animate-pulse' : 'text-white/40'}`}>
              {isClockedOut ? '✓ Done' : isClockedIn ? '● Active' : '○ Not Started'}
            </div>
            {attToday && (
              <p className="text-white/60 text-[10px] font-mono mb-3">
                {fmt(attToday.clock_in)} {attToday.clock_out ? `→ ${fmt(attToday.clock_out)}` : '→ now'}
              </p>
            )}
            {!attToday && (
              <button
                onClick={handleClockIn}
                className="w-full py-2 bg-white text-[#7c3aed] text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-lg mt-2"
              >
                <LogIn size={12} className="inline mr-1" />Clock In
              </button>
            )}
            {isClockedIn && (
              <button
                onClick={() => setShowClockOutModal(true)}
                className="w-full py-2 bg-red-400/80 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all shadow-lg mt-2"
              >
                <LogOut size={12} className="inline mr-1" />Clock Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Calendar, label: 'Leave Balance', value: leaveBalance,
            sub: `${leaves.casual_used || 0} used of ${leaves.casual_total || 0}`,
            color: 'text-[#7c3aed]', bg: 'bg-[#f5f0ff]', border: 'border-[#e9d5ff]'
          },
          {
            icon: Activity, label: 'This Month', value: `${attendanceRate}%`,
            sub: `${attMonth.present}P · ${attMonth.half_day}HD · ${attMonth.absent}A`,
            color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100'
          },
          {
            icon: Award, label: 'Performance',
            value: latestPerf ? `${latestPerf.percentage ?? 0}%` : 'N/A',
            sub: latestPerf ? `${latestPerf.period_value} · ${latestPerf.status}` : 'No assessment yet',
            color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100'
          },
          {
            icon: Shield, label: 'Assets', value: assetsTotal,
            sub: assetsTotal === 1 ? '1 device assigned' : `${assetsTotal} items assigned`,
            color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100'
          },
        ].map((c, i) => (
          <div key={i} className={`bg-white border ${c.border} rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]`}>
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon size={16} className={c.color} />
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">{c.label}</p>
            <h3 className={`text-2xl font-black ${c.color}`}>{c.value}</h3>
            <p className="text-[10px] text-black/40 font-semibold mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── MAIN GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Attendance + Leave */}
        <div className="lg:col-span-2 space-y-6">

          {/* Attendance Month Bar */}
          <div className="bg-white border border-[#ebe4ff] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-1">This Month</p>
                <h3 className="text-base font-black text-black uppercase italic">Attendance Overview</h3>
              </div>
              <button
                onClick={() => navigate('/deploy?tab=attendance')}
                className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                Full Log <ChevronRight size={12} />
              </button>
            </div>

            {/* Bar chart */}
            <div className="flex gap-2 h-16 items-end mb-3">
              {['present', 'half_day', 'absent'].map((key) => {
                const val = attMonth[key] || 0;
                const max = Math.max(attMonth.present, attMonth.half_day, attMonth.absent, 1);
                const pct = Math.round((val / max) * 100);
                const colors = { present: 'bg-emerald-500', half_day: 'bg-amber-400', absent: 'bg-red-400' };
                return (
                  <div key={key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-black text-black/50">{val}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: key === 'present' ? '#10b981' : key === 'half_day' ? '#f59e0b' : '#f87171' }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4">
              {[['emerald-500','#10b981','Present'], ['amber-400','#f59e0b','Half Day'], ['red-400','#f87171','Absent']].map(([,color,label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[9px] font-black text-black/50 uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave History */}
          <div className="bg-white border border-[#ebe4ff] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="px-6 py-4 border-b border-[#f1ecff] bg-[#faf7ff] flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-0.5">Leave Balance: {leaveBalance} days</p>
                <h3 className="text-sm font-black text-black uppercase italic">Recent Leave Requests</h3>
              </div>
              <button
                onClick={() => navigate('/deploy?tab=attendance')}
                className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-1 hover:opacity-70 transition-opacity"
              >
                Manage <ChevronRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-[#f1ecff]">
              {recentLeaves.length === 0 ? (
                <p className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-black/20">No leave requests yet</p>
              ) : recentLeaves.map((l, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-[#faf7ff] transition-colors">
                  <div>
                    <p className="text-xs font-black text-black">{l.leave_type}</p>
                    <p className="text-[10px] text-black/40 font-mono">{l.start_date} → {l.end_date}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${leaveStatusBadge(l.status)}`}>
                    {l.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Notifications + Quick Links */}
        <div className="space-y-6">

          {/* Notifications */}
          <div className="bg-white border border-[#ebe4ff] rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="px-5 py-4 border-b border-[#f1ecff] bg-[#faf7ff] flex items-center gap-2">
              <Bell size={14} className="text-[#7c3aed]" />
              <h3 className="text-sm font-black text-black uppercase italic tracking-tight">Notifications</h3>
              {notifications.filter(n => !n.is_read).length > 0 && (
                <span className="ml-auto bg-[#7c3aed] text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                  {notifications.filter(n => !n.is_read).length} new
                </span>
              )}
            </div>
            <div className="divide-y divide-[#f1ecff] max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-black/20">All clear</p>
              ) : notifications.map((n, i) => (
                <div key={i} className={`px-5 py-3.5 hover:bg-[#faf7ff] transition-colors ${!n.is_read ? 'border-l-2 border-[#7c3aed]' : ''}`}>
                  <div className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'Success' ? 'bg-emerald-500' : n.type === 'Alert' ? 'bg-red-500' : 'bg-[#7c3aed]'}`} />
                    <div>
                      <p className="text-[11px] font-black text-black leading-snug">{n.title}</p>
                      <p className="text-[10px] text-black/40 mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white border border-[#ebe4ff] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-4">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'My Profile', icon: User, tab: 'profile', bg: 'bg-[#f5f0ff]', color: 'text-[#7c3aed]' },
                { label: 'Attendance', icon: Activity, tab: 'attendance', bg: 'bg-emerald-50', color: 'text-emerald-600' },
                { label: 'Performance', icon: TrendingUp, tab: 'performance', bg: 'bg-amber-50', color: 'text-amber-600' },
                { label: 'Training', icon: BookOpen, tab: 'attendance', bg: 'bg-blue-50', color: 'text-blue-600' },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(`/deploy?tab=${a.tab}`)}
                  className={`${a.bg} rounded-xl p-3 flex flex-col items-center gap-2 hover:scale-[1.03] transition-all border border-transparent hover:border-black/5`}
                >
                  <a.icon size={18} className={a.color} />
                  <span className={`text-[9px] font-black uppercase tracking-wider ${a.color}`}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PROGRESS ROW ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* KRAs Progress */}
        <div className="bg-white border border-[#ebe4ff] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-1">KRA Progress</p>
              <h3 className="text-sm font-black text-black uppercase italic">Performance Goals</h3>
            </div>
            <button
              onClick={() => navigate('/deploy?tab=performance')}
              className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              Open <ChevronRight size={12} />
            </button>
          </div>
          <div className="flex items-end gap-4 mb-4">
            <span className="text-4xl font-black text-black">{kras.completed}<span className="text-xl text-black/30">/{kras.total}</span></span>
            <span className={`text-2xl font-black ${krasPercent >= 80 ? 'text-emerald-500' : krasPercent >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
              {krasPercent}%
            </span>
          </div>
          <div className="w-full bg-black/5 rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]"
              style={{ width: `${krasPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-black/40 font-semibold mt-2">
            {kras.total === 0 ? 'No KRAs assigned yet' : `${kras.total - kras.completed} remaining`}
          </p>
        </div>

        {/* Training Progress */}
        <div className="bg-white border border-[#ebe4ff] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-1">Training</p>
              <h3 className="text-sm font-black text-black uppercase italic">Learning Progress</h3>
            </div>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${trainingPercent === 100 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[#f5f0ff] text-[#7c3aed]'}`}>
              {trainingPercent === 100 && training.total > 0 ? 'All Done!' : `${trainingPercent}%`}
            </span>
          </div>
          <div className="space-y-2.5">
            {trainingList.length === 0 ? (
              <p className="text-[10px] text-black/30 font-black uppercase text-center py-4">No training assigned</p>
            ) : trainingList.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
                <p className="text-[11px] font-black text-black truncate max-w-[60%]">{t.training_name || 'Unnamed Training'}</p>
                <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase ${trainingStatusBadge(t.training_status)}`}>
                  {t.training_status || 'Assigned'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CLOCK OUT MODAL ─── */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowClockOutModal(false)} />
          <div className="bg-white border border-[#ebe4ff] rounded-[2rem] w-full max-w-md relative z-10 overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 border-b border-[#f1ecff] bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]">
              <div className="flex items-center gap-3">
                <LogOut size={20} className="text-white" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white italic">Clock Out</h3>
                  <p className="text-white/60 text-[10px] font-bold uppercase">Submit your work log</p>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#7c3aed] mb-2 block">Work Log</label>
                <textarea
                  value={workLog}
                  onChange={e => setWorkLog(e.target.value)}
                  placeholder="What did you work on today? (optional)"
                  className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-[#7c3aed] resize-none h-28 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClockOutModal(false)}
                  className="flex-1 py-3 border border-[#ebe4ff] bg-white text-black/50 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#faf7ff] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  className="flex-1 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a78bfa] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  {clockingOut ? 'Clocking...' : 'Confirm Clock Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
