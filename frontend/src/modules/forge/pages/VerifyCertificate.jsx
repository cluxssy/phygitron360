import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import {
  ShieldCheck, Award, CheckCircle, Download, ExternalLink,
  AlertTriangle, Copy, ArrowLeft, Calendar, User, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyCertificate() {
  const { code } = useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) {
      setError('No certificate verification code provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    forgeApi.verifyCertificate(code)
      .then(res => {
        const payload = res.data?.data || res.data;
        if (payload && (payload.verification_code || payload.course_title)) {
          setCert(payload);
        } else {
          setError('Certificate not found or expired');
        }
      })

      .catch(err => {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Unable to verify certificate. Please check the code.');
      })
      .finally(() => setLoading(false));
  }, [code]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F5',
      color: '#111827',
      padding: '40px 20px 80px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: '1.1rem'
          }}>
            P3
          </div>
          <span style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#111827' }}>
            PHYGITRON <span style={{ color: '#7C3AED' }}>360</span>
          </span>
        </Link>
        <div style={{ fontSize: '0.82rem', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>
          Enterprise Credential Verification Registry
        </div>
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 680, width: '100%' }}>
        {loading ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #EBE4FF',
            borderRadius: 24,
            padding: 60,
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.05)',
          }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 20px', borderColor: '#7C3AED', borderTopColor: 'transparent' }} />
            <h3 style={{ margin: 0, fontWeight: 700, color: '#111827' }}>Verifying Credential...</h3>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: 8 }}>
              Validating cryptographic verification code against Phygitron 360 LMS Registry
            </p>
          </div>
        ) : error ? (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #FECACA',
            borderRadius: 24,
            padding: '48px 36px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.05)',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>
              Verification Failed
            </h2>
            <p style={{ color: '#4B5563', fontSize: '0.95rem', maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.5 }}>
              {error}
            </p>
            <div style={{
              display: 'inline-block',
              background: '#F3F4F6',
              padding: '8px 16px',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: '0.88rem',
              color: '#374151',
              marginBottom: 28,
              border: '1px solid #E5E7EB',
            }}>
              Code queried: {code}
            </div>
            <div>
              <Link to="/forge/transcript" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12 }}>
                <ArrowLeft size={16} /> Back to Learning Transcript
              </Link>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #EBE4FF',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(124, 58, 237, 0.08)',
          }}>
            {/* Top Status Banner */}
            <div style={{
              background: '#ECFDF5',
              borderBottom: '1px solid #A7F3D0',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: '#10B981',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#065F46', letterSpacing: '0.02em' }}>
                    AUTHENTIC & VERIFIED CREDENTIAL
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#047857' }}>
                    Phygitron 360 LMS Registry &bull; Verified Record
                  </div>
                </div>
              </div>

              <div style={{
                background: '#D1FAE5',
                color: '#065F46',
                padding: '4px 12px',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: '0.75rem',
                border: '1px solid #A7F3D0',
              }}>
                ✓ ACTIVE
              </div>
            </div>

            {/* Certificate Details Body */}
            <div style={{ padding: '36px 32px' }}>
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏆</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Certificate of Completion
                </div>
                <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                  {cert.course_title}
                </h1>
              </div>

              <div style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 16,
                padding: '24px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 20,
                marginBottom: 28,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    <User size={13} /> Issued To
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                    {cert.learner_name}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    <Calendar size={13} /> Date of Issuance
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827' }}>
                    {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    <Award size={13} /> Verification Code
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#F3F0FF',
                    border: '1px solid #DDD6FE',
                    borderRadius: 10,
                    padding: '8px 14px',
                  }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.15rem', color: '#6D28D9', letterSpacing: '0.1em' }}>
                      {cert.verification_code}
                    </span>
                    <button
                      onClick={copyLink}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copied ? '#059669' : '#7C3AED',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <Copy size={13} /> {copied ? 'Copied' : 'Share Link'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {cert.pdf_url && (
                  <a
                    href={cert.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      minWidth: 180,
                      justifyContent: 'center',
                      padding: '12px 20px',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      textDecoration: 'none',
                    }}
                  >
                    <Download size={16} /> Download Official PDF
                  </a>
                )}

                <Link
                  to="/forge/transcript"
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    justifyContent: 'center',
                    padding: '12px 20px',
                    borderRadius: 12,
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                  }}
                >
                  <BookOpen size={16} /> Learning Transcript
                </Link>
              </div>

              {/* Security Seal Note */}
              <div style={{
                marginTop: 28,
                paddingTop: 20,
                borderTop: '1px solid #E5E7EB',
                textAlign: 'center',
                fontSize: '0.72rem',
                color: '#9CA3AF',
                lineHeight: 1.5,
              }}>
                This official credential was issued by Phygitron 360 LMS and is digitally verified by the central registry.
                The certificate recipient has satisfied all curriculum requirements, SCORM mastery benchmarks, and assessment criteria.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
