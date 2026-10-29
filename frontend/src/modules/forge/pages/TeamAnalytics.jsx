import React, { useEffect, useState, useCallback } from 'react';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import ForgeReportModal from './ForgeReportModal';
import {
  Users, Award, TrendingUp, BookOpen, CheckCircle, Target,
  AlertTriangle, Clock, Download, Printer, Search, Filter,
  ChevronRight, ArrowUpRight, Bell, Sparkles, X, Check, FileSpreadsheet, FileText, RefreshCw,
  BarChart2, PieChart as PieChartIcon, Activity, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/forge.css';
import ForgeHeader from '../components/ForgeHeader';
import StatCard from '../components/StatCard';
import BannerCard from '../components/BannerCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';

// ─── Design System Palette ───────────────────────────────────────────────────
const PALETTE = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#6366F1'];
const STATUS_COLORS = { completed: '#10B981', in_progress: '#3B82F6', assigned: '#8B5CF6', overdue: '#EF4444' };

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#ebe4ff] rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm font-bold" style={{ color: p.color || p.fill }}>
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}:</span>
          <span className="text-black">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const PercentTooltip = ({ active, payload, data }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0);
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
  const color = entry.payload?.fill || entry.color;
  return (
    <div className="bg-white border border-[#ebe4ff] rounded-2xl px-4 py-3 shadow-xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-2">{entry.name}</p>
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color }}>
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-black">{entry.value} · {pct}%</span>
      </div>
    </div>
  );
};

// ─── Chart Card Wrapper ───────────────────────────────────────────────────────
const ChartCard = ({ title, children, className = '', action }) => (
  <div className={`bg-white border border-[#ebe4ff] p-6 rounded-2xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] flex flex-col gap-4 ${className}`}>
    <div className="flex items-center justify-between">
      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed]">{title}</h3>
      {action}
    </div>
    <div className="w-full" style={{ height: 260, minHeight: 0 }}>
      {children}
    </div>
  </div>
);

// ─── Donut Legend ─────────────────────────────────────────────────────────────
const DonutLegend = ({ data, total }) => (
  <div className="flex flex-col gap-2 justify-center">
    {data.map((d, i) => (
      <div key={i} className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color || PALETTE[i] }} />
        <span className="text-xs font-semibold text-black/70 flex-1">{d.name}</span>
        <span className="text-xs font-black text-black">{d.value}</span>
        {total > 0 && (
          <span className="text-[10px] text-black/40 w-10 text-right">
            {((d.value / total) * 100).toFixed(0)}%
          </span>
        )}
      </div>
    ))}
  </div>
);

