import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import { P } from '../../../core/permissions';
import {
  Search, BookOpen, Clock, Upload, Plus, FolderPlus, Users, Calendar,
  AlertCircle, Check, Shield, FileArchive, Trash2, X, PlayCircle,
  CheckCircle, Settings, Filter,
} from 'lucide-react';
import '../styles/forge.css';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ForgeHeader from '../components/ForgeHeader';
import BannerCard from '../components/BannerCard';

const DIFF_CONFIG = {
  beginner:     { badge: 'badge-success', color: '#10B981', label: 'Beginner' },
  intermediate: { badge: 'badge-info',    color: '#3B82F6', label: 'Intermediate' },
  advanced:     { badge: 'badge-primary', color: '#8257e5', label: 'Advanced' },
};

export default function ManageCourses({ embedded = false }) {
  const { user, hasPermission, hasRole } = useAuth();
  const nav = useNavigate();

  const hasAdminClearance =
    hasPermission(P.FORGE_COURSES_MANAGE) ||
    hasRole(['org_admin', 'manager', 'instructor', 'super_admin']);

  // ── Data State ─────────────────────────────────────────────────────────────
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

  // ── Modal State ────────────────────────────────────────────────────────────
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedCourseForAssign, setSelectedCourseForAssign] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // ── Upload Form State ──────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadDomainId, setUploadDomainId] = useState('');
  const [uploadDifficulty, setUploadDifficulty] = useState('beginner');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ── Domain Form State ──────────────────────────────────────────────────────
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainDesc, setNewDomainDesc] = useState('');
  const [newDomainColor, setNewDomainColor] = useState('#7C3AED');
  const [creatingDomain, setCreatingDomain] = useState(false);

  // ── Assign Modal State ─────────────────────────────────────────────────────
  const [assignableEmployees, setAssignableEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignDeptFilter, setAssignDeptFilter] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigning, setAssigning] = useState(false);

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
        limit: 20,
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

  // ── Assign ─────────────────────────────────────────────────────────────────
  const openAssignModal = async (course) => {
    setSelectedCourseForAssign(course);
    setAssignModalOpen(true);
    setSelectedEmpIds([]);
    setAssignDeadline('');
    setAssignSearch('');
    setAssignDeptFilter('');
    setLoadingEmployees(true);
    try {
      const res = await forgeApi.assignableEmployees({ course_id: course.id });
      setAssignableEmployees(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load active employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) { toast.error('Select at least one employee.'); return; }
    setAssigning(true);
    try {
      const res = await forgeApi.assignCourse(selectedCourseForAssign.id, {
        employee_ids: selectedEmpIds,
        deadline: assignDeadline ? new Date(assignDeadline).toISOString() : null,
      });
      toast.success(res.data.message || 'Course assigned!');
      setAssignModalOpen(false);
      loadCourses(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  // ── Upload ─────────────────────────────────────────────────────────────────
  const handleScormUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) { toast.error('Select a SCORM .zip file.'); return; }
    if (!uploadFile.name.toLowerCase().endsWith('.zip')) { toast.error('Only .zip SCORM archives allowed.'); return; }
    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('file', uploadFile);
    const params = {
      title: uploadTitle || undefined,
      description: uploadDesc || undefined,
      domain_id: uploadDomainId ? parseInt(uploadDomainId, 10) : undefined,
      difficulty: uploadDifficulty,
    };
    try {
      const res = await forgeApi.uploadScorm(fd, params, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      toast.success(res.data.message || 'SCORM course uploaded!');
      setUploadModalOpen(false);
      setUploadFile(null); setUploadTitle(''); setUploadDesc(''); setUploadDomainId('');
      setUploadDifficulty('beginner'); setUploadProgress(0);
      loadDomains(); loadCourses(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload SCORM package.');
    } finally {
      setUploading(false); setUploadProgress(0);
    }
  };

  // ── Domain CRUD ────────────────────────────────────────────────────────────
  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) { toast.error('Domain name required.'); return; }
    setCreatingDomain(true);
    try {
      await forgeApi.createDomain({ name: newDomainName.trim(), description: newDomainDesc || undefined, color: newDomainColor });
      toast.success('Domain created!');
      setNewDomainName(''); setNewDomainDesc('');
      loadDomains();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create domain.');
    } finally {
      setCreatingDomain(false);
    }
  };

  const handleDeleteDomain = async (domainId) => {
    if (!window.confirm('Delete this domain? Courses in it will become unassigned.')) return;
    try {
      await forgeApi.deleteDomain(domainId);
      toast.success('Domain deleted');
      if (selectedDomain === domainId) setSelectedDomain(null);
      loadDomains(); loadCourses(1);
    } catch {
      toast.error('Failed to delete domain');
    }
  };

  // ── Delete Course ──────────────────────────────────────────────────────────
  const openDeleteModal = (course) => { setCourseToDelete(course); setDeleteModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    setDeletingCourse(true);
    try {
      const res = await forgeApi.deleteCourse(courseToDelete.id);
      toast.success(res.data?.message || `"${courseToDelete.title}" deleted.`);
      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      setTotal(prev => Math.max(0, prev - 1));
      setDeleteModalOpen(false); setCourseToDelete(null);
      loadDomains();
      if (courses.length <= 1 && page > 1) loadCourses(page - 1);
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeletingCourse(false);
    }
  };

  // ── Assign helpers ─────────────────────────────────────────────────────────
  const filteredEmployees = assignableEmployees.filter((emp) => {
    const matchesSearch =
      !assignSearch ||
      emp.name.toLowerCase().includes(assignSearch.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(assignSearch.toLowerCase()) ||
      emp.email.toLowerCase().includes(assignSearch.toLowerCase());
    const matchesDept = !assignDeptFilter || emp.department === assignDeptFilter;
    return matchesSearch && matchesDept;
  });

  const allEligibleIds = filteredEmployees.filter(e => !e.is_enrolled).map(e => e.employee_id);
  const isAllSelected = allEligibleIds.length > 0 && allEligibleIds.every(id => selectedEmpIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !allEligibleIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...allEligibleIds])));
    }
  };

  const departmentsList = Array.from(new Set(assignableEmployees.map(e => e.department).filter(Boolean)));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={embedded ? 'space-y-8 animate-fade-in-up' : 'forge-container forge-grain'} style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}>
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>

        {/* ── Banner ─────────────────────────────────────────────────────── */}
        <BannerCard
          eyebrow="COURSE CATALOG & MANAGEMENT"
          title="Manage Courses"
          subtitle="Upload, assign, and manage SCORM training packages across your organization."
          rightContent={
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={() => setDomainModalOpen(true)}
                className="px-5 py-3.5 rounded-2xl bg-[#f3f4f6] text-black text-[10px] font-black uppercase tracking-[0.2em] border border-[#e5e7eb] hover:bg-[#e5e7eb] transition-all flex items-center gap-2"
              >
                <FolderPlus size={14} /> Manage Domains
              </button>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="px-6 py-3.5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2.5 hover:opacity-90 transition-all shadow-md"
              >
                <Upload size={14} /> Upload SCORM Package
              </button>
            </div>
          }
        />

        {/* ── Domain filter chips ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
          <button
            onClick={() => setSelectedDomain(null)}
            style={{
              padding: '7px 16px', borderRadius: 9999, whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
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
                  padding: '7px 16px', borderRadius: 9999, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
                  border: isSelected ? `2px solid ${dom.color || '#7C3AED'}` : '1px solid var(--forge-border)',
                  background: isSelected ? `${dom.color || '#7C3AED'}20` : 'var(--forge-card-bg)',
                  color: isSelected ? (dom.color || '#7C3AED') : 'var(--forge-text-main)',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dom.color || '#7C3AED' }} />
                {dom.name}
                {dom.course_count !== undefined && (
                  <span style={{ opacity: 0.7, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.1)' }}>
                    {dom.course_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search & Filters ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search courses by title, domain or keyword..."
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
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* ── Courses Table ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280, flexDirection: 'column', gap: 16 }}>
            <div className="spinner spinner-lg" />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', borderRadius: 20, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)' }}>
            <FileArchive size={48} style={{ color: 'var(--forge-accent)', margin: '0 auto 16px', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800 }}>No Courses Found</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 24px', fontSize: '0.9rem' }}>
              {search || selectedDomain || selectedDifficulty
                ? 'Try adjusting your search or domain filter.'
                : 'Upload your first SCORM training package to get started.'}
            </p>
            <button onClick={() => setUploadModalOpen(true)} className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: 12 }}>
              <Upload size={16} /> Upload SCORM Course
            </button>
          </div>
        ) : (
          <div className="card" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Course Title</th>
                    <th>Domain</th>
                    <th>Difficulty</th>
                    <th style={{ textAlign: 'center' }}>SCORM</th>
                    <th style={{ textAlign: 'center' }}>Est. Hours</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const diff = DIFF_CONFIG[course.difficulty] || DIFF_CONFIG.beginner;
                    return (
                      <tr key={course.id}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>{course.title}</div>
                          {course.description && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {course.description}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            background: course.domain_color ? `${course.domain_color}18` : 'rgba(124,58,237,0.1)',
                            color: course.domain_color || '#7C3AED',
                            padding: '3px 9px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            {course.domain_name || 'General'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${diff.badge}`} style={{ fontSize: '0.72rem' }}>
                            {diff.label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7C3AED' }}>
                            {course.scorm_version || '1.2'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {course.estimated_hours ? `${course.estimated_hours} hr` : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              onClick={() => nav(`/forge/course/${course.id}`)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
                              title="Preview course"
                            >
                              <PlayCircle size={13} /> Preview
                            </button>
                            <button
                              onClick={() => openAssignModal(course)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}
                              title="Assign to employees"
                            >
                              <Users size={13} /> Assign
                            </button>
                            <button
                              onClick={() => openDeleteModal(course)}
                              className="btn btn-sm"
                              style={{
                                padding: '6px 10px', borderRadius: 8,
                                color: '#EF4444', background: 'rgba(239,68,68,0.08)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              }}
                              title={`Delete "${course.title}"`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => loadCourses(page - 1)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem' }}
                >
                  ← Prev
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Page {page} of {pages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= pages}
                  onClick={() => loadCourses(page + 1)}
                  style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem' }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 1 — Upload SCORM Package
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {uploadModalOpen && (
            <div className="modal-backdrop" onClick={() => !uploading && setUploadModalOpen(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{ maxWidth: 580, width: '100%', background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Upload size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Upload SCORM Package</h3>
                  </div>
                  <button className="btn-icon" onClick={() => !uploading && setUploadModalOpen(false)}><X size={18} /></button>
                </div>

                <form onSubmit={handleScormUpload} style={{ padding: 24 }}>
                  <div
                    style={{ border: '2px dashed var(--forge-border)', borderRadius: 14, padding: '24px 16px', textAlign: 'center', marginBottom: 20, background: uploadFile ? 'rgba(124,58,237,0.05)' : 'var(--bg-card)', cursor: 'pointer' }}
                    onClick={() => document.getElementById('scorm-file-input-manage').click()}
                  >
                    <input id="scorm-file-input-manage" type="file" accept=".zip" style={{ display: 'none' }} onChange={(e) => setUploadFile(e.target.files[0] || null)} />
                    <FileArchive size={36} style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                      {uploadFile ? uploadFile.name : 'Click to select SCORM .ZIP archive'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports SCORM 1.2 &amp; SCORM 2004 (imsmanifest.xml)</div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Course Title (Optional — auto-read from manifest)</label>
                    <input type="text" className="form-control" placeholder="e.g., Information Security Awareness 2026" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Domain / Category</label>
                      <select className="form-control" value={uploadDomainId} onChange={(e) => setUploadDomainId(e.target.value)}>
                        <option value="">General / None</option>
                        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Difficulty Level</label>
                      <select className="form-control" value={uploadDifficulty} onChange={(e) => setUploadDifficulty(e.target.value)}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows={2} placeholder="Brief summary of learning outcomes..." value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} />
                  </div>

                  {uploading && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span>{uploadProgress < 100 ? `Uploading (${uploadProgress}%)...` : 'Extracting & validating manifest...'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--forge-accent)' }}>{uploadProgress}%</span>
                      </div>
                      <div className="progress-bar" style={{ height: 6, borderRadius: 4 }}>
                        <div className="progress-fill" style={{ width: `${uploadProgress}%`, background: 'var(--forge-accent)', transition: 'width 0.2s ease', borderRadius: 4 }} />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => setUploadModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={uploading || !uploadFile} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {uploading ? <><div className="spinner" style={{ width: 16, height: 16 }} />{uploadProgress < 100 ? `Uploading (${uploadProgress}%)...` : 'Deploying...'}</> : <><Upload size={16} /> Deploy SCORM Course</>}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 2 — Manage Domains
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {domainModalOpen && (
            <div className="modal-backdrop" onClick={() => setDomainModalOpen(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{ maxWidth: 640, width: '100%', background: 'var(--bg-card)', borderRadius: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FolderPlus size={20} style={{ color: 'var(--primary)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Manage Learning Domains</h3>
                  </div>
                  <button className="btn-icon" onClick={() => setDomainModalOpen(false)}><X size={18} /></button>
                </div>

                <div style={{ padding: 24 }}>
                  <form onSubmit={handleCreateDomain} style={{ marginBottom: 24, padding: 16, borderRadius: 14, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: 12, color: 'var(--primary)' }}>Add New Domain</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 10 }}>
                      <input type="text" className="form-control" placeholder="Domain Name (e.g. Cloud Computing)" value={newDomainName} onChange={(e) => setNewDomainName(e.target.value)} required />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={newDomainColor} onChange={(e) => setNewDomainColor(e.target.value)} style={{ width: 42, height: 42, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }} title="Badge color" />
                        <button type="submit" className="btn btn-primary" disabled={creatingDomain} style={{ flex: 1, padding: '10px 14px', fontSize: '0.82rem', fontWeight: 700 }}>
                          {creatingDomain ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                    <input type="text" className="form-control" placeholder="Short description (optional)" value={newDomainDesc} onChange={(e) => setNewDomainDesc(e.target.value)} />
                  </form>

                  <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-muted)' }}>
                    Existing Domains ({domains.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
                    {domains.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: '20px 0' }}>No domains created yet.</p>
                    ) : (
                      domains.map((d) => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 12, background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: d.color || '#7C3AED' }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{d.name}</div>
                              {d.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.description}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{d.course_count || 0} courses</span>
                            <button onClick={() => handleDeleteDomain(d.id)} className="btn-icon" style={{ color: '#EF4444' }} title="Delete Domain"><X size={16} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 3 — Bulk Employee Assignment
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {assignModalOpen && selectedCourseForAssign && (
            <div className="modal-backdrop" onClick={() => !assigning && setAssignModalOpen(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{ maxWidth: 740, width: '100%', background: 'var(--bg-card)', borderRadius: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      <Shield size={14} /> Employee Course Assignment
                    </div>
                    <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>{selectedCourseForAssign.title}</h3>
                  </div>
                  <button className="btn-icon" onClick={() => !assigning && setAssignModalOpen(false)}><X size={18} /></button>
                </div>

                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input type="text" className="form-control" placeholder="Search by name, code or email..." value={assignSearch} onChange={(e) => setAssignSearch(e.target.value)} style={{ paddingLeft: 38, height: 42, borderRadius: 10, fontSize: '0.85rem' }} />
                    </div>
                    <select className="form-control" value={assignDeptFilter} onChange={(e) => setAssignDeptFilter(e.target.value)} style={{ width: 180, height: 42, borderRadius: 10, fontSize: '0.85rem' }}>
                      <option value="">All Departments</option>
                      {departmentsList.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-main)', borderRadius: 12, marginBottom: 16 }}>
                    <Calendar size={18} style={{ color: 'var(--primary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>Target Completion Deadline</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Employees receive automated email alerts before this date</div>
                    </div>
                    <input type="date" className="form-control" value={assignDeadline} onChange={(e) => setAssignDeadline(e.target.value)} style={{ width: 170, height: 38, borderRadius: 8, fontSize: '0.85rem' }} />
                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem' }}>
                        <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} />
                        Select All Eligible ({allEligibleIds.length})
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Selected: <strong>{selectedEmpIds.length}</strong>
                      </span>
                    </div>

                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                      {loadingEmployees ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>
                      ) : filteredEmployees.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No employees found.</div>
                      ) : (
                        filteredEmployees.map((emp) => {
                          const isEnrolled = emp.is_enrolled;
                          const isSelected = selectedEmpIds.includes(emp.employee_id);
                          return (
                            <div
                              key={emp.employee_id}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', opacity: isEnrolled ? 0.6 : 1, background: isSelected ? 'rgba(124,58,237,0.04)' : 'transparent' }}
                            >
                              <label style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, cursor: isEnrolled ? 'not-allowed' : 'pointer' }}>
                                <input
                                  type="checkbox"
                                  disabled={isEnrolled}
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isEnrolled) return;
                                    setSelectedEmpIds(prev => prev.includes(emp.employee_id) ? prev.filter(id => id !== emp.employee_id) : [...prev, emp.employee_id]);
                                  }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{emp.name} <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>({emp.employee_code})</span></div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{emp.email} · {emp.department} · {emp.designation}</div>
                                </div>
                              </label>
                              {isEnrolled && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Already Enrolled</span>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transactional emails sent immediately upon assignment.</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="button" className="btn btn-ghost" disabled={assigning} onClick={() => setAssignModalOpen(false)}>Cancel</button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={assigning || selectedEmpIds.length === 0}
                        onClick={handleAssignSubmit}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 12 }}
                      >
                        {assigning ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Assigning...</> : <><Check size={16} /> Confirm Assignment ({selectedEmpIds.length})</>}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ══════════════════════════════════════════════════════════════════
            MODAL 4 — Delete Course Confirmation
        ══════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {deleteModalOpen && courseToDelete && (
            <div className="modal-backdrop" onClick={() => !deletingCourse && setDeleteModalOpen(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card, #14131C)', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.7)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#EF4444' }}>Delete Course</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Irreversible management action</span>
                    </div>
                  </div>
                  <button className="btn-icon" disabled={deletingCourse} onClick={() => setDeleteModalOpen(false)}><X size={18} /></button>
                </div>

                <div style={{ padding: 24 }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    Permanently delete <strong style={{ color: 'white' }}>"{courseToDelete.title}"</strong>?
                  </p>
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: 14, marginBottom: 20, fontSize: '0.8rem', color: '#FCA5A5', lineHeight: 1.5 }}>
                    <strong>Warning:</strong> This will permanently remove:
                    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                      <li>All enrollment and progress records</li>
                      <li>All certificates earned for this course</li>
                      <li>All extracted SCORM assets from storage</li>
                    </ul>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button type="button" className="btn btn-ghost" disabled={deletingCourse} onClick={() => setDeleteModalOpen(false)}>Cancel</button>
                    <button
                      type="button"
                      className="btn"
                      disabled={deletingCourse}
                      onClick={handleConfirmDelete}
                      style={{ background: '#EF4444', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
                    >
                      {deletingCourse ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Deleting...</> : <><Trash2 size={16} /> Yes, Delete Course</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
