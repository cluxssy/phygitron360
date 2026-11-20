import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  Search, BookOpen, Clock, CheckCircle, PlayCircle,
  FileArchive, Award, Layers, Send, AlertCircle, X,
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
 * CourseLibrary — Learner-facing course discovery & request page.
 * Courses for personal learners require approval from reporting managers / org admins.
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
  const [enrolledFilter, setEnrolledFilter] = useState('all'); // 'all' | 'assigned' | 'requested'

  // Request Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedCourseForRequest, setSelectedCourseForRequest] = useState(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

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
        enrolled_only: enrolledFilter === 'assigned' ? true : undefined,
        req_status: enrolledFilter === 'requested' ? 'requested' : undefined,
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
  }, [search, selectedDomain, selectedDifficulty, enrolledFilter]);

  useEffect(() => { loadDomains(); }, [loadDomains]);
  useEffect(() => { loadCourses(1); }, [loadCourses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const openRequestModal = (course) => {
    setSelectedCourseForRequest(course);
    setRequestReason('');
    setRequestModalOpen(true);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseForRequest) return;
    setSubmittingRequest(true);
    try {
      const res = await forgeApi.requestCourse(selectedCourseForRequest.id, {
        reason: requestReason.trim() || undefined,
      });
      toast.success(res.data?.message || 'Course request submitted for manager approval!');
      setRequestModalOpen(false);
      setSelectedCourseForRequest(null);
      setRequestReason('');
      loadCourses(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit course request');
    } finally {
      setSubmittingRequest(false);
    }
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

        {/* ── View Toggle: All Courses vs Assigned vs My Requests ───────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="flex bg-[#f3f0ff] p-1 rounded-2xl border border-[#ebe4ff]" style={{ width: 'fit-content' }}>
            <button
              onClick={() => setEnrolledFilter('all')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                enrolledFilter === 'all'
                  ? '!bg-black !text-white shadow-sm'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              All Catalog Courses
            </button>
            <button
              onClick={() => setEnrolledFilter('assigned')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                enrolledFilter === 'assigned'
                  ? '!bg-black !text-white shadow-sm'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              <CheckCircle size={13} /> Assigned to Me
            </button>
            <button
              onClick={() => setEnrolledFilter('requested')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                enrolledFilter === 'requested'
                  ? '!bg-black !text-white shadow-sm'
                  : 'text-black/60 hover:bg-white'
              }`}
            >
              <Clock size={13} /> My Requests
            </button>
          </div>
        </div>

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
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading training modules...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', borderRadius: 20, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)' }}>
            <FileArchive size={48} style={{ color: 'var(--forge-accent)', margin: '0 auto 16px', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800 }}>
              {enrolledFilter === 'assigned'
                ? 'No Assigned Courses Found'
                : enrolledFilter === 'requested'
                ? 'No Course Requests Found'
                : 'No Courses Found'}
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto', fontSize: '0.9rem' }}>
              {enrolledFilter === 'assigned'
                ? 'You have not been assigned any courses yet. Switch to "All Catalog Courses" to explore available training modules.'
                : enrolledFilter === 'requested'
                ? 'You have not submitted any course requests yet. Browse the catalog to request access to courses.'
                : (search || selectedDomain || selectedDifficulty)
                ? 'Try adjusting your search criteria or domain filter.'
                : 'Courses will appear here once published.'}
            </p>
            {enrolledFilter !== 'all' && (
              <button
                onClick={() => setEnrolledFilter('all')}
                className="btn btn-primary btn-sm"
                style={{ marginTop: 16, padding: '8px 20px', borderRadius: 12, fontWeight: 700 }}
              >
                Browse All Catalog Courses
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {courses.map((course) => {
              const diff = DIFF_CONFIG[course.difficulty] || DIFF_CONFIG.beginner;
              const progressPct = Math.round(Number(course.progress_percent ?? course.enrollment?.progress_percent ?? 0));
              const enrollmentStatus = course.enrollment_status || course.enrollment?.status || (course.enrolled ? 'in_progress' : 'not_enrolled');
              const isEnrolled = !!course.enrolled || progressPct > 0 || (enrollmentStatus !== 'not_enrolled' && enrollmentStatus !== 'requested');
              const isCompleted = enrollmentStatus === 'completed' || progressPct >= 100;
              const isPending = !isEnrolled && course.request_status === 'pending';
              const isRejected = !isEnrolled && course.request_status === 'rejected';

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

                      {/* Status Badges on thumbnail */}
                      {isEnrolled ? (
                        <div style={{ position: 'absolute', bottom: 12, left: 14, background: isCompleted ? 'rgba(16,185,129,0.9)' : 'rgba(124,58,237,0.9)', color: 'white', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> {isCompleted ? 'COMPLETED' : `${progressPct}% COMPLETE`}
                        </div>
                      ) : isPending ? (
                        <div style={{ position: 'absolute', bottom: 12, left: 14, background: 'rgba(217, 119, 6, 0.95)', color: 'white', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} /> AWAITING APPROVAL
                        </div>
                      ) : isRejected ? (
                        <div style={{ position: 'absolute', bottom: 12, left: 14, background: 'rgba(220, 38, 38, 0.95)', color: 'white', borderRadius: 6, padding: '3px 8px', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <AlertCircle size={11} /> REQUEST DECLINED
                        </div>
                      ) : null}
                    </div>

                    {/* Body */}
                    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className={`badge ${diff.badge}`} style={{ fontSize: '0.7rem' }}>{diff.label}</span>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                            background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE'
                          }}>
                            SCORM {course.scorm_version || '1.2'}
                          </span>
                        </div>
                        {course.estimated_hours && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {course.estimated_hours} {Number(course.estimated_hours) === 1 ? 'hr' : 'hrs'}
                          </span>
                        )}
                      </div>

                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--forge-text-main)', lineHeight: 1.3 }}>
                        {course.title}
                      </h4>

                      <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {course.description || 'Interactive SCORM training module.'}
                      </p>

                      {/* Review note if declined */}
                      {isRejected && course.review_notes && (
                        <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FEE2E2', fontSize: '0.75rem', color: '#B91C1C' }}>
                          <span style={{ fontWeight: 800 }}>Feedback: </span>{course.review_notes}
                        </div>
                      )}

                      {/* Progress Bar */}
                      {isEnrolled && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>Progress</span>
                            <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>{progressPct}%</span>
                          </div>
                          <div className="progress-bar" style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}>
                            <div className="progress-fill" style={{ width: `${progressPct}%`, background: isCompleted ? '#10B981' : 'var(--forge-accent)' }} />
                          </div>
                        </div>
                      )}

                      {/* CTA Action */}
                      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--forge-border)' }}>
                        {isEnrolled ? (
                          <button
                            onClick={() => nav(`/forge/course/${course.id}`)}
                            className="btn btn-sm"
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                              background: isCompleted ? '#10B981' : 'var(--forge-accent)',
                              color: 'white', border: 'none',
                            }}
                          >
                            <PlayCircle size={14} />
                            {isCompleted ? 'REVIEW COURSE' : progressPct > 0 ? 'RESUME COURSE' : 'START COURSE'}
                          </button>
                        ) : isPending ? (
                          <button
                            disabled
                            className="btn btn-sm"
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
                              cursor: 'not-allowed', opacity: 0.95,
                            }}
                            title="Access request is awaiting approval from your manager or organization administrator."
                          >
                            <Clock size={14} />
                            AWAITING APPROVAL
                          </button>
                        ) : isRejected ? (
                          <button
                            onClick={() => openRequestModal(course)}
                            className="btn btn-sm"
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                              background: '#111827', color: 'white', border: 'none',
                            }}
                          >
                            <Send size={14} />
                            REQUEST AGAIN
                          </button>
                        ) : (
                          <button
                            onClick={() => openRequestModal(course)}
                            className="btn btn-sm"
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 12, fontWeight: 800, fontSize: '0.82rem',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                              background: '#111827', color: 'white', border: 'none',
                            }}
                          >
                            <Send size={14} />
                            REQUEST COURSE
                          </button>
                        )}
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

      {/* ── Portalled Request Course Modal ───────────────────────────────── */}
      {requestModalOpen && selectedCourseForRequest && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '20px',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !submittingRequest) {
              setRequestModalOpen(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '540px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7C3AED' }}>
                  Course Access Request
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>
                  {selectedCourseForRequest.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !submittingRequest && setRequestModalOpen(false)}
                style={{
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRequestSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Notice Banner */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <BookOpen size={20} style={{ color: '#7C3AED', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.84rem', color: '#475569', lineHeight: 1.5 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1E293B' }}>
                    Manager Approval Required
                  </p>
                  To start this course for personal learning, submit a request. Your team manager or organization administrator will review it. Upon approval, you will be enrolled automatically.
                </div>
              </div>

              {/* Course snapshot info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>Domain</span>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginTop: '2px' }}>
                    {selectedCourseForRequest.domain_name || 'General'}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <span style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: 700 }}>Difficulty</span>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', marginTop: '2px', textTransform: 'capitalize' }}>
                    {selectedCourseForRequest.difficulty || 'Beginner'}
                  </div>
                </div>
              </div>

              {/* Reason Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
                  Reason / Learning Goals <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explain why you wish to take this course or how it aligns with your professional development..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.85rem',
                    color: '#111827',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#9CA3AF' }}>
                  Your manager will see this note when evaluating your request.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
                <button
                  type="button"
                  disabled={submittingRequest}
                  onClick={() => setRequestModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    color: '#4B5563',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    background: '#111827',
                    border: 'none',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    cursor: submittingRequest ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: submittingRequest ? 0.7 : 1,
                  }}
                >
                  {submittingRequest ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send size={14} /> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
