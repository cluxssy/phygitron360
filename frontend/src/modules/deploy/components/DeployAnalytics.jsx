import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Users, Activity, TrendingUp, Briefcase, Clock, BarChart3,
  MapPin, Zap, Award, Target, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const PALETTE = ['#CC97FF', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#8B5CF6'];
const GRAPH_BG = 'rgba(255,255,255,0.03)';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0B1326]/95 backdrop-blur-md px-5 py-3 border border-white/10 rounded-2xl shadow-2xl">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-black flex items-center gap-2" style={{ color: p.color || p.fill }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const StatCard = ({ label, value, color, icon: Icon, sub }) => (
  <div className="glass-panel p-6 border-white/5 flex flex-col items-center justify-center text-center relative overflow-hidden group cursor-default">
    <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 0%, ${color}08 0%, transparent 70%)` }} />
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3 border" style={{ background: `${color}15`, borderColor: `${color}25` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <p className="text-3xl font-display font-black mb-1" style={{ color }}>{value}</p>
    <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
    {sub && <p className="text-[9px] text-white/20 mt-1 uppercase tracking-widest">{sub}</p>}
  </div>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`glass-panel p-8 border-white/5 flex flex-col gap-6 ${className} min-w-0`}>
    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 shrink-0">{title}</h3>
    <div className="flex-1 min-h-[280px] w-full relative">
        <div className="absolute inset-0">
            {children}
        </div>
    </div>
  </div>
);

export default function DeployAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
    } catch (e) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/30 animate-pulse">Synchronizing Data Matrix...</p>
    </div>
  );

  if (!stats) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle size={40} className="text-white/10" />
      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No analytics data available</p>
    </div>
  );

  const { counts = {}, charts = {}, recent_hires = [] } = stats;

  // Normalize chart shapes for recharts (backend sends {name, value})
  const departmentData = charts.department || [];
  const statusData = charts.status || [];
  const hiringTrend = (charts.hiring_trend || []).map(h => ({ name: String(h.Year || h.name), value: h.Hires || h.value || 0 }));
  const skillsData = charts.skills || [];
  const experienceData = (charts.experience || []).map(e => ({ name: e.range || e.name, value: e.count || e.value || 0 }));
  const tenureData = (charts.tenure || []).map(t => ({ name: t.range || t.name, value: t.count || t.value || 0 }));
  const locationData = charts.location || [];

  return (
    <div className="space-y-8 animate-fade-in-up">

      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-2">Intelligence Matrix</p>
          <h2 className="text-4xl font-display font-black text-white italic uppercase tracking-tighter">Workforce Analytics</h2>
        </div>
        <div className="flex items-center gap-4">
          {lastRefresh && (
            <p className="text-[9px] text-white/20 font-black uppercase tracking-widest hidden md:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-6 py-3 glass-panel border-white/5 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all hover:border-primary/30"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: 'Total Staff', value: counts.total ?? 0, color: '#CC97FF', icon: Users },
          { label: 'Active', value: counts.active ?? 0, color: '#10B981', icon: Activity },
          { label: 'Exited', value: counts.exited ?? 0, color: '#F43F5E', icon: TrendingUp },
          { label: 'Teams', value: counts.teams ?? 0, color: '#3B82F6', icon: Users },
          { label: 'Designations', value: counts.designations ?? 0, color: '#F59E0B', icon: Briefcase },
          { label: 'Avg Tenure', value: `${counts.avg_tenure ?? 0}Y`, color: '#8B5CF6', icon: Clock, sub: 'Active employees' },
        ].map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Employment Status Donut */}
        <ChartCard title="Employment Status Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={4}
                strokeWidth={0}
              >
                {statusData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hiring Trend Area Chart */}
        <ChartCard title="Annual Hiring Velocity" className="md:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hiringTrend}>
              <defs>
                <linearGradient id="hireGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CC97FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#CC97FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#CC97FF"
                strokeWidth={3}
                fill="url(#hireGrad)"
                dot={{ fill: '#CC97FF', r: 5, strokeWidth: 0 }}
                activeDot={{ r: 7, strokeWidth: 0 }}
                name="New Hires"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Department Distribution Horizontal Bars */}
        <ChartCard title="Department Matrix" className="md:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentData} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Headcount">
                {departmentData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 2) % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Location Distribution */}
        <ChartCard title="Geographic Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={locationData.length ? locationData : [{ name: 'Unassigned', value: counts.total || 1 }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                outerRadius={90}
                paddingAngle={4}
                strokeWidth={0}
              >
                {(locationData.length ? locationData : [{}]).map((_, i) => (
                  <Cell key={i} fill={PALETTE[(i + 3) % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Top Skills */}
        <ChartCard title="Top Skill Vectors">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={skillsData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" fontSize={9} fontWeight={900} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={50} />
              <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count">
                {skillsData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Experience Distribution */}
        <ChartCard title="Experience Distribution">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={experienceData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} name="Employees" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tenure Distribution */}
        <ChartCard title="Tenure Cohort Analysis">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tenureData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.25)" fontSize={10} fontWeight={900} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
              <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Employees" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Hires Table */}
      <div className="glass-panel border-white/5 overflow-hidden">
        <div className="px-8 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white">Recent Neural Orchestrations</h3>
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mt-1">Latest 5 Personnel Acquisitions</p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
            {recent_hires.length} Records
          </span>
        </div>
        <table className="w-full text-left">
          <thead className="border-b border-white/5">
            <tr>
              {['Personnel', 'Team', 'Designation', 'Location', 'Status', 'Joined'].map(h => (
                <th key={h} className="px-8 py-5 text-[9px] font-black uppercase tracking-widest text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {recent_hires.length === 0 ? (
              <tr><td colSpan={6} className="px-8 py-16 text-center text-[10px] text-white/20 uppercase font-black tracking-widest">Pipeline clear — no recent hires</td></tr>
            ) : recent_hires.map((h, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                      {h.name?.[0]}
                    </div>
                    <p className="text-sm font-bold text-white">{h.name}</p>
                  </div>
                </td>
                <td className="px-8 py-5 text-xs text-white/50 font-bold">{h.team || '—'}</td>
                <td className="px-8 py-5 text-xs text-white/50">{h.designation || '—'}</td>
                <td className="px-8 py-5 text-xs text-white/30 flex items-center gap-1 mt-4">
                  {h.location && <MapPin size={11} />}{h.location || '—'}
                </td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </td>
                <td className="px-8 py-5 text-xs text-white/30 font-mono">{h.doj_str || h.doj || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
