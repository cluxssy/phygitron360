import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { forgeApi } from '../../../core/api/forgeApi';
import { useAuth } from '../../../core/auth/AuthContext';
import {
  ChevronLeft, Award, PlayCircle, CheckCircle, Clock, Maximize2,
  Minimize2, RefreshCw, Sparkles, X, Shield, Download,
  ExternalLink, Layers, BookOpen, ArrowLeft, ArrowRight, HelpCircle, Check, Radio
} from 'lucide-react';
import '../styles/forge.css';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const resolveAssetUrl = (url, course) => {
  if (course?.is_scorm && course?.scorm_entry_url) {
    const entry = course.scorm_entry_url;
    if (/^https?:\/\//i.test(entry)) return entry;
    if (entry.startsWith('/api/')) return entry;
    return `/api/forge/scorm/${course.id}/${entry.replace(/^\/+/, '')}`;
  }
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
  return url;
};


const calculateLearnerProgress = (runtimeData, eventProgress) => {
  const status = String(
    runtimeData?.['cmi.completion_status'] ||
    runtimeData?.['cmi.core.lesson_status'] ||
    runtimeData?.['cmi.success_status'] ||
    ''
  ).toLowerCase();

  if (['completed', 'passed', 'complete', 'success'].includes(status)) {
    return 100;
  }

  // 1. Explicit progress from shim event
  if (eventProgress !== undefined && eventProgress !== null && !isNaN(parseFloat(eventProgress))) {
    const ep = parseFloat(eventProgress);
    if (ep > 0) return Math.min(100, Math.round(ep));
  }

  // 2. SCORM 2004 cmi.progress_measure (0.0 to 1.0 or 0 to 100)
  if (runtimeData?.['cmi.progress_measure']) {
    const pm = parseFloat(runtimeData['cmi.progress_measure']);
    if (!isNaN(pm) && pm > 0) {
      return Math.min(100, Math.round(pm <= 1 ? pm * 100 : pm));
    }
  }

  // 3. SCORM cmi.core.lesson_progress
  if (runtimeData?.['cmi.core.lesson_progress']) {
    const lp = parseFloat(runtimeData['cmi.core.lesson_progress']);
    if (!isNaN(lp) && lp > 0) {
      return Math.min(100, Math.round(lp));
    }
  }

  const suspendData = String(runtimeData?.['cmi.suspend_data'] || runtimeData?.['cmi.core.suspend_data'] || '');

  // 4. Phygitron JSON suspend_data: {"slide":N,"total":M,"progress":P,...}
  if (suspendData && suspendData.charAt(0) === '{') {
    try {
      const obj = JSON.parse(suspendData);
      if (typeof obj.progress === 'number' && obj.progress > 0) {
        return Math.min(100, Math.round(obj.progress));
      }
      if (typeof obj.slide === 'number' && typeof obj.total === 'number' && obj.total > 0) {
        return Math.min(100, Math.round(((obj.slide + 1) / obj.total) * 100));
      }
    } catch (e) { /* not JSON */ }
  }

  // 5. Captivate-style comma-separated visited list
  if (suspendData && suspendData.includes(',') && suspendData.charAt(0) !== '{') {
    const parts = suspendData.split(',');
    const viewed = parts.filter(p => ['1', 'true', 'v'].includes(p.trim())).length;
    if (parts.length >= 4) {
      return Math.min(98, Math.round((viewed / parts.length) * 100));
    }
  }

  // 6. Fraction in location string (e.g. "14/50" or "slide_7/10")
  const location = String(runtimeData?.['cmi.location'] || runtimeData?.['cmi.core.lesson_location'] || '');
  if (location) {
    const mFrac = location.match(/(\d+)\s*(?:\/|of)\s*(\d+)/i);
    if (mFrac && parseFloat(mFrac[2]) > 0) {
      return Math.min(100, Math.round((parseFloat(mFrac[1]) / parseFloat(mFrac[2])) * 100));
    }
  }

  return null;
};

const extractBookmark = (runtimeData) => {
  const loc = runtimeData?.['cmi.location'] || runtimeData?.['cmi.core.lesson_location'];
  if (loc && String(loc).trim() !== '') return String(loc).trim();

  const sd = String(runtimeData?.['cmi.suspend_data'] || runtimeData?.['cmi.core.suspend_data'] || '');

  // Phygitron JSON suspend_data bookmark
  if (sd && sd.charAt(0) === '{') {
    try {
      const obj = JSON.parse(sd);
      if (typeof obj.slide === 'number') {
        return `slide_${obj.slide + 1}${obj.total ? '/' + obj.total : ''}`;
      }
    } catch (e) { /* not JSON */ }
  }

  const mPlayer = sd.match(/_player\.([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)/);
  if (mPlayer && mPlayer[2]) {
    return `Slide: ${mPlayer[2]}`;
  }
  return null;
};

export default function CoursePlayer() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Native Interactive Course State
  const [nativeSectionIdx, setNativeSectionIdx] = useState(0);
  const [completedSections, setCompletedSections] = useState(new Set());
  const [nativeQuizAnswers, setNativeQuizAnswers] = useState({});
  const [nativeQuizSubmitted, setNativeQuizSubmitted] = useState({});

  const iframeRef = useRef(null);
  const scormDataRef = useRef({});
  const saveTimerRef = useRef(null);
  // Refs to always have the latest course/user values inside the postMessage
  // handler without re-registering the listener on every state change.
  const courseRef = useRef(null);
  const userRef = useRef(null);

  // Load course details
  const loadCourse = useCallback(async () => {
    try {
      const res = await forgeApi.getCourse(id);
      const data = res.data.data;

      if (data.enrollment) {
        let initProg = parseFloat(data.enrollment.progress_percent || 0);
        let initLoc = data.enrollment.scorm_location;

        // Auto-heal progress if currently 0 but suspend_data has visited slides
        if (initProg <= 0 && data.enrollment.scorm_suspend_data) {
          const calcProg = calculateLearnerProgress({
            'cmi.suspend_data': data.enrollment.scorm_suspend_data,
            'cmi.location': data.enrollment.scorm_location,
            'cmi.core.lesson_status': data.enrollment.status,
          }, null);
          if (calcProg && calcProg > 0) {
            initProg = calcProg;
            data.enrollment.progress_percent = calcProg;
          }
        }
        if (!initLoc && data.enrollment.scorm_suspend_data) {
          initLoc = extractBookmark({ 'cmi.suspend_data': data.enrollment.scorm_suspend_data });
          if (initLoc) data.enrollment.scorm_location = initLoc;
        }

        // Restore native completed sections
        if (data.sections && data.sections.length > 0) {
          const prog = parseFloat(data.enrollment.progress_percent || 0);
          const totalSec = data.sections.length;
          const completedCount = Math.round((prog / 100) * totalSec);
          const initialCompleted = new Set();
          for (let i = 0; i < completedCount; i++) {
            if (data.sections[i]) initialCompleted.add(data.sections[i].id);
          }
          setCompletedSections(initialCompleted);
        }

        scormDataRef.current = {
          'cmi.core.lesson_location': data.enrollment.scorm_location || '',
          'cmi.location': data.enrollment.scorm_location || '',
          'cmi.core.suspend_data': data.enrollment.scorm_suspend_data || '',
          'cmi.suspend_data': data.enrollment.scorm_suspend_data || '',
          'cmi.core.score.raw': data.enrollment.score !== null ? String(data.enrollment.score) : '',
          'cmi.score.raw': data.enrollment.score !== null ? String(data.enrollment.score) : '',
        };
      }

      setCourse(data);
      courseRef.current = data;
    } catch (err) {
      toast.error('Failed to load course details');
      nav('/forge/library');
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  // Keep courseRef in sync with state so the postMessage handler always has
  // the latest enrollment data without needing to re-register the listener.
  useEffect(() => {
    courseRef.current = course;
  }, [course]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  // Debounced backend progress sync
  const scheduleSync = useCallback((syncPayload) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setIsSyncing(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await forgeApi.syncProgress(id, syncPayload);
        const result = res.data.data;
        setLastSyncTime(new Date());

        setCourse(prev => {
          if (!prev) return prev;
          const wasCompleted = prev.enrollment?.status === 'completed';
          const isNowCompleted = result.completed || result.status === 'completed';

          if (!wasCompleted && isNowCompleted) {
            setShowCelebration(true);
          }

          return {
            ...prev,
            enrollment: {
              ...(prev.enrollment || {}),
              progress_percent: result.progress_percent,
              status: result.status,
              scorm_location: result.scorm_location,
            }
          };
        });
      } catch (err) {
        console.error('Failed to auto-sync SCORM progress', err);
      } finally {
        setIsSyncing(false);
      }
    }, 600);
  }, [id]);

  // Complete a native lesson and calculate progress
  const handleCompleteNativeSection = async (secId, nextIdx) => {
    const newCompleted = new Set(completedSections);
    newCompleted.add(secId);
    setCompletedSections(newCompleted);

    const totalSec = course?.sections?.length || 1;
    const newProg = Math.min(100, Math.round((newCompleted.size / totalSec) * 100));

    setCourse(prev => ({
      ...prev,
      enrollment: {
        ...(prev?.enrollment || {}),
        progress_percent: newProg,
        status: newProg >= 100 ? 'completed' : 'in_progress',
        completed_at: newProg >= 100 ? new Date().toISOString() : prev?.enrollment?.completed_at,
      }
    }));

    try {
      await forgeApi.syncProgress(id, {
        progress_percent: newProg,
        status: newProg >= 100 ? 'completed' : 'in_progress',
        scorm_location: `Lesson ${nextIdx !== undefined ? nextIdx + 1 : nativeSectionIdx + 1}`,
      });
      if (newProg >= 100) {
        setShowCelebration(true);
        toast.success("🎉 Course completed! Official certificate generated.");
      }
    } catch (e) {
      console.error('Failed to sync native lesson progress', e);
    }

    if (nextIdx !== undefined && nextIdx < totalSec) {
      setNativeSectionIdx(nextIdx);
    }
  };

  // PostMessage bridge for SCORM runtime
  // Registered ONCE — uses refs (courseRef, userRef) to read the latest state
  // without re-registering on every enrollment/user change (which caused the
  // initData to be sent with stale empty values during the first render).
  useEffect(() => {
    const sendInitData = () => {
      const currentCourse = courseRef.current;
      const currentUser = userRef.current;
      const enrollment = currentCourse?.enrollment;
      const initData = {
        'cmi.core.student_id': String(currentUser?.id || 'employee'),
        'cmi.core.student_name': currentUser?.full_name || 'Learner',
        'cmi.learner_id': String(currentUser?.id || 'employee'),
        'cmi.learner_name': currentUser?.full_name || 'Learner',
        'cmi.core.lesson_location': enrollment?.scorm_location || '',
        'cmi.location': enrollment?.scorm_location || '',
        'cmi.core.suspend_data': enrollment?.scorm_suspend_data || '',
        'cmi.suspend_data': enrollment?.scorm_suspend_data || '',
      };

      // Pre-populate our local runtime cache with saved learner data
      // so calculateLearnerProgress sees the right state immediately.
      if (enrollment?.scorm_suspend_data) {
        scormDataRef.current['cmi.suspend_data'] = enrollment.scorm_suspend_data;
        scormDataRef.current['cmi.core.suspend_data'] = enrollment.scorm_suspend_data;
      }
      if (enrollment?.scorm_location) {
        scormDataRef.current['cmi.location'] = enrollment.scorm_location;
        scormDataRef.current['cmi.core.lesson_location'] = enrollment.scorm_location;
      }

      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'phygitron:scorm-init-data',
          data: initData,
        }, '*');
      }
    };

    const handleMessage = (event) => {
      const msg = event?.data;
      if (!msg || typeof msg !== 'object') return;

      // ── Phase 1: Shim requests learner data ─────────────────────────────────
      // The new shim fires phygitron:scorm-needs-init instead of immediately
      // firing scorm-ready. We respond with init-data (saved location /
      // suspend_data). The shim then fires scorm-ready AFTER populating its
      // data store, which is when we update the progress bar.
      if (msg.type === 'phygitron:scorm-needs-init') {
        sendInitData();
        return;
      }

      // ── Phase 2: Shim confirms it received init-data and is truly ready ─────
      // scorm-ready fires AFTER the shim has populated its internal data from
      // our init-data response. msg.progressPercent is the resumed progress
      // derived from the saved suspend_data inside the shim.
      if (msg.type === 'phygitron:scorm-ready') {
        const currentCourse = courseRef.current;
        const enrollment = currentCourse?.enrollment;

        // Use the progress reported by the shim (calculated from saved data)
        // or fall back to what we computed from the enrollment.
        const savedProgress = enrollment?.progress_percent || 0;
        const shimProgress = (msg.progressPercent !== undefined && msg.progressPercent !== null)
          ? Math.round(parseFloat(msg.progressPercent))
          : null;
        const resumedProgress = shimProgress ?? calculateLearnerProgress(scormDataRef.current, null);

        if (resumedProgress !== null && resumedProgress > savedProgress) {
          setCourse(prev => {
            if (!prev) return prev;
            const currentPct = Number(prev.enrollment?.progress_percent || 0);
            if (resumedProgress <= currentPct) return prev;
            return {
              ...prev,
              enrollment: {
                ...(prev.enrollment || {}),
                progress_percent: resumedProgress,
                scorm_location: msg.location || prev.enrollment?.scorm_location,
              },
            };
          });
          scheduleSync({
            progress_percent: resumedProgress,
            scorm_location: msg.location || enrollment?.scorm_location || null,
            scorm_suspend_data: enrollment?.scorm_suspend_data || null,
          });
        }
        return;
      }

      // ── SCORM runtime events: set / commit / finish ──────────────────────────
      if (msg.type === 'phygitron:scorm-set' || msg.type === 'phygitron:scorm-commit' || msg.type === 'phygitron:scorm-finish') {
        if (msg.type === 'phygitron:scorm-set' && msg.key) {
          scormDataRef.current[msg.key] = msg.value;
          // Also merge allData if provided (keeps aliases in sync)
          if (msg.allData) {
            scormDataRef.current = { ...scormDataRef.current, ...msg.allData };
          }
        } else if (msg.data) {
          scormDataRef.current = { ...scormDataRef.current, ...msg.data };
        }

        const currentRuntime = scormDataRef.current;
        const location = currentRuntime['cmi.location'] || currentRuntime['cmi.core.lesson_location'] || null;
        const suspendData = currentRuntime['cmi.suspend_data'] || currentRuntime['cmi.core.suspend_data'] || null;
        const rawScore = currentRuntime['cmi.score.raw'] || currentRuntime['cmi.core.score.raw'] || null;
        const status = currentRuntime['cmi.completion_status'] || currentRuntime['cmi.core.lesson_status'] || currentRuntime['cmi.success_status'] || null;

        // Progress calculation — prefer the shim's pre-computed value
        const computedProgress = calculateLearnerProgress(currentRuntime, msg.progressPercent);
        const bookmark = (msg.location) || extractBookmark(currentRuntime) || location;

        // Real-time local state update so the progress bar updates with zero lag
        if (computedProgress !== null) {
          setCourse(prev => {
            if (!prev) return prev;
            const currentPct = prev.enrollment?.progress_percent || 0;
            if (computedProgress > currentPct || (bookmark && bookmark !== prev.enrollment?.scorm_location)) {
              return {
                ...prev,
                enrollment: {
                  ...(prev.enrollment || {}),
                  progress_percent: Math.max(currentPct, computedProgress),
                  scorm_location: bookmark || prev.enrollment?.scorm_location,
                }
              };
            }
            return prev;
          });
        }

        scheduleSync({
          scorm_location: bookmark,
          scorm_suspend_data: suspendData,
          score: rawScore !== null && !isNaN(parseFloat(rawScore)) ? parseFloat(rawScore) : undefined,
          status: status || undefined,
          progress_percent: computedProgress !== null ? Math.min(100, Math.max(0, computedProgress)) : undefined,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleSync]); // Only re-register when scheduleSync identity changes (memoized)

  const toggleFullscreen = () => {
    const elem = document.getElementById('scorm-player-container');
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const reloadPlayer = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
      toast.success('Module reloaded');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner spinner-lg" />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading course runtime...</p>
      </div>
    );
  }

  if (!course) return null;

  const launchUrl = resolveAssetUrl(course.scorm_entry_url || (course.sections?.[0]?.content_url), course);
  const enrollment = course.enrollment;
  const progressPct = Math.round(enrollment?.progress_percent || 0);
  const isCompleted = enrollment?.status === 'completed' || progressPct >= 100;

  return (
    <div
      id="scorm-player-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: '#F5F5F5',
        color: '#111827',
        overflow: 'hidden',
      }}
    >
      {/* ── Top Bar / Header ────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: '#FFFFFF',
          borderBottom: '1px solid #EBE4FF',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
          zIndex: 50,
          flexShrink: 0,
        }}
      >
        {/* Left: Back & Course Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={() => nav('/forge')}
            className="btn-icon"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              color: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Return to Forge Dashboard"
          >
            <ChevronLeft size={20} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  background: course.domain_color ? `${course.domain_color}18` : 'rgba(124, 58, 237, 0.1)',
                  color: course.domain_color || '#7C3AED',
                  border: `1px solid ${course.domain_color ? `${course.domain_color}30` : 'rgba(124, 58, 237, 0.2)'}`,
                  padding: '2px 8px',
                  borderRadius: 6,
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                }}
              >
                {course.domain_name || course.category || 'General'}
              </span>
              <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>
                SCORM {course.scorm_version || '1.2'}
              </span>
            </div>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
              {course.title}
            </h2>
          </div>
        </div>

        {/* Center: Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 190 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#6B7280', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Progress</span>
                {isSyncing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#D97706' }}>
                    <Clock size={10} /> saving...
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#059669' }}>
                    <CheckCircle size={10} /> saved
                  </span>
                )}
              </div>
              <span style={{ fontWeight: 800, color: isCompleted ? '#059669' : '#7C3AED' }}>
                {progressPct}%
              </span>
            </div>
            <div style={{ height: 6, background: '#E5E7EB', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: isCompleted ? '#10B981' : 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isCompleted && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: '#ECFDF5',
                color: '#059669',
                borderRadius: 8,
                fontSize: '0.75rem',
                fontWeight: 800,
                border: '1px solid #A7F3D0',
              }}
            >
              <CheckCircle size={14} /> Completed
            </div>
          )}

          <button
            onClick={reloadPlayer}
            className="btn-icon"
            style={{ width: 34, height: 34, borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#4B5563' }}
            title="Reload Module"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="btn-icon"
            style={{ width: 34, height: 34, borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#4B5563' }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* ── Main Player Frame ───────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
        {launchUrl ? (
          <iframe
            ref={iframeRef}
            src={launchUrl}
            title={course.title}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#000',
            }}
            allow="fullscreen; autoplay"
          />
        ) : course?.sections && course.sections.length > 0 ? (
          /* Native Interactive Course Player */
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', width: '100%', height: '100%', background: '#F5F5F5' }}>
            
            {/* Left Drawer: Course Lessons List */}
            <div style={{ background: '#FFFFFF', borderRight: '1px solid #EBE4FF', padding: '20px 16px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--forge-accent)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.05em' }}>
                Course Modules ({course.sections.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {course.sections.map((sec, sIdx) => {
                  const isActive = sIdx === nativeSectionIdx;
                  const isDone = completedSections.has(sec.id);
                  return (
                    <div
                      key={sec.id || sIdx}
                      onClick={() => setNativeSectionIdx(sIdx)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: isActive ? 'rgba(124, 58, 237, 0.08)' : '#F9FAFB',
                        border: isActive ? '1.5px solid var(--forge-accent)' : '1px solid #E5E7EB',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: isActive ? '#7C3AED' : '#6B7280' }}>
                          LESSON {sIdx + 1}
                        </span>
                        {isDone ? (
                          <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.7rem', fontWeight: 800 }}>
                            <CheckCircle size={12} /> Done
                          </span>
                        ) : (
                          <span style={{ color: '#6B7280', fontSize: '0.68rem' }}>
                            {sec.duration_minutes || 15}m
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                        {sec.title}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Main Content Pane */}
            <div style={{ padding: '36px 48px', overflowY: 'auto', maxHeight: 'calc(100vh - 65px)', background: '#F5F5F5' }}>
              {course.sections[nativeSectionIdx] && (() => {
                const curSec = course.sections[nativeSectionIdx];
                const isDone = completedSections.has(curSec.id);
                return (
                  <div style={{ maxWidth: 860, margin: '0 auto', background: '#FFFFFF', borderRadius: 20, border: '1px solid #EBE4FF', padding: '36px 40px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--forge-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Lesson {nativeSectionIdx + 1} of {course.sections.length}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#6B7280' }}>
                        <Clock size={13} /> {curSec.duration_minutes || 15} mins
                      </div>
                    </div>

                    <h1 style={{ margin: '0 0 24px 0', fontSize: '2rem', fontWeight: 900, color: '#111827', letterSpacing: '-0.02em' }}>
                      {curSec.title}
                    </h1>

                    {/* Lesson Markdown Content */}
                    <div className="course-lesson-content" style={{ fontSize: '0.96rem', lineHeight: 1.7, color: '#374151', marginBottom: 36 }}>
                      <ReactMarkdown>{curSec.content_markdown || '*No lesson content available.*'}</ReactMarkdown>
                    </div>

                    {/* Interactive Quizzes */}
                    {curSec.quizzes && curSec.quizzes.length > 0 && (
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 18, padding: '24px 28px', marginBottom: 36 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          <HelpCircle size={20} color="#059669" />
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                            Interactive Knowledge Check
                          </h3>
                        </div>

                        {curSec.quizzes.map((q, qIdx) => {
                          const qKey = `${curSec.id}_${q.id || qIdx}`;
                          const selectedOpt = nativeQuizAnswers[qKey];
                          const submitted = nativeQuizSubmitted[qKey];
                          const isCorrect = selectedOpt === q.correct_answer;

                          return (
                            <div key={q.id || qIdx} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: 18, marginBottom: 16 }}>
                              <p style={{ margin: '0 0 14px 0', fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                                {qIdx + 1}. {q.question_text}
                              </p>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {(q.options || []).map((opt, optIdx) => (
                                  <label
                                    key={optIdx}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 10,
                                      padding: '10px 14px',
                                      borderRadius: 10,
                                      background: submitted
                                        ? opt === q.correct_answer
                                          ? '#ECFDF5'
                                          : selectedOpt === opt
                                          ? '#FEF2F2'
                                          : '#F9FAFB'
                                        : selectedOpt === opt
                                        ? 'rgba(124, 58, 237, 0.08)'
                                        : '#F9FAFB',
                                      border: submitted && opt === q.correct_answer
                                        ? '1px solid #10B981'
                                        : selectedOpt === opt
                                        ? '1.5px solid var(--forge-accent)'
                                        : '1px solid #E5E7EB',
                                      cursor: submitted ? 'default' : 'pointer',
                                      color: '#111827',
                                      fontSize: '0.9rem'
                                    }}
                                  >
                                    <input
                                      type="radio"
                                      name={`native_quiz_${qKey}`}
                                      checked={selectedOpt === opt}
                                      onChange={() => !submitted && setNativeQuizAnswers(p => ({ ...p, [qKey]: opt }))}
                                      disabled={submitted}
                                      style={{ accentColor: '#7C3AED' }}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>

                              {!submitted ? (
                                <button
                                  type="button"
                                  disabled={!selectedOpt}
                                  onClick={() => setNativeQuizSubmitted(p => ({ ...p, [qKey]: true }))}
                                  className="btn btn-secondary btn-sm"
                                  style={{ marginTop: 12, fontWeight: 700 }}
                                >
                                  Check Answer
                                </button>
                              ) : (
                                <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: isCorrect ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${isCorrect ? '#A7F3D0' : '#FECACA'}`, fontSize: '0.85rem' }}>
                                  <div style={{ fontWeight: 800, color: isCorrect ? '#065F46' : '#991B1B', marginBottom: 4 }}>
                                    {isCorrect ? '✓ Correct Answer!' : '✕ Incorrect'}
                                  </div>
                                  <div style={{ color: '#4B5563' }}>
                                    {q.explanation}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Lesson Footer Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, borderTop: '1px solid #EBE4FF' }}>
                      <button
                        type="button"
                        disabled={nativeSectionIdx === 0}
                        onClick={() => setNativeSectionIdx(Math.max(0, nativeSectionIdx - 1))}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                      >
                        <ArrowLeft size={16} /> Previous Lesson
                      </button>

                      {nativeSectionIdx < course.sections.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => handleCompleteNativeSection(curSec.id, nativeSectionIdx + 1)}
                          className="btn btn-primary"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                            borderRadius: 12, fontWeight: 800, background: 'linear-gradient(135deg, #7C3AED, #6D28D9)'
                          }}
                        >
                          Complete & Next Lesson <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCompleteNativeSection(curSec.id, nativeSectionIdx)}
                          className="btn btn-primary"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 26px',
                            borderRadius: 12, fontWeight: 800, background: 'linear-gradient(135deg, #10B981, #059669)',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                          }}
                        >
                          <CheckCircle size={18} /> Complete Course & Claim Certificate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <Award size={48} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Course content is currently being prepared.</p>
          </div>
        )}
      </div>

      {/* ── Completion Celebration Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showCelebration && (
          <div className="modal-backdrop" onClick={() => setShowCelebration(false)}>
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="modal-box"
              style={{
                maxWidth: 480,
                width: '100%',
                background: '#FFFFFF',
                borderRadius: 24,
                padding: '36px 28px',
                textAlign: 'center',
                border: '1px solid #EBE4FF',
                boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: '3.6rem', marginBottom: 12 }}>🏆</div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.6rem', fontWeight: 900, color: '#111827' }}>
                Course Completed!
              </h2>
              <p style={{ margin: '0 0 20px 0', color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Congratulations, you have successfully finished <strong>{course.title}</strong>!
                Your learning record has been updated and a certificate has been generated.
              </p>

              {enrollment?.score !== undefined && enrollment?.score !== null && (
                <div
                  style={{
                    display: 'inline-block',
                    padding: '8px 24px',
                    borderRadius: 999,
                    background: '#ECFDF5',
                    color: '#059669',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    marginBottom: 24,
                    border: '1px solid #A7F3D0',
                  }}
                >
                  Score: {enrollment.score}%
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowCelebration(false)}
                  className="btn btn-ghost"
                  style={{ padding: '10px 20px', borderRadius: 12, color: '#6B7280' }}
                >
                  Continue Reviewing
                </button>
                <button
                  onClick={() => nav('/forge/transcript')}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 22px',
                    borderRadius: 12,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                  }}
                >
                  View Certificate →
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
