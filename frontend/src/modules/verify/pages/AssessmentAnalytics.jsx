import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Award, ShieldAlert, Clock, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AssessmentAnalytics({ assessmentId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!assessmentId) return;
    setLoading(true);
    fetch(`/api/verify/builder/assessments/${assessmentId}/stats`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.data);
        else toast.error('Failed to load analytics');
      })
      .catch(() => toast.error('Error loading analytics'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  if (!stats) return <div className="p-10 text-center text-white/50">No data available</div>;

  const { metrics, performance, top_performers } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">Analytics</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Real-time performance metrics</p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/5 text-white/70 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users />} label="Assigned" value={metrics.total_assigned} />
        <StatCard icon={<TrendingUp />} label="Submitted" value={metrics.total_submitted} />
        <StatCard icon={<Award />} label="Passed" value={metrics.total_passed} color="text-emerald-400" />
        <StatCard icon={<ShieldAlert />} label="Flagged" value={metrics.total_malpractice} color="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Averages */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Averages</h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-white/60 mb-1">Pass Rate</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-display font-black text-white">{performance.pass_rate_pct.toFixed(1)}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Average Score</p>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-display font-black text-primary">{performance.average_score.toFixed(1)}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-white/60 mb-1">Average Time</p>
                <div className="flex items-end gap-2 text-white">
                  <Clock size={20} className="text-white/40 mb-1.5" />
                  <span className="text-2xl font-display font-black">{Math.floor(performance.average_time_taken / 60)}m {Math.floor(performance.average_time_taken % 60)}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="md:col-span-2 glass-panel p-6 flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <BarChart3 size={14} /> Top Performers
          </h3>
          
          {top_performers.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-white/30 italic">No submissions yet</div>
          ) : (
            <div className="space-y-3">
              {top_performers.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-amber-400/20 text-amber-400' : i === 1 ? 'bg-slate-300/20 text-slate-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/10 text-white/40'}`}>
                      #{i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{p.user_name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-display font-black ${p.is_malpractice ? 'text-rose-500' : 'text-primary'}`}>
                      {Math.round(p.total_score)}%
                    </p>
                    {p.is_malpractice && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Flagged</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color = "text-white" }) {
  return (
    <div className="glass-panel p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className={`text-primary/60`}>{icon}</div>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{label}</p>
      </div>
      <p className={`text-4xl font-display font-black mt-auto ${color}`}>{value}</p>
    </div>
  );
}
