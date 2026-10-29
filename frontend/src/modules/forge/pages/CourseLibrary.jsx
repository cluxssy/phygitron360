import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  Search, BookOpen, Clock, CheckCircle, PlayCircle,
  FileArchive, Award, Layers,
} from 'lucide-react';
import '../styles/forge.css';
import toast from 'react-hot-toast';
import BorderGlow from '../components/BorderGlow';
import ForgeHeader from '../components/ForgeHeader';
import BannerCard from '../components/BannerCard';

const DIFF_CONFIG = {
  beginner:     { badge: 'badge-success', color: '#10B981', label: 'Beginner' },
  intermediate: { badge: 'badge-info',    color: '#3B82F6', label: 'Intermediate' },
  advanced:     { badge: 'badge-primary', color: '#8257e5', label: 'Advanced' },
};

/**
 * CourseLibrary — Learner-facing course discovery & self-enroll page.
 * Admin course management lives in ManageCourses.jsx.
 */
export default function CourseLibrary({ embedded = false }) {
  const nav = useNavigate();

  const [courses, setCourses] = useState([]);
  const [domains, setDomains] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // ── Loaders ────────────────────────────────────────────────────────────────
  const loadDomains = useCallback(async () => {
    try {
      const res = await forgeApi.domains();
      setDomains(res.data.data || []);
    } catch (e) {
      console.error('Failed to load domains', e);
    }
  }, []);

  const loadCourses = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await forgeApi.library({
        q: search || undefined,
        domain_id: selectedDomain || undefined,
        difficulty: selectedDifficulty || undefined,
        page: pg,
        limit: 18,
      });
      const d = res.data.data || {};
      setCourses(d.courses || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setPage(pg);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDomain, selectedDifficulty]);

  useEffect(() => { loadDomains(); }, [loadDomains]);
  useEffect(() => { loadCourses(1); }, [loadCourses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={embedded ? 'space-y-8 animate-fade-in-up' : 'forge-container forge-grain'}
      style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}
    >
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>

        {/* ── Banner ─────────────────────────────────────────────────────── */}
        <BannerCard
          eyebrow="EXPLORE TRAINING & COURSES"
          title="Course Library"
          subtitle="Browse, enroll, and complete interactive training courses and certifications."
          rightContent={
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={() => nav('/forge?tab=transcript&view=personal')}
                className="px-5 py-3.5 rounded-2xl bg-[#f3f4f6] text-black text-[10px] font-black uppercase tracking-[0.2em] border border-[#e5e7eb] hover:bg-[#e5e7eb] transition-all flex items-center gap-2"
              >
                <Award size={14} /> My Transcript
              </button>
              <button
                onClick={() => nav('/forge?tab=journey&view=personal')}
                className="px-6 py-3.5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2.5 hover:opacity-90 transition-all shadow-md"
              >
                <Layers size={14} /> My Journey
              </button>
            </div>
          }
        />

        {/* ── Domain Category Chips ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, marginBottom: 20 }}>
          <button
            onClick={() => setSelectedDomain(null)}
            style={{
              padding: '8px 18px', borderRadius: 9999, whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
              border: selectedDomain === null ? '1px solid var(--forge-accent)' : '1px solid var(--forge-border)',
              background: selectedDomain === null ? 'var(--forge-accent)' : 'var(--forge-card-bg)',
              color: selectedDomain === null ? 'white' : 'var(--forge-text-main)',
            }}
          >
            All Domains ({total})
          </button>
          {domains.map((dom) => {
            const isSelected = selectedDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => setSelectedDomain(isSelected ? null : dom.id)}
                style={{
                  padding: '8px 18px', borderRadius: 9999, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
                  border: isSelected ? `2px solid ${dom.color || '#7C3AED'}` : '1px solid var(--forge-border)',
                  background: isSelected ? `${dom.color || '#7C3AED'}20` : 'var(--forge-card-bg)',
                  color: isSelected ? (dom.color || '#7C3AED') : 'var(--forge-text-main)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dom.color || '#7C3AED' }} />
                {dom.name}
                {dom.course_count !== undefined && (
                  <span style={{ opacity: 0.7, fontSize: '0.72rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 10 }}>
                    {dom.course_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search & Difficulty Filter ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by title, domain or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: 46, borderRadius: 14, height: 48, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)', color: 'var(--forge-text-main)' }}
            />
          </form>
          <select
            className="form-control"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ height: 48, borderRadius: 14, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)', color: 'var(--forge-text-main)', fontWeight: 600, padding: '0 16px' }}
          >
            <option value="">All Difficulty Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* ── Course Cards Grid ───────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320, flexDirection: 'column', gap: 16 }}>
            <div className="spinner spinner-lg" />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading SCORM packages...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', borderRadius: 20, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)' }}>
            <FileArchive size={48} style={{ color: 'var(--forge-accent)', margin: '0 auto 16px', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800 }}>No Courses Found</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto', fontSize: '0.9rem' }}>
              {search || selectedDomain || selectedDifficulty
                ? 'Try adjusting your search criteria or domain filter.'
                : 'Courses assigned by your manager or administrator will appear here.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {courses.map((course) => {
              const diff = DIFF_CONFIG[course.difficulty] || DIFF_CONFIG.beginner;
              const isEnrolled = !!course.enrolled;
              const progressPct = course.enrollment?.progress_percent || 0;
              const isCompleted = course.enrollment?.status === 'completed' || progressPct >= 100;

              return (
                <BorderGlow
                  key={course.id}
                  borderRadius={20}
                  glowRadius={30}
                  glowIntensity={0.5}
                  backgroundColor="var(--forge-bg)"
                  className="forge-course-card"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Thumbnail */}
                    <div
                      className="forge-thumbnail"
                      style={{
                        height: 140, position: 'relative',
                        background: `linear-gradient(135deg, ${course.domain_color || '#7C3AED'}30 0%, #1e1b4b 100%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderBottom: '1px solid var(--forge-border)',
                      }}
                    >
                      <BookOpen size={44} style={{ color: course.domain_color || '#7C3AED', opacity: 0.7 }} />

                      {/* Domain Badge */}
                      <span style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(0,0,0,0.6)', color: course.domain_color || '#A78BFA', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800, border: `1px solid ${course.domain_color || '#7C3AED'}40` }}>
                        {course.domain_name || 'General'}
                      </span>

                      {/* SCORM Tag */}
                      <span style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(124,58,237,0.85)', color: 'white', padding: '4px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800 }}>
                        SCORM {course.scorm_version || '1.2'}
                      </span>

                      {/* Enrollment Status */}
                      {isEnrolled && (
                        <div style={{ position: 'absolute', bottom: 12, left: 14, background: isCompleted ? 'rgba(16,185,129,0.9)' : 'rgba(124,58,237,0.9)', color: 'white', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> {isCompleted ? 'COMPLETED' : `${Math.round(progressPct)}% COMPLETE`}
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span className={`badge ${diff.badge}`} style={{ fontSize: '0.7rem' }}>{diff.label}</span>
                        {course.estimated_hours && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {course.estimated_hours} hrs
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--forge-text-main)', lineHeight: 1.3 }}>
                        {course.title}
                      </h4>

                      <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.description || 'Interactive SCORM training module.'}
                      </p>

                      {/* Progress Bar */}
                      {isEnrolled && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>Progress</span>
                            <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>{Math.round(progressPct)}%</span>
                          </div>
                          <div className="progress-bar" style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}>
                            <div className="progress-fill" style={{ width: `${progressPct}%`, background: isCompleted ? '#10B981' : 'var(--forge-accent)' }} />
                          </div>
                        </div>
                      )}

                      {/* CTA */}
                      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--forge-border)' }}>
                        <button
                          onClick={() => nav(`/forge/course/${course.id}`)}
                          className="btn btn-sm"
                          style={{
                            width: '100%', padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                            background: isCompleted ? '#10B981' : isEnrolled ? 'var(--forge-accent)' : '#111827',
                            color: 'white', border: 'none',
                          }}
                        >
                          <PlayCircle size={14} />
                          {isCompleted ? 'REVIEW COURSE' : isEnrolled ? 'RESUME COURSE' : 'START COURSE'}
                        </button>
                      </div>
                    </div>
                  </div>
                </BorderGlow>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => loadCourses(page - 1)} style={{ padding: '6px 16px', borderRadius: 10, fontSize: '0.82rem' }}>← Prev</button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Page {page} of {pages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => loadCourses(page + 1)} style={{ padding: '6px 16px', borderRadius: 10, fontSize: '0.82rem' }}>Next →</button>
          </div>
        )}

      </div>
    </div>
  );
}
