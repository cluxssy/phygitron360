import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  BookOpen, Award, PlayCircle, Clock, ChevronRight,
  CheckCircle, Layers, ArrowUpRight, Sparkles, Check
} from 'lucide-react';
import StatCard from './StatCard';
import BannerCard from './BannerCard';

export default function LearnerOverviewPanel({ onSwitchTab }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('in_progress'); // 'in_progress', 'assigned', 'completed'

  useEffect(() => {
    forgeApi.myLearning()
      .then(res => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const continueCourse = data?.continue_learning;
  const inProgress = data?.in_progress || [];
  const assigned = data?.assigned || [];
  const completed = data?.completed || [];
  const stats = data?.stats || {};

  const displayedCourses = 
    activeTab === 'in_progress' ? inProgress :
    activeTab === 'assigned' ? assigned : completed;

  const displayName = (user?.name || user?.full_name || user?.username || 'Learner').split(' ')[0];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ── BANNER CARD (Matching Employee Central) ── */}
      <BannerCard
        eyebrow="EMPLOYEE LEARNING PORTAL"
        title={`Welcome back, ${displayName} 👋`}
        subtitle="Resume your assigned training modules right where you left off"
        rightContent={
          <button
            onClick={() => onSwitchTab ? onSwitchTab('library') : navigate('/forge?tab=library&view=personal')}
            className="px-6 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:opacity-90 transition-all shadow-md"
          >
            <Layers size={14} />
            Explore Course Library
          </button>
        }
      />

      {/* ── 4 KPI STAT CARDS (Matching Employee Central) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Assigned Courses"
          value={stats.total_assigned || 0}
          color="#8B5CF6"
          borderColor="border-t-purple-500"
          icon={BookOpen}
          sub="Total Assigned Modules"
          onClick={() => setActiveTab('assigned')}
        />
        <StatCard
          label="In Progress"
          value={stats.in_progress_count || 0}
          color="#F59E0B"
          borderColor="border-t-amber-500"
          icon={Clock}
          sub="Currently Active Modules"
          onClick={() => setActiveTab('in_progress')}
        />
        <StatCard
          label="Courses Completed"
          value={stats.completed_count || 0}
          color="#10B981"
          borderColor="border-t-emerald-500"
          icon={CheckCircle}
          sub="Finished Certifications"
          onClick={() => setActiveTab('completed')}
        />
        <StatCard
          label="Certificates Earned"
          value={stats.certificates_count || 0}
          color="#EC4899"
          borderColor="border-t-pink-500"
          icon={Award}
          sub="Verified Credentials"
          onClick={() => onSwitchTab ? onSwitchTab('transcript') : navigate('/forge?tab=transcript&view=personal')}
        />
      </div>

      {/* ── HERO CONTINUE LEARNING CARD ── */}
      {continueCourse && (
        <div className="bg-white border border-[#ebe4ff] p-6 sm:p-8 rounded-3xl shadow-[0_10px_40px_rgba(180,140,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border-l-8 border-l-[#8b5cf6]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#8b5cf6] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#8b5cf6]">
                RESUME LEARNING
              </p>
            </div>
            <h2 className="text-2xl font-black text-black tracking-tight truncate">
              {continueCourse.title}
            </h2>
            <p className="text-xs text-black/60 mt-1 line-clamp-1">
              {continueCourse.description || 'Interactive SCORM / Enterprise training module'}
            </p>

            <div className="flex items-center gap-4 mt-4 max-w-md">
              <div className="flex-1 h-2 rounded-full bg-[#f3f0ff] overflow-hidden">
                <div
                  className="h-full bg-[#8b5cf6] rounded-full transition-all duration-500"
                  style={{ width: `${continueCourse.progress_percent || 0}%` }}
                />
              </div>
              <span className="text-xs font-black text-black">
                {continueCourse.progress_percent || 0}%
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/forge/course/${continueCourse.id}`)}
            className="px-8 py-4 rounded-2xl bg-black text-white text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-3 hover:opacity-90 transition-all shrink-0 shadow-lg hover:scale-105"
          >
            <PlayCircle size={16} />
            Continue Course
          </button>
        </div>
      )}

      {/* ── COURSE TABS CONTAINER ── */}
      <div className="bg-white border border-[#ebe4ff] p-6 sm:p-8 rounded-3xl shadow-[0_10px_40px_rgba(180,140,255,0.08)]">
        {/* Tab Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f3efff] pb-6 mb-6">
          <div className="flex bg-[#f3f0ff] p-1.5 rounded-2xl border border-[#ebe4ff] w-fit">
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'in_progress'
                  ? '!bg-black !text-white shadow-md'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              In Progress ({inProgress.length})
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'assigned'
                  ? '!bg-black !text-white shadow-md'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              Assigned ({assigned.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'completed'
                  ? '!bg-black !text-white shadow-md'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              Completed ({completed.length})
            </button>
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-black/40">
            Showing {displayedCourses.length} {activeTab.replace('_', ' ')} courses
          </p>
        </div>

        {/* Courses Grid */}
        {displayedCourses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-[#f3f0ff] border border-[#ebe4ff] flex items-center justify-center mx-auto mb-4 text-[#8b5cf6]">
              <BookOpen size={28} />
            </div>
            <h3 className="text-lg font-black text-black">No courses in this section</h3>
            <p className="text-xs text-black/50 mt-1 max-w-sm mx-auto">
              {activeTab === 'in_progress'
                ? 'You have no courses currently in progress. Browse the catalog to start learning!'
                : activeTab === 'assigned'
                ? 'You have completed all your assigned training modules. Great work!'
                : 'No completed courses yet. Finish a course to earn your official credentials!'}
            </p>
            <button
              onClick={() => onSwitchTab ? onSwitchTab('library') : navigate('/forge?tab=library&view=personal')}
              className="mt-6 px-6 py-3 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all inline-flex items-center gap-2"
            >
              <Layers size={14} /> Browse Course Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedCourses.map((c) => {
              const pct = c.progress_percent || 0;
              const isComp = c.status === 'completed' || pct >= 100;

              return (
                <div
                  key={c.id || c.course_id}
                  className="bg-white border border-[#ebe4ff] rounded-2xl p-6 shadow-[0_10px_30px_rgba(180,140,255,0.06)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Top pill row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 rounded-full bg-[#f3f0ff] text-[#7c3aed] text-[9px] font-black uppercase tracking-widest border border-[#e9d5ff]">
                        {c.domain_name || c.category || 'General'}
                      </span>
                      {isComp ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1">
                          <Check size={10} /> Passed
                        </span>
                      ) : c.deadline ? (
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          Due {new Date(c.deadline).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-base font-black text-black group-hover:text-[#7c3aed] transition-colors line-clamp-1 mb-2">
                      {c.title}
                    </h3>
                    <p className="text-xs text-black/60 line-clamp-2 mb-4 leading-relaxed">
                      {c.description || 'Comprehensive learning module with interactive exercises and verification.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-black/50 mb-1.5">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#f3f0ff] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComp ? 'bg-emerald-500' : 'bg-[#8b5cf6]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="pt-4 border-t border-[#f3efff] flex items-center justify-between">
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">
                      {c.estimated_hours ? `${c.estimated_hours}h duration` : (c.difficulty || 'All levels')}
                    </span>

                    <button
                      onClick={() => navigate(`/forge/course/${c.id || c.course_id}`)}
                      className="px-4 py-2 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#7c3aed] transition-all flex items-center gap-1.5"
                    >
                      {isComp ? 'Review' : pct > 0 ? 'Resume' : 'Start'}
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
