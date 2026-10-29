import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  Award, BookOpen, CheckCircle, Clock, Download, ExternalLink,
  GraduationCap, TrendingUp, FileText, Play, ShieldCheck, Copy,
  X, Printer, Eye, Sparkles, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import '../styles/forge.css';
import ForgeHeader from '../components/ForgeHeader';
import StatCard from '../components/StatCard';
import BannerCard from '../components/BannerCard';

function CertificateModal({ cert, learnerName, onClose }) {
  if (!cert) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyCode = () => {
    navigator.clipboard.writeText(cert.verification_code);
    toast.success('Verification code copied!');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 900 }}>
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 780,
          width: '95%',
          background: '#0B0F19',
          border: '1px solid rgba(124, 58, 237, 0.4)',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(124, 58, 237, 0.2)',
        }}
      >
        {/* Modal Top Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 800, color: '#A78BFA' }}>
            <Award size={16} /> Certificate of Completion
          </div>
          <button className="btn-icon" onClick={onClose} style={{ padding: 4, color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Certificate Canvas / Decorative Card */}
        <div style={{ padding: '28px 24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)',
            border: '3px solid #7C3AED',
            borderRadius: 16,
            padding: '36px 28px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: 'inset 0 0 40px rgba(124, 58, 237, 0.15)',
          }}>
            {/* Corner Accents */}
            <div style={{ position: 'absolute', top: 12, left: 14, fontSize: '1.2rem', opacity: 0.6 }}>✦</div>
            <div style={{ position: 'absolute', top: 12, right: 14, fontSize: '1.2rem', opacity: 0.6 }}>✦</div>
            <div style={{ position: 'absolute', bottom: 12, left: 14, fontSize: '1.2rem', opacity: 0.6 }}>✦</div>
            <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: '1.2rem', opacity: 0.6 }}>✦</div>

            {/* Seal & Org */}
            <div style={{ fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', color: '#A78BFA', textTransform: 'uppercase', marginBottom: 4 }}>
              PHYGITRON 360 ENTERPRISE LMS
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              CERTIFICATE OF COMPLETION
            </h2>

            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: 6 }}>
              This certifies that
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#F8FAFC', marginBottom: 8, letterSpacing: '-0.01em' }}>
              {learnerName || 'Learner'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: 12 }}>
              has successfully fulfilled all curriculum requirements and mastered
            </div>

            <div style={{
              display: 'inline-block',
              background: 'rgba(124, 58, 237, 0.2)',
              border: '1px solid rgba(124, 58, 237, 0.4)',
              borderRadius: 12,
              padding: '10px 24px',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#C4B5FD',
              marginBottom: 24,
              maxWidth: '90%',
            }}>
              {cert.course_title}
            </div>

            {/* Footer Metadata */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 18,
              marginTop: 10,
              flexWrap: 'wrap',
              gap: 16,
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Date Issued</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#E2E8F0', marginTop: 2 }}>
                  {new Date(cert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Verification Code</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.92rem', color: '#A78BFA', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {cert.verification_code}
                  <button onClick={copyCode} title="Copy code" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Registry Status</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                  ✓ Cryptographically Verified
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            {cert.pdf_url && (
              <a
                href={cert.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, minWidth: 160, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontWeight: 800 }}
              >
                <Download size={15} /> Download PDF
              </a>
            )}
            <Link
              to={`/forge/verify-cert/${cert.verification_code}`}
              target="_blank"
              className="btn btn-secondary"
              style={{ flex: 1, minWidth: 160, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, fontWeight: 700 }}
            >
              <ExternalLink size={15} /> Public Verification
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertCard({ cert, onPreview }) {
  return (
    <div className="card animate-fade-in" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: 16 }}>
      {/* Certificate visual header */}
      <div style={{
        background: 'linear-gradient(135deg, #7C3AED, #9333EA, #EC4899)',
        padding: '24px 20px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.1,
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>🏆</div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Certificate of Completion
          </div>
          <div style={{ color: 'white', fontSize: '1rem', fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>
            {cert.course_title}
          </div>
        </div>
      </div>

      <div style={{ padding: '18px 20px', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issued On</div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginTop: 2 }}>
              {new Date(cert.issued_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div style={{
            background: 'rgba(124, 58, 237, 0.1)',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            borderRadius: 8,
            padding: '6px 10px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Code</div>
            <div style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.85rem', color: '#A78BFA', letterSpacing: '0.08em' }}>
              {cert.verification_code}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onPreview(cert)}
            className="btn btn-secondary btn-sm"
            style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8, fontWeight: 700 }}
          >
            <Eye size={13} /> Preview
          </button>

          {cert.pdf_url && (
            <a
              href={cert.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 8, fontWeight: 800 }}
              onClick={e => e.stopPropagation()}
            >
              <Download size={13} /> PDF
            </a>
          )}

          <Link
            to={`/forge/verify-cert/${cert.verification_code}`}
            target="_blank"
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px 10px', borderRadius: 8, color: 'var(--text-muted)' }}
            title="Public Verification Link"
          >
            <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Transcript({ embedded = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ enrollments: [], certificates: [] });
  const [loading, setLoading] = useState(true);
  const [previewCert, setPreviewCert] = useState(null);

  const loadTranscript = async () => {
    setLoading(true);
    try {
      const res = await forgeApi.transcript();
      setData(res.data?.data || { enrollments: [], certificates: [] });
    } catch (err) {
      toast.error('Failed to load learning transcript');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscript();
  }, []);

  const enrollments = data.enrollments || [];
  const certificates = data.certificates || [];
  const completed = enrollments.filter(e => e.completed_at || e.status === 'completed');
  const inProgress = enrollments.filter(e => !e.completed_at && e.status !== 'completed');

  const avgProgress = inProgress.length > 0
    ? Math.round(inProgress.reduce((s, e) => s + (e.progress_percent || 0), 0) / inProgress.length)
    : (completed.length > 0 ? 100 : 0);

  return (
    <div className={embedded ? "space-y-8 animate-fade-in-up" : "forge-container forge-grain"} style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}>
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>
      {/* ── Page Header (Matching Employee Central) ─────────────────────────── */}
      <BannerCard
        eyebrow="ACADEMIC TRANSCRIPT & CREDENTIALS"
        title="My Learning Transcript"
        subtitle="Complete audit record of assigned courses, SCORM progress, and verified completion credentials"
        rightContent={
          <div className="flex items-center gap-3">
            <button
              onClick={loadTranscript}
              className="px-6 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 hover:opacity-90 transition-all shadow-md"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        }
      />

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : (
        <>
          {/* ── 4 KPI Stat Cards (Matching Employee Central) ───────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Courses Enrolled"
              value={enrollments.length}
              color="#8B5CF6"
              borderColor="border-t-purple-500"
              icon={BookOpen}
              sub="Total Enrolled Modules"
            />
            <StatCard
              label="Completed Modules"
              value={completed.length}
              color="#10B981"
              borderColor="border-t-emerald-500"
              icon={CheckCircle}
              sub="Successfully Finished"
            />
            <StatCard
              label="Certificates Earned"
              value={certificates.length}
              color="#EC4899"
              borderColor="border-t-pink-500"
              icon={Award}
              sub="Verified Credentials"
            />
            <StatCard
              label="Average Progress"
              value={`${avgProgress}%`}
              color="#3B82F6"
              borderColor="border-t-blue-500"
              icon={TrendingUp}
              sub="Overall Progress Rate"
            />
          </div>

          {/* ── Two Column Layout: Enrollments & Certificates ────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 28, alignItems: 'start' }}>
            
            {/* Left: Enrollment History */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'rgba(124, 58, 237, 0.15)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <FileText size={17} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    Enrollment History ({enrollments.length})
                  </h3>
                </div>
              </div>

              <div className="card" style={{ borderRadius: 18, overflow: 'hidden', padding: 0 }}>
                {enrollments.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📚</div>
                    <h4 style={{ margin: '0 0 6px', fontWeight: 800, color: 'var(--text-main)' }}>No Courses Assigned</h4>
                    <p style={{ fontSize: '0.86rem', margin: '0 0 20px' }}>
                      You haven't been enrolled in any courses yet. Browse the catalog to explore learning paths.
                    </p>
                    <Link to="/forge/library" className="btn btn-secondary btn-sm" style={{ borderRadius: 10 }}>
                      Explore Course Catalog →
                    </Link>
                  </div>
                ) : (
                  <div>
                    {enrollments.map((e, idx) => (
                      <div
                        key={e.id || idx}
                        style={{
                          padding: '20px 22px',
                          borderBottom: idx < enrollments.length - 1 ? '1px solid var(--border)' : 'none',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                              <span style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text-main)' }}>
                                {e.course_title}
                              </span>
                              {e.status === 'completed' || e.completed_at ? (
                                <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                                  ✓ Completed
                                </span>
                              ) : (
                                <span className="badge badge-primary" style={{ fontSize: '0.68rem', fontWeight: 800 }}>
                                  In Progress
                                </span>
                              )}
                              {e.domain_name && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '2px 8px', borderRadius: 6 }}>
                                  {e.domain_name}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 16, fontSize: '0.76rem', color: 'var(--text-muted)', flexWrap: 'wrap', marginBottom: 10 }}>
                              <span>
                                <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                Enrolled: {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : 'Active'}
                              </span>
                              {e.completed_at && (
                                <span style={{ color: '#10B981', fontWeight: 700 }}>
                                  Finished: {new Date(e.completed_at).toLocaleDateString()}
                                </span>
                              )}
                              {e.scorm_location && (
                                <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                  Bookmark: {e.scorm_location}
                                </span>
                              )}
                            </div>

                            {/* Progress Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Syllabus Visited</span>
                                <span style={{ fontWeight: 800, color: e.status === 'completed' ? '#10B981' : 'var(--primary)' }}>
                                  {Math.round(e.progress_percent || 0)}%
                                </span>
                              </div>
                              <div className="progress-bar" style={{ height: 6, borderRadius: 4 }}>
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${e.progress_percent || 0}%`,
                                    background: e.status === 'completed' ? '#10B981' : 'var(--primary)',
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Button */}
                          <div style={{ alignSelf: 'center', marginLeft: 8 }}>
                            <Link
                              to={`/forge/course/${e.course_id}`}
                              className={`btn ${e.status === 'completed' ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 10,
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Play size={12} /> {e.status === 'completed' ? 'Review' : 'Continue'}
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Earned Certificates */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Award size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                    Earned Certificates ({certificates.length})
                  </h3>
                </div>
              </div>

              {certificates.length === 0 ? (
                <div className="card" style={{ borderRadius: 18, padding: '42px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#F59E0B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <Award size={30} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.15rem' }}>
                    Earn Your Verified Certificates
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 360, margin: '0 auto 20px', lineHeight: 1.45 }}>
                    Complete your assigned training modules (such as reaching 100% or passing assessment criteria). Your official verified credential will be generated automatically.
                  </p>

                  {inProgress.length > 0 && (
                    <Link
                      to={`/forge/course/${inProgress[0].course_id}`}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 18px',
                        borderRadius: 10,
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                      }}
                    >
                      <Play size={13} /> Resume {inProgress[0].course_title}
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {certificates.map((cert) => (
                    <CertCard
                      key={cert.id}
                      cert={cert}
                      onPreview={(c) => setPreviewCert(c)}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── Interactive Certificate Preview Modal ── */}
      {previewCert && (
        <CertificateModal
          cert={previewCert}
          learnerName={user?.name || user?.full_name || user?.username || 'Learner'}
          onClose={() => setPreviewCert(null)}
        />
      )}
      </div>
    </div>
  );
}
