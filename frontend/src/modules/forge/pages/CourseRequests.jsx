import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  Clock, CheckCircle, XCircle, Search, Filter, Check, X,
  AlertTriangle, BookOpen, User, RefreshCw, MessageSquare,
  Shield, Layers, ChevronRight, Send, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import BannerCard from '../components/BannerCard';
import StatCard from '../components/StatCard';
import ForgeHeader from '../components/ForgeHeader';
import '../styles/forge.css';

const STATUS_BADGES = {
  pending: {
    bg: 'rgba(245, 158, 11, 0.1)',
    text: '#D97706',
    border: 'rgba(245, 158, 11, 0.3)',
    label: 'Pending Review',
    icon: Clock,
  },
  approved: {
    bg: 'rgba(16, 185, 129, 0.1)',
    text: '#059669',
    border: 'rgba(16, 185, 129, 0.3)',
    label: 'Approved & Enrolled',
    icon: CheckCircle,
  },
  rejected: {
    bg: 'rgba(239, 68, 68, 0.1)',
    text: '#DC2626',
    border: 'rgba(239, 68, 68, 0.3)',
    label: 'Declined',
    icon: XCircle,
  },
};

export default function CourseRequests({ embedded = false, onPendingCountChange = null }) {
  const { user } = useAuth();
  const nav = useNavigate();

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Action states
  const [approvingId, setApprovingId] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Load requests
  const loadRequests = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await forgeApi.courseRequests({
        status: activeTab === 'all' ? undefined : activeTab,
        q: search || undefined,
        page: pg,
        limit: 20,
      });
      const d = res.data.data || {};
      setRequests(d.requests || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setPage(pg);
      setSummary(d.summary || {});

      if (onPendingCountChange && d.summary?.pending_count !== undefined) {
        onPendingCountChange(d.summary.pending_count);
      }
    } catch (err) {
      toast.error('Failed to load course requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, onPendingCountChange]);

  useEffect(() => {
    loadRequests(1);
  }, [loadRequests]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Approve action
  const handleApprove = async (req) => {
    setApprovingId(req.id);
    try {
      const res = await forgeApi.approveCourseRequest(req.id);
      toast.success(res.data.message || `Approved ${req.employee_name} for "${req.course_title}"`);
      loadRequests(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve course request');
    } finally {
      setApprovingId(null);
    }
  };

  // Reject action
  const openRejectModal = (req) => {
    setRequestToReject(req);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!requestToReject) return;
    setRejecting(true);
    try {
      const res = await forgeApi.rejectCourseRequest(requestToReject.id, {
        review_notes: rejectReason.trim() || undefined,
      });
      toast.success(res.data.message || 'Course request declined');
      setRejectModalOpen(false);
      setRequestToReject(null);
      loadRequests(page);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to decline course request');
    } finally {
      setRejecting(false);
    }
  };

  const pendingCount = summary?.pending_count || 0;
  const approvedCount = summary?.approved_count || 0;
  const rejectedCount = summary?.rejected_count || 0;
  const totalCount = summary?.total_count || 0;

  return (
    <div
      className={embedded ? 'space-y-8 animate-fade-in-up' : 'forge-container forge-grain'}
      style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}
    >
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>

        {/* ── Banner Card ──────────────────────────────────────────────────── */}
        <BannerCard
          eyebrow="MANAGEMENT & APPROVALS"
          title="Course Access Requests"
          subtitle="Review, approve, or decline employee requests for catalog courses."
          rightContent={
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={() => nav('/forge?tab=my-courses&view=management')}
                className="px-5 py-3.5 rounded-2xl bg-[#f3f4f6] text-black text-[10px] font-black uppercase tracking-[0.2em] border border-[#e5e7eb] hover:bg-[#e5e7eb] transition-all flex items-center gap-2"
              >
                <BookOpen size={14} /> Manage Courses
              </button>
              <button
                onClick={() => loadRequests(page)}
                className="px-5 py-3.5 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          }
        />

        {/* ── 4 KPI Stat Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Requests"
            value={totalCount}
            color="#8B5CF6"
            borderColor="border-t-purple-500"
            icon={Layers}
            sub="All submissions"
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            color="#F59E0B"
            borderColor="border-t-amber-500"
            icon={Clock}
            sub="Action required"
          />
          <StatCard
            label="Approved & Enrolled"
            value={approvedCount}
            color="#10B981"
            borderColor="border-t-emerald-500"
            icon={CheckCircle}
            sub="Active learners"
          />
          <StatCard
            label="Declined"
            value={rejectedCount}
            color="#EF4444"
            borderColor="border-t-red-500"
            icon={XCircle}
            sub="Not approved"
          />
        </div>

        {/* ── View Toggle & Search Row ──────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div className="flex bg-[#f3f0ff] p-1 rounded-2xl border border-[#ebe4ff]" style={{ width: 'fit-content' }}>
            {[
              { id: 'all', label: `All (${totalCount})` },
              { id: 'pending', label: `Pending (${pendingCount})`, badge: pendingCount > 0 },
              { id: 'approved', label: `Approved (${approvedCount})` },
              { id: 'rejected', label: `Declined (${rejectedCount})` },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    active
                      ? '!bg-black !text-white shadow-sm'
                      : 'text-black/60 hover:bg-white'
                  }`}
                >
                  {tab.label}
                  {tab.badge && !active && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                  )}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ width: 340, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by learner, code, or course..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: 40, height: 42, borderRadius: 12, fontSize: '0.85rem' }}
            />
          </form>
        </div>

        {/* ── Requests Table / Cards ────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280, flexDirection: 'column', gap: 14 }}>
            <div className="spinner spinner-lg" />
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading course requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', borderRadius: 20, background: 'var(--forge-card-bg)', border: '1px solid var(--forge-border)' }}>
            <Shield size={44} style={{ color: 'var(--forge-accent)', margin: '0 auto 16px', opacity: 0.6 }} />
            <h3 style={{ margin: '0 0 8px 0', fontWeight: 800 }}>
              {activeTab === 'pending'
                ? 'No Pending Requests'
                : 'No Course Requests Found'}
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto', fontSize: '0.88rem' }}>
              {activeTab === 'pending'
                ? 'All employee course access requests have been reviewed.'
                : 'When employees request access to catalog courses, their requests will appear here for managerial review.'}
            </p>
          </div>
        ) : (
          <div className="card" style={{ borderRadius: 20, overflow: 'hidden' }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Requested Course</th>
                    <th>Request Reason</th>
                    <th style={{ textAlign: 'center' }}>Date Requested</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const statusInfo = STATUS_BADGES[req.status] || STATUS_BADGES.pending;
                    const StatusIcon = statusInfo.icon;
                    const isPending = req.status === 'pending';
                    const isApproving = approvingId === req.id;

                    return (
                      <tr key={req.id}>
                        {/* Learner */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 38, height: 38, borderRadius: 12,
                                background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 900, fontSize: '0.9rem', flexShrink: 0
                              }}
                            >
                              {(req.employee_name || req.username || '?')[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                                {req.employee_name || req.username}
                                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                  ({req.employee_code || 'EMP'})
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {req.user_email} · {req.department || 'General'}
                                {req.designation ? ` · ${req.designation}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Course */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>
                              {req.course_title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <span
                                style={{
                                  background: req.domain_color ? `${req.domain_color}18` : 'rgba(124, 58, 237, 0.1)',
                                  color: req.domain_color || '#7C3AED',
                                  padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                }}
                              >
                                {req.domain_name || 'General'}
                              </span>
                              <span className="badge badge-muted" style={{ fontSize: '0.68rem' }}>
                                {req.course_difficulty || 'Beginner'}
                              </span>
                              {req.estimated_hours && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {req.estimated_hours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Reason / Notes */}
                        <td style={{ maxWidth: 260 }}>
                          {req.reason ? (
                            <div
                              style={{
                                fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic',
                                background: 'var(--bg-main)', padding: '6px 10px', borderRadius: 8,
                                border: '1px solid var(--border)', lineHeight: 1.4,
                              }}
                            >
                              "{req.reason}"
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              No note provided
                            </span>
                          )}

                          {req.review_notes && (
                            <div style={{ marginTop: 6, fontSize: '0.72rem', color: req.status === 'approved' ? '#059669' : '#DC2626' }}>
                              <strong>Manager Note:</strong> {req.review_notes}
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {req.requested_at
                            ? new Date(req.requested_at).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: 'numeric',
                              })
                            : '—'}
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                            {req.requested_at
                              ? new Date(req.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '4px 10px', borderRadius: 20,
                              background: statusInfo.bg, color: statusInfo.text,
                              border: `1px solid ${statusInfo.border}`,
                              fontSize: '0.72rem', fontWeight: 800,
                            }}
                          >
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                          {req.reviewer_name && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                              By {req.reviewer_name}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                              <button
                                onClick={() => handleApprove(req)}
                                disabled={isApproving}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '7px 14px', borderRadius: 10,
                                  background: '#10B981', color: 'white', border: 'none',
                                  fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
                                }}
                              >
                                {isApproving ? (
                                  <><div className="spinner" style={{ width: 12, height: 12 }} /> Approving...</>
                                ) : (
                                  <><Check size={14} /> Approve</>
                                )}
                              </button>
                              <button
                                onClick={() => openRejectModal(req)}
                                disabled={isApproving}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 5,
                                  padding: '7px 12px', borderRadius: 10,
                                  background: 'rgba(239, 68, 68, 0.08)', color: '#DC2626',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer',
                                }}
                              >
                                <X size={14} /> Decline
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              Reviewed {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                            </div>
                          )}
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
                <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => loadRequests(page - 1)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem' }}>
                  ← Prev
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Page {page} of {pages}
                </span>
                <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => loadRequests(page + 1)} style={{ padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem' }}>
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Portalled Decline Modal ─────────────────────────────────────────── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {rejectModalOpen && requestToReject && (
            <div className="modal-backdrop" onClick={() => !rejecting && setRejectModalOpen(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 8 }}
                className="modal-box"
                style={{ maxWidth: 480, width: '100%', background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <XCircle size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Decline Course Request</h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {requestToReject.employee_name} · "{requestToReject.course_title}"
                      </div>
                    </div>
                  </div>
                  <button className="btn-icon" disabled={rejecting} onClick={() => setRejectModalOpen(false)}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleConfirmReject} style={{ padding: 24 }}>
                  <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                    Are you sure you want to decline this course request? The learner will be notified and can view your feedback.
                  </p>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 6, display: 'block' }}>
                      Feedback / Reason (Optional)
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="e.g., Please complete prerequisite compliance training first before enrolling in this course..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-ghost" disabled={rejecting} onClick={() => setRejectModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={rejecting}
                      style={{
                        padding: '10px 20px', borderRadius: 12,
                        background: '#DC2626', color: 'white', border: 'none',
                        fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      {rejecting ? (
                        <><div className="spinner" style={{ width: 14, height: 14 }} /> Declining...</>
                      ) : (
                        <><X size={16} /> Confirm Decline</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