export default function TeamAnalytics({ embedded = false }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'courses' | 'leaderboard'
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Executive Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCourseId, setReportCourseId] = useState(null);

  // Course Roster Drilldown Modal State
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [nudgingId, setNudgingId] = useState(null);

  // Search filter for course breakdown
  const [courseSearch, setCourseSearch] = useState('');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await forgeApi.analyticsOverview();
      setData(res.data.data);
      setLastRefresh(new Date());
    } catch (err) {
      toast.error('Failed to load executive learning analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Open Course Roster Drilldown
  const openDrilldown = async (courseId) => {
    setSelectedCourseId(courseId);
    setLoadingDrilldown(true);
    try {
      const res = await forgeApi.courseAnalytics(courseId);
      setDrilldownData(res.data.data);
    } catch (err) {
      toast.error('Failed to load course roster drilldown');
    } finally {
      setLoadingDrilldown(false);
    }
  };

  // Nudge employee on overdue/pending deadline
  const handleNudge = async (enrollmentId, employeeName) => {
    setNudgingId(enrollmentId);
    try {
      const res = await forgeApi.nudge(enrollmentId);
      toast.success(res.data.message || `Reminder email dispatched to ${employeeName}!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reminder nudge');
    } finally {
      setNudgingId(null);
    }
  };

  // Export full learning roster CSV spreadsheet
  const handleExportCsv = async () => {
    if (!data?.courses_breakdown) return;
    toast.loading('Generating CSV report...');
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += 'Course Title,Domain,Difficulty,Employee Code,Employee Name,Email,Department,Designation,Progress (%),Score (%),Status,Due Date,Overdue,Last Active\n';
      for (const course of data.courses_breakdown) {
        try {
          const res = await forgeApi.courseAnalytics(course.id);
          const roster = res.data.data?.roster || [];
          for (const r of roster) {
            const row = [
              `"${course.title.replace(/"/g, '""')}"`,
              `"${(course.domain_name || 'General').replace(/"/g, '""')}"`,
              `"${course.difficulty || 'beginner'}"`,
              `"${r.employee_code || ''}"`,
              `"${(r.name || '').replace(/"/g, '""')}"`,
              `"${r.email || ''}"`,
              `"${(r.department || '').replace(/"/g, '""')}"`,
              `"${(r.designation || '').replace(/"/g, '""')}"`,
              r.progress_percent,
              r.score !== null ? r.score : '',
              r.status,
              r.deadline ? r.deadline.split('T')[0] : '',
              r.is_overdue ? 'YES' : 'NO',
              r.last_accessed_at ? r.last_accessed_at.split('T')[0] : '',
            ].join(',');
            csvContent += row + '\n';
          }
        } catch (e) { /* ignore individual course error */ }
      }
      toast.dismiss();
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Forge_LMS_Executive_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Report downloaded successfully!');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to export CSV report');
    }
  };

  // ─── Derived Data ───────────────────────────────────────────────────────────
  const kpis = data?.kpis || {};
  const coursesBreakdown = data?.courses_breakdown || [];
  const topLearners = data?.top_learners || [];

  const filteredCourses = coursesBreakdown.filter(c =>
    !courseSearch ||
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    (c.domain_name && c.domain_name.toLowerCase().includes(courseSearch.toLowerCase()))
  );

  // Completion rate (%)
  const completionRate = kpis.total_enrollments > 0
    ? Math.round((kpis.completed_enrollments / kpis.total_enrollments) * 100)
    : 0;

  // Enrollment status donut
  const inProgress = (kpis.total_enrollments || 0) - (kpis.completed_enrollments || 0) - (kpis.overdue_enrollments || 0);
  const statusDonutData = [
    { name: 'Completed', value: kpis.completed_enrollments || 0, color: '#10B981' },
    { name: 'In Progress', value: Math.max(0, inProgress), color: '#3B82F6' },
    { name: 'Overdue', value: kpis.overdue_enrollments || 0, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Difficulty distribution donut
  const difficultyMap = { beginner: 0, intermediate: 0, advanced: 0 };
  coursesBreakdown.forEach(c => {
    const d = (c.difficulty || 'beginner').toLowerCase();
    if (difficultyMap[d] !== undefined) difficultyMap[d]++;
  });
  const difficultyData = [
    { name: 'Beginner', value: difficultyMap.beginner, color: '#10B981' },
    { name: 'Intermediate', value: difficultyMap.intermediate, color: '#F59E0B' },
    { name: 'Advanced', value: difficultyMap.advanced, color: '#EF4444' },
  ].filter(d => d.value > 0);

  // Top 6 courses by completion rate (bar chart)
  const topCourseBar = [...coursesBreakdown]
    .sort((a, b) => (b.completion_rate || 0) - (a.completion_rate || 0))
    .slice(0, 6)
    .map(c => ({
      name: c.title.length > 18 ? c.title.slice(0, 16) + '…' : c.title,
      'Completion %': c.completion_rate || 0,
      Enrolled: c.assigned_count || 0,
    }));

  // Overdue courses alert list
  const overdueCourses = coursesBreakdown.filter(c => c.overdue_count > 0)
    .sort((a, b) => b.overdue_count - a.overdue_count);

  // Domain breakdown bar
  const domainMap = {};
  coursesBreakdown.forEach(c => {
    const d = c.domain_name || 'General';
    if (!domainMap[d]) domainMap[d] = { enrolled: 0, completed: 0, color: c.domain_color || '#8B5CF6' };
    domainMap[d].enrolled += c.assigned_count || 0;
    domainMap[d].completed += c.completed_count || 0;
  });
  const domainData = Object.entries(domainMap)
    .map(([name, v]) => ({ name, Enrolled: v.enrolled, Completed: v.completed }))
    .sort((a, b) => b.Enrolled - a.Enrolled)
    .slice(0, 7);

  // Tabs config
  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'courses', label: `Course Breakdown (${coursesBreakdown.length})`, icon: BookOpen },
    { id: 'leaderboard', label: `Top Learners (${topLearners.length})`, icon: Award },
  ];

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={embedded ? 'space-y-8' : 'forge-container forge-grain'} style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}>
        {!embedded && <ForgeHeader />}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-6 animate-fade-in-up' : 'forge-container forge-grain'} style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}>
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>

        {/* ── Banner ─────────────────────────────────────────────────────────── */}
        <BannerCard
          eyebrow="ORGANIZATION ANALYTICS"
          title="Learning Central Analytics"
          rightContent={
            <div className="flex items-center gap-4 flex-wrap">
              {lastRefresh && (
                <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
                  Updated {lastRefresh.toLocaleTimeString()}
                </p>
              )}
              <button
                onClick={loadOverview}
                className="px-6 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:opacity-90 transition-all shadow-md"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={handleExportCsv}
                className="px-5 py-4 rounded-2xl bg-[#f3f4f6] text-black text-[10px] font-black uppercase tracking-[0.2em] border border-[#e5e7eb] hover:bg-[#e5e7eb] transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={14} /> Export CSV
              </button>
              <button
                onClick={() => { setReportCourseId(null); setShowReportModal(true); }}
                className="px-6 py-4 rounded-2xl bg-[#7c3aed] text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#6d28d9] transition-all flex items-center gap-2 shadow-md"
              >
                <FileText size={14} /> Executive Report
              </button>
            </div>
          }
        />

        {/* ── 6 KPI Stat Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Courses"
            value={kpis.total_courses || 0}
            color="#8B5CF6"
            borderColor="border-t-purple-500"
            icon={BookOpen}
            sub="Published"
          />
          <StatCard
            label="Enrollments"
            value={kpis.total_enrollments || 0}
            color="#F59E0B"
            borderColor="border-t-amber-500"
            icon={Users}
            sub="Total Assigned"
          />
          <StatCard
            label="Completions"
            value={kpis.completed_enrollments || 0}
            color="#10B981"
            borderColor="border-t-emerald-500"
            icon={CheckCircle}
            sub="Finished"
          />
          <StatCard
            label="Completion %"
            value={`${completionRate}%`}
            color="#06B6D4"
            borderColor="border-t-cyan-500"
            icon={Target}
            sub="Avg Rate"
          />
          <StatCard
            label="In Progress"
            value={Math.max(0, inProgress)}
            color="#3B82F6"
            borderColor="border-t-blue-500"
            icon={TrendingUp}
            sub="Active Now"
          />
          <StatCard
            label="Overdue"
            value={kpis.overdue_enrollments || 0}
            color="#EF4444"
            borderColor="border-t-red-500"
            icon={AlertTriangle}
            sub="Past Deadline"
          />
        </div>

        {/* ── Overdue Alert Banner ────────────────────────────────────────────── */}
        {overdueCourses.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl px-6 py-4 flex items-start gap-4">
            <AlertTriangle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Action Required — Overdue Enrollments</p>
              <div className="flex flex-wrap gap-2">
                {overdueCourses.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveTab('courses'); openDrilldown(c.id); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                  >
                    <span>{c.title}</span>
                    <span className="bg-red-100 text-red-700 rounded-lg px-1.5 py-0.5 text-[10px] font-black">{c.overdue_count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 28 }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 18px',
                  background: isActive ? 'rgba(124,58,237,0.06)' : 'none',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  borderRadius: '8px 8px 0 0',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW — Charts & Insights
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Row 1: Enrollment Status Donut + Difficulty Donut + Completion Radial */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Enrollment Status Donut */}
              <ChartCard title="Enrollment Status Breakdown">
                {statusDonutData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-black/30 text-sm font-semibold">No enrollment data yet</div>
                ) : (
                  <div className="flex items-center gap-4 h-full">
                    <div style={{ flex: '0 0 140px', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusDonutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {statusDonutData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<PercentTooltip data={statusDonutData} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <DonutLegend data={statusDonutData} total={kpis.total_enrollments || 0} />
                  </div>
                )}
              </ChartCard>

              {/* Difficulty Distribution Donut */}
              <ChartCard title="Course Difficulty Mix">
                {difficultyData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-black/30 text-sm font-semibold">No courses yet</div>
                ) : (
                  <div className="flex items-center gap-4 h-full">
                    <div style={{ flex: '0 0 140px', height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={difficultyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {difficultyData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<PercentTooltip data={difficultyData} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <DonutLegend data={difficultyData} total={coursesBreakdown.length} />
                  </div>
                )}
              </ChartCard>

              {/* Overall Completion Gauge Card */}
              <div className="bg-white border border-[#ebe4ff] p-6 rounded-2xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] flex flex-col gap-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed]">Overall Completion Rate</h3>
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="54" fill="none" stroke="#ebe4ff" strokeWidth="14" />
                      <circle
                        cx="70" cy="70" r="54"
                        fill="none"
                        stroke={completionRate >= 75 ? '#10B981' : completionRate >= 40 ? '#F59E0B' : '#EF4444'}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 54}`}
                        strokeDashoffset={`${2 * Math.PI * 54 * (1 - completionRate / 100)}`}
                        transform="rotate(-90 70 70)"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-black">{completionRate}%</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Complete</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 w-full mt-2">
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                      <div className="text-lg font-black text-emerald-600">{kpis.completed_enrollments || 0}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600/70">Done</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-xl">
                      <div className="text-lg font-black text-red-500">{kpis.overdue_enrollments || 0}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-red-500/70">Overdue</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Top Courses Bar + Domain Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Top Courses by Completion Rate */}
              <ChartCard title="Top Courses by Completion Rate">
                {topCourseBar.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-black/30 text-sm font-semibold">No course data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topCourseBar} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ecff" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Completion %" fill="#8B5CF6" radius={[0, 6, 6, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              {/* Domain Breakdown */}
              <ChartCard title="Enrollments by Domain">
                {domainData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-black/30 text-sm font-semibold">No domain data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={domainData} margin={{ left: 0, right: 8, top: 4, bottom: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ecff" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="Enrolled" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Completed" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Row 3: Top 5 Learner Spotlight + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Top 5 Learners Ranked List */}
              <div className="lg:col-span-2 bg-white border border-[#ebe4ff] p-6 rounded-2xl shadow-[0_10px_40px_rgba(180,140,255,0.08)]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed] mb-4">Top Performers Spotlight</h3>
                <div className="space-y-3">
                  {topLearners.length === 0 ? (
                    <p className="text-sm text-black/30 font-semibold text-center py-8">No learner activity yet</p>
                  ) : (
                    topLearners.slice(0, 5).map((learner, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const pct = learner.enrolled_count > 0 ? Math.round((learner.completed_count / learner.enrolled_count) * 100) : 0;
                      return (
                        <div key={learner.user_id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-[#f9f7ff] transition-all">
                          <span className="text-xl w-7 text-center shrink-0">
                            {idx < 3 && learner.completed_count > 0 ? medals[idx] : <span className="text-sm font-black text-black/30">#{idx + 1}</span>}
                          </span>
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0"
                            style={{ background: idx === 0 ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,#8B5CF6,#6D28D9)' }}
                          >
                            {(learner.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-sm text-black truncate">{learner.name}</div>
                            <div className="text-[10px] text-black/40 font-semibold truncate">{learner.department} · {learner.designation}</div>
                            <div className="mt-1.5 h-1.5 bg-[#f0ecff] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: idx === 0 ? '#F59E0B' : '#8B5CF6' }} />
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-lg font-black text-black">{learner.completed_count}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-black/30">done</div>
                          </div>
                          {learner.avg_score !== null && (
                            <div
                              className="text-xs font-black px-2.5 py-1 rounded-xl shrink-0"
                              style={{
                                background: learner.avg_score >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color: learner.avg_score >= 80 ? '#10B981' : '#F59E0B',
                              }}
                            >
                              {learner.avg_score}%
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {topLearners.length > 5 && (
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="mt-4 w-full text-center text-xs font-black uppercase tracking-widest text-[#7c3aed] hover:underline"
                  >
                    View Full Leaderboard →
                  </button>
                )}
              </div>

              {/* Quick Actions & Insights */}
              <div className="bg-white border border-[#ebe4ff] p-6 rounded-2xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] flex flex-col gap-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#7c3aed]">Quick Actions</h3>
                <div className="space-y-2 flex-1">
                  <button
                    onClick={() => { setReportCourseId(null); setShowReportModal(true); }}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#f6f0ff] hover:bg-[#ede9ff] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#7c3aed] flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#7c3aed]">Executive Report</div>
                      <div className="text-[10px] text-black/40 font-semibold">Generate full PDF summary</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#f0fdf4] hover:bg-[#dcfce7] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#10B981] flex items-center justify-center shrink-0">
                      <FileSpreadsheet size={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#10B981]">Export CSV Roster</div>
                      <div className="text-[10px] text-black/40 font-semibold">All enrollments &amp; scores</div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('courses')}
                    className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#eff6ff] hover:bg-[#dbeafe] transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#3B82F6] flex items-center justify-center shrink-0">
                      <BookOpen size={14} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-[#3B82F6]">Browse Courses</div>
                      <div className="text-[10px] text-black/40 font-semibold">View rosters &amp; drilldown</div>
                    </div>
                  </button>
                  {overdueCourses.length > 0 && (
                    <button
                      onClick={() => setActiveTab('courses')}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-50 hover:bg-red-100 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-xl bg-[#EF4444] flex items-center justify-center shrink-0">
                        <AlertTriangle size={14} className="text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-red-600">{kpis.overdue_enrollments} Overdue</div>
                        <div className="text-[10px] text-black/40 font-semibold">Send nudge reminders</div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Micro-stats */}
                <div className="border-t border-[#ebe4ff] pt-4 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-black text-black">{coursesBreakdown.length}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Courses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-black text-black">{topLearners.length}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-black/40">Learners</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: Course Breakdown & Rosters
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'courses' && (
          <div>
            {/* Search bar */}
            <div style={{ maxWidth: 360, position: 'relative', marginBottom: 20 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Filter courses by name or domain..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                style={{ paddingLeft: 40, height: 42, borderRadius: 12 }}
              />
            </div>

            <div className="card" style={{ borderRadius: 18, overflow: 'hidden' }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Course Title</th>
                      <th>Domain</th>
                      <th>Difficulty</th>
                      <th style={{ textAlign: 'center' }}>Assigned</th>
                      <th style={{ textAlign: 'center' }}>Completed</th>
                      <th style={{ textAlign: 'center' }}>In Progress</th>
                      <th style={{ textAlign: 'center' }}>Overdue</th>
                      <th style={{ textAlign: 'center' }}>Avg Score</th>
                      <th style={{ minWidth: 160 }}>Completion Rate</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                          No courses found matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCourses.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{c.title}</div>
                            {c.estimated_hours && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Est. {c.estimated_hours} hrs
                              </div>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                background: c.domain_color ? `${c.domain_color}18` : 'rgba(124, 58, 237, 0.1)',
                                color: c.domain_color || '#7C3AED',
                                padding: '3px 9px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              {c.domain_name || 'General'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${c.difficulty === 'advanced' ? 'danger' : c.difficulty === 'intermediate' ? 'info' : 'success'}`} style={{ fontSize: '0.72rem' }}>
                              {c.difficulty || 'beginner'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.assigned_count}</td>
                          <td style={{ textAlign: 'center', color: '#10B981', fontWeight: 800 }}>{c.completed_count}</td>
                          <td style={{ textAlign: 'center', color: '#3B82F6', fontWeight: 700 }}>{c.in_progress_count}</td>
                          <td style={{ textAlign: 'center' }}>
                            {c.overdue_count > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-xs font-black">
                                <AlertTriangle size={10} /> {c.overdue_count}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {c.avg_score !== null ? `${c.avg_score}%` : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 4 }}>
                              <span style={{ fontWeight: 800, color: c.completion_rate >= 75 ? '#10B981' : c.completion_rate >= 40 ? '#F59E0B' : '#EF4444' }}>
                                {c.completion_rate}%
                              </span>
                              <span style={{ color: 'var(--text-muted)' }}>{c.completed_count}/{c.assigned_count}</span>
                            </div>
                            <div className="progress-bar" style={{ height: 6 }}>
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${c.completion_rate}%`,
                                  background: c.completion_rate >= 75 ? '#10B981' : c.completion_rate >= 40 ? '#F59E0B' : '#EF4444',
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => openDrilldown(c.id)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}
                            >
                              View Roster →
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: Top Learners Leaderboard
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div className="card" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 60, textAlign: 'center' }}>Rank</th>
                    <th>Employee</th>
                    <th>Department &amp; Designation</th>
                    <th style={{ textAlign: 'center' }}>Assigned</th>
                    <th style={{ textAlign: 'center' }}>Completed</th>
                    <th style={{ minWidth: 130 }}>Progress</th>
                    <th style={{ textAlign: 'center' }}>Avg Score</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {topLearners.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
                        No learner activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    topLearners.map((learner, idx) => {
                      const isGold = idx === 0 && learner.completed_count > 0;
                      const isSilver = idx === 1 && learner.completed_count > 0;
                      const isBronze = idx === 2 && learner.completed_count > 0;
                      const pct = learner.enrolled_count > 0 ? Math.round((learner.completed_count / learner.enrolled_count) * 100) : 0;

                      return (
                        <tr key={learner.user_id} style={{ background: isGold ? 'rgba(245,158,11,0.04)' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            {isGold ? <span style={{ fontSize: '1.4rem' }}>🥇</span>
                              : isSilver ? <span style={{ fontSize: '1.4rem' }}>🥈</span>
                              : isBronze ? <span style={{ fontSize: '1.4rem' }}>🥉</span>
                              : <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>#{idx + 1}</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                style={{
                                  width: 36, height: 36, borderRadius: 10,
                                  background: isGold ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'linear-gradient(135deg,var(--primary),#9333EA)',
                                  color: 'white',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.85rem',
                                }}
                              >
                                {(learner.name || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{learner.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {learner.email} · {learner.employee_code}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{learner.department || 'General'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{learner.designation || 'Employee'}</div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{learner.enrolled_count}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', padding: '4px 12px', borderRadius: 999, fontWeight: 800, fontSize: '0.82rem' }}>
                              {learner.completed_count} done
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: 3 }}>
                              <span style={{ fontWeight: 700 }}>{pct}%</span>
                            </div>
                            <div className="progress-bar" style={{ height: 5 }}>
                              <div className="progress-fill" style={{ width: `${pct}%`, background: isGold ? '#F59E0B' : 'var(--primary)' }} />
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 800, color: learner.avg_score >= 80 ? '#10B981' : 'var(--text-main)' }}>
                            {learner.avg_score !== null ? `${learner.avg_score}%` : '—'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {learner.last_active ? new Date(learner.last_active).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MODAL: Course-by-Course Roster Drilldown ───────────────────────── */}
        <AnimatePresence>
          {selectedCourseId && (
            <div className="modal-backdrop" onClick={() => setSelectedCourseId(null)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{ maxWidth: 860, width: '100%', background: 'var(--bg-card)', borderRadius: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>
                      Course Roster Drilldown
                    </div>
                    <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 900 }}>
                      {drilldownData?.course?.title || 'Loading Course...'}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setReportCourseId(selectedCourseId); setShowReportModal(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, fontWeight: 700, padding: '6px 12px' }}
                    >
                      <FileText size={14} /> Course Report
                    </button>
                    <button className="btn-icon" onClick={() => setSelectedCourseId(null)}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: 24 }}>
                  {loadingDrilldown ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="spinner" />
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          Enrolled Employees: <strong>{drilldownData?.total_enrolled || 0}</strong>
                        </span>
                      </div>

                      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Department</th>
                              <th style={{ minWidth: 120 }}>Progress</th>
                              <th style={{ textAlign: 'center' }}>Score</th>
                              <th>Bookmark</th>
                              <th>Deadline</th>
                              <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(drilldownData?.roster || []).length === 0 ? (
                              <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                                  No employees assigned to this course yet.
                                </td>
                              </tr>
                            ) : (
                              drilldownData.roster.map((r) => (
                                <tr key={r.enrollment_id}>
                                  <td>
                                    <div style={{ fontWeight: 800, fontSize: '0.88rem' }}>{r.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.email} ({r.employee_code})</div>
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>{r.department}</td>
                                  <td>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', marginBottom: 2 }}>
                                      <span style={{ fontWeight: 700 }}>{Math.round(r.progress_percent)}%</span>
                                      <span style={{ color: r.status === 'completed' ? '#10B981' : 'var(--text-muted)' }}>
                                        {r.status}
                                      </span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 4 }}>
                                      <div className="progress-fill" style={{ width: `${r.progress_percent}%`, background: r.status === 'completed' ? '#10B981' : 'var(--primary)' }} />
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                                    {r.score !== null ? `${r.score}%` : '—'}
                                  </td>
                                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {r.scorm_location || 'Not started'}
                                  </td>
                                  <td>
                                    {r.deadline ? (
                                      <div style={{ fontSize: '0.78rem', color: r.is_overdue ? '#EF4444' : 'var(--text-main)', fontWeight: r.is_overdue ? 800 : 500 }}>
                                        {new Date(r.deadline).toLocaleDateString()}
                                        {r.is_overdue && <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800 }}>[OVERDUE]</span>}
                                      </div>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No deadline</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {r.status !== 'completed' ? (
                                      <button
                                        onClick={() => handleNudge(r.enrollment_id, r.name)}
                                        disabled={nudgingId === r.enrollment_id}
                                        className="btn btn-secondary btn-sm"
                                        style={{
                                          padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                                          display: 'inline-flex', alignItems: 'center', gap: 4,
                                          color: r.is_overdue ? '#EF4444' : 'var(--primary)',
                                        }}
                                      >
                                        {nudgingId === r.enrollment_id ? (
                                          <div className="spinner" style={{ width: 12, height: 12 }} />
                                        ) : (
                                          <><Bell size={12} /> Nudge</>
                                        )}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>Finished</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── MODAL: Publication-Grade Executive Report Generator ── */}
        <ForgeReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          overviewData={data}
          currentUser={user}
          initialCourseId={reportCourseId}
        />
      </div>
    </div>
  );
}
