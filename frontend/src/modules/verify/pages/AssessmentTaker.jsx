import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import {
  Camera, Shield, AlertTriangle, CheckCircle, Clock, Play,
  ChevronRight, ChevronLeft, Send, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  isValidEmail,
  isValidPhone,
  isValidURL,
  isPositiveNumber
} from '../../../core/utils/validators';

export default function AssessmentTaker({ assessmentId: propAsmId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const asmId = propAsmId || params.get('asm_id');

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // States
  const [step, setStep] = useState('setup'); // setup, taking, finished
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Test state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [proctoringEvents, setProctoringEvents] = useState([]);
  const pgEvents = useRef([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const startTimeRef = useRef(null);
  const [errors, setErrors] = useState({});
  
  // Proctoring Refs
  const strikes = useRef(0);
  const PROCTORING_START_GRACE_MS = 8000;
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const faceDetectorRef = useRef(null);
  
  const violationCooldownsRef = useRef({});
  const lastStrikeTime = useRef(0);
  const seenFaceOnceRef = useRef(false);
  
  const audioCalibrationRef = useRef({ samples: [], baseline: 0 });
  const audioViolationTimer = useRef(null);
  const cameraViolationTimer = useRef(null);
  const cameraTrackViolationTimer = useRef(null);
  const motionViolationTimer = useRef(null);
  const multipleFacesTimerRef = useRef(null);
  const backgroundMovementTimer = useRef(null);

  const handleCheatAttemptRef = useRef(null);
  const submitRef = useRef(null);

  useEffect(() => {
    if (!asmId) return;
    setLoading(true);
    fetch(`/api/verify/builder/assessments/${asmId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAssessment(d.data);
          setTimeLeft(d.data.time_limit_minutes * 60);
        } else {
          toast.error('Failed to load assessment');
        }
      })
      .finally(() => setLoading(false));
  }, [asmId]);

  // Timer
  useEffect(() => {
    if (step === 'taking' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timer);
            submitRef.current?.(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const captureScreenshot = useCallback((label = 'Snapshot') => {
    if (videoRef.current && canvasRef.current) {
      const vid = videoRef.current;
      const can = canvasRef.current;
      if (vid.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        can.width = vid.videoWidth || 640; 
        can.height = vid.videoHeight || 480;
        const ctx = can.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(vid, 0, 0, can.width, can.height);
        const dataUrl = can.toDataURL('image/jpeg', 0.5);
        const evt = { type: 'screenshot', details: dataUrl, timestamp: new Date().toISOString() };
        pgEvents.current.push(evt);
        setProctoringEvents(prev => [...prev, evt]);
      }
    }
  }, []);

  const handleProctoringViolation = useCallback(async (actionName, eventType = 'proctoring_violation', cooldownMs = 15000) => {
    if (step !== 'taking' || submittingRef.current) return false;
    
    const startedAt = startTimeRef.current || 0;
    if (startedAt && (Date.now() - startedAt) < PROCTORING_START_GRACE_MS) return false;

    const now = Date.now();
    const lastForThisViolation = violationCooldownsRef.current[actionName] || 0;
    if (now - lastForThisViolation < cooldownMs) return false;   // blocked by per-violation cooldown
    if (now - lastStrikeTime.current < 1000) return false;        // min 1s between any two strikes
    
    violationCooldownsRef.current[actionName] = now;
    lastStrikeTime.current = now;

    strikes.current++;
    captureScreenshot(`Cheat: ${actionName}`);

    const detailStr = actionName;
    const evt = {
      type: eventType,
      timestamp: new Date().toISOString(),
      details: detailStr
    };
    pgEvents.current.push(evt);
    setProctoringEvents(prev => [...prev, evt]);

    // Capture audio snippet for audio-related violations
    if (streamRef.current && (actionName.includes('Audio') || actionName.includes('Speaking') || actionName.includes('Voice') || actionName.includes('Murmur'))) {
      try {
        const recorder = new MediaRecorder(streamRef.current);
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
             const audioEvt = { type: 'audio_snippet', details: reader.result, timestamp: new Date().toISOString() };
             pgEvents.current.push(audioEvt);
             setProctoringEvents(prev => [...prev, audioEvt]);
          };
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 3000);
      } catch (e) { console.error('Snippet capture failed:', e); }
    }

    try {
      const r = await fetch(`/api/verify/assignments/${asmId}/record-strike`, {
        method: 'POST', credentials: 'include'
      });
      const d = await r.json();
      if (d.data?.terminated_by_proctor) {
        toast.error('Assessment terminated due to excessive proctoring violations.', { duration: 5000 });
        submitRef.current?.(true);
      } else {
        toast.error(`Warning: ${detailStr}!`, { icon: '⚠️', duration: 4000 });
      }
    } catch(e){}
    return true;
  }, [step, asmId, captureScreenshot]);

  useEffect(() => { submitRef.current = handleSubmit; }, [answers, proctoringEvents]); // will define handleSubmit later properly, just a ref sync
  useEffect(() => { handleCheatAttemptRef.current = handleProctoringViolation; }, [handleProctoringViolation]);

  // Periodic screenshots
  useEffect(() => {
    if (step !== 'taking') return;
    const t0 = setTimeout(() => captureScreenshot('Initial Snapshot'), 5000);
    const t1 = setInterval(() => captureScreenshot('Periodic Screenshot'), 60000);
    return () => { clearTimeout(t0); clearInterval(t1); };
  }, [step, captureScreenshot]);

  // Tab & Fullscreen monitors
  useEffect(() => {
    if (step !== 'taking') return;
    const handleVisibility = () => {
      if (document.hidden) handleProctoringViolation('Tab switching');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) handleProctoringViolation('Exiting fullscreen');
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [step, handleProctoringViolation]);

  // Advanced Computer Vision & Audio Analysis Loop
  useEffect(() => {
    if (step !== 'taking') return;

    // Auto-seed seenFaceOnceRef after 10 s
    const seedTimer = setTimeout(() => {
      if (!seenFaceOnceRef.current) seenFaceOnceRef.current = true;
    }, 10000);

    // Initialise native FaceDetector (Chrome, behind flag)
    if ('FaceDetector' in window && !faceDetectorRef.current) {
      try { faceDetectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 4 }); }
      catch (_) { faceDetectorRef.current = null; }
    }

    // LAYER 1: SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = '';
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const last = event.results[event.results.length - 1];
        const transcript = (last[0]?.transcript || '').trim();
        if (!transcript) return;
        const highConfidenceInterim = !last.isFinal && (last[0]?.confidence || 0) >= 0.85 && transcript.length >= 3;
        if (last.isFinal || highConfidenceInterim) {
          handleCheatAttemptRef.current?.('Speaking Detected During Assessment', 'audio_detected', 8000);
        }
      };
      recognition.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('SR error:', e.error);
      };
      recognition.onend = () => { try { recognition.start(); } catch (_) {} };
      try { recognition.start(); } catch (_) {}
      speechRecognitionRef.current = recognition;
    }

    // LAYER 2: Web Audio (every 500ms)
    const audioInterval = setInterval(() => {
      if (!analyserRef.current || !audioCtxRef.current) return;
      const fftSize = analyserRef.current.fftSize;
      const sampleRate = audioCtxRef.current?.sampleRate || 44100;
      const binHz = sampleRate / fftSize;
      const voiceLow  = Math.floor(300  / binHz);
      const voiceHigh = Math.floor(3400 / binHz);
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(buf);
      const voiceBand  = buf.slice(voiceLow, voiceHigh + 1);
      const voiceAvg   = voiceBand.reduce((a, b) => a + b, 0) / voiceBand.length;
      const activeBins = voiceBand.filter(v => v > 20).length;
      const voiceRatio = activeBins / voiceBand.length;
      const timeBuf    = new Uint8Array(analyserRef.current.fftSize);
      analyserRef.current.getByteTimeDomainData(timeBuf);
      let rmsSum = 0;
      for (const s of timeBuf) { const c = (s - 128) / 128; rmsSum += c * c; }
      const rms = Math.sqrt(rmsSum / timeBuf.length);

      const cal = audioCalibrationRef.current;
      if (cal.samples.length < 8) {
        cal.samples.push(voiceAvg);
        cal.baseline = cal.samples.reduce((a, b) => a + b, 0) / cal.samples.length;
        return;
      }
      const baseline = cal.baseline || 0;
      const energeticVoice = voiceAvg > Math.max(baseline + 18, 24) && voiceRatio > 0.25;
      const loudMicActivity = voiceAvg > Math.max(baseline + 14, 20) && rms > 0.07;
      const isVoiceLike = energeticVoice || loudMicActivity;

      if (isVoiceLike) {
        if (!audioViolationTimer.current) audioViolationTimer.current = Date.now();
        if (Date.now() - audioViolationTimer.current > 1500) {
          const fired = handleCheatAttemptRef.current?.('Voice / Audio Detected Near Microphone', 'audio_detected', 8000);
          if (fired) audioViolationTimer.current = null;
        }
      } else {
        audioViolationTimer.current = null;
        cal.baseline = baseline * 0.97 + voiceAvg * 0.03;
      }
    }, 500);

    // LAYER 3 & 4: CV / FACE (every 1800ms)
    const cvInterval = setInterval(async () => {
      const vid = videoRef.current;
      const videoTrack = streamRef.current?.getVideoTracks?.()[0];
      const trackDead = !videoTrack || videoTrack.readyState !== 'live' || videoTrack.muted || !videoTrack.enabled;

      if (trackDead) {
        if (!cameraTrackViolationTimer.current) cameraTrackViolationTimer.current = Date.now();
        if (Date.now() - cameraTrackViolationTimer.current > 1500) {
          handleCheatAttemptRef.current?.('Camera Disabled or Unavailable', 'camera_disabled', 15000);
          cameraTrackViolationTimer.current = null;
        }
        return;
      }
      cameraTrackViolationTimer.current = null;
      if (!vid || vid.readyState < 2 || vid.videoWidth === 0) return;

      const can = canvasRef.current;
      if (!can) return;
      const ctx = can.getContext('2d', { willReadFrequently: true });
      const W = 160, H = 120;
      can.width = W; can.height = H;
      ctx.drawImage(vid, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;

      let brightness = 0;
      for (let i = 0; i < data.length; i += 4) brightness += (data[i] + data[i+1] + data[i+2]) / 3;
      const avgBright = brightness / (W * H);

      if (avgBright < 15) {
        if (!cameraViolationTimer.current) cameraViolationTimer.current = Date.now();
        if (Date.now() - cameraViolationTimer.current > 2000) {
          handleCheatAttemptRef.current?.('Camera Obstructed / Covered', 'camera_obstructed', 15000);
          cameraViolationTimer.current = null;
        }
      } else {
        cameraViolationTimer.current = null;
      }

      // Skin-pixel analysis
      const faceZoneH = Math.floor(H * 0.70);
      const skinHistogram = new Array(W).fill(0);
      let totalSkinPixels = 0;
      let centerSkinPixels = 0;
      const cStartX = Math.floor(W * 0.20);
      const cEndX   = Math.floor(W * 0.80);

      for (let i = 0; i < data.length; i += 4) {
        const px = i / 4, x = px % W, y = Math.floor(px / W);
        if (y >= faceZoneH) continue;
        const r = data[i], g = data[i+1], b = data[i+2];
        const isSkin = (
          r > 50 && g > 20 && b > 10 &&
          r > g && r > b &&
          (r - Math.min(g, b)) > 10 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 10
        );
        if (isSkin) {
          skinHistogram[x]++;
          totalSkinPixels++;
          if (x >= cStartX && x < cEndX) centerSkinPixels++;
        }
      }

      const overallRatio = totalSkinPixels / (W * faceZoneH);
      
      // Native FaceDetector
      if (faceDetectorRef.current && vid.readyState >= 2) {
        try {
          const faces = await faceDetectorRef.current.detect(vid);
          const frameArea = (vid.videoWidth || 1) * (vid.videoHeight || 1);
          const sigFaces = faces.filter(f => {
            const box = f.boundingBox;
            if (!box) return false;
            return (box.width * box.height) / frameArea >= 0.030;
          });

          if (sigFaces.length >= 1) {
            seenFaceOnceRef.current = true;
            motionViolationTimer.current = null;
          } else if (seenFaceOnceRef.current) {
            if (!motionViolationTimer.current) motionViolationTimer.current = Date.now();
            else if (Date.now() - motionViolationTimer.current > 7000) {
              handleCheatAttemptRef.current?.('Face Not Visible — Please Stay in Frame', 'person_not_visible', 12000);
              captureScreenshot('Face Not Visible');
              motionViolationTimer.current = null;
            }
          }

          if (sigFaces.length >= 2) {
            if (!multipleFacesTimerRef.current) multipleFacesTimerRef.current = Date.now();
            else if (Date.now() - multipleFacesTimerRef.current > 5000) {
              handleCheatAttemptRef.current?.(`Multiple People in Camera (${sigFaces.length} faces)`, 'proctoring_violation', 45000);
              multipleFacesTimerRef.current = null;
            }
          } else {
            multipleFacesTimerRef.current = null;
          }
          return;
        } catch (_) { }
      }

      // Pixel-heuristic Fallback
      const facePresent = avgBright > 12 && overallRatio > 0.007;
      const faceMissing = avgBright > 16 && overallRatio < 0.003;

      if (facePresent) {
        seenFaceOnceRef.current = true;
        motionViolationTimer.current = null;
      } else if (seenFaceOnceRef.current && faceMissing) {
        if (!motionViolationTimer.current) motionViolationTimer.current = Date.now();
        else if (Date.now() - motionViolationTimer.current > 7000) {
          handleCheatAttemptRef.current?.('Face Not Visible — Please Stay in Frame', 'person_not_visible', 12000);
          captureScreenshot('Face Not Visible');
          motionViolationTimer.current = null;
        }
      } else if (!faceMissing) {
        motionViolationTimer.current = null;
      }

      const smoothed = [...skinHistogram];
      for (let x = 2; x < W - 2; x++) {
        smoothed[x] = (skinHistogram[x-2] + skinHistogram[x-1] + skinHistogram[x] + skinHistogram[x+1] + skinHistogram[x+2]) / 5;
      }

      const peakThreshold = faceZoneH * 0.20;
      const peaks = [];
      let inPeak = false, pkStart = 0;
      for (let x = 0; x < W; x++) {
        if (smoothed[x] > peakThreshold) {
          if (!inPeak) { inPeak = true; pkStart = x; }
        } else if (inPeak) {
          inPeak = false;
          peaks.push({ start: pkStart, end: x, width: x - pkStart });
        }
      }
      if (inPeak) peaks.push({ start: pkStart, end: W, width: W - pkStart });

      const MIN_PEAK_W = 20;
      const MAX_PEAK_W = 70;
      const facePeaks = peaks.filter(p => p.width >= MIN_PEAK_W && p.width <= MAX_PEAK_W);
      const MIN_GAP_PX = Math.floor(W * 0.20);
      let hasWellSeparatedPair = false;
      for (let i = 0; i < facePeaks.length - 1; i++) {
        if (facePeaks[i + 1].start - facePeaks[i].end >= MIN_GAP_PX) {
          hasWellSeparatedPair = true;
          break;
        }
      }

      if (hasWellSeparatedPair && avgBright > 16 && overallRatio > 0.05) {
        if (!backgroundMovementTimer.current) backgroundMovementTimer.current = Date.now();
        else if (Date.now() - backgroundMovementTimer.current > 6000) {
          handleCheatAttemptRef.current?.('Multiple People Detected in Camera', 'proctoring_violation', 45000);
          backgroundMovementTimer.current = null;
        }
      } else {
        backgroundMovementTimer.current = null;
      }
    }, 1800);

    return () => {
      clearTimeout(seedTimer);
      clearInterval(audioInterval);
      clearInterval(cvInterval);
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onend = null;
        try { speechRecognitionRef.current.abort(); } catch (_) {}
        speechRecognitionRef.current = null;
      }
      audioViolationTimer.current = null;
      cameraViolationTimer.current = null;
      cameraTrackViolationTimer.current = null;
      motionViolationTimer.current = null;
      multipleFacesTimerRef.current = null;
      backgroundMovementTimer.current = null;
    };
  }, [step]);


  const requestCamera = async () => {
    try {
      setCameraError('');
      const str = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(str);
      streamRef.current = str;
      if (videoRef.current) {
        videoRef.current.srcObject = str;
      }
    } catch (e) {
      setCameraError('Camera and Microphone access denied or unavailable. This assessment requires both to proceed.');
    }
  };

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [step, stream]);

  const startAssessment = async () => {
    if (!stream) {
      toast.error('Camera & Mic access required to start');
      return;
    }
    
    // Initialize Web Audio Context requiring user gesture
    if (!audioCtxRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        await ctx.resume();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch (e) {
        console.warn('Audio Context failed to start', e);
      }
    }

    try {
      const r = await fetch(`/api/verify/assignments/${asmId}/start-session`, {
        method: 'POST',
        credentials: 'include'
      });
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen rejected by browser', e));
      }
      setStep('taking');
      startTimeRef.current = Date.now();
    } catch (e) {
      toast.error('Failed to start session');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // ── Validation for submission ──
  const validateAnswers = () => {
    const newErrors = {};
    if (!assessment || !assessment.questions) return true;
    assessment.questions.forEach((q, index) => {
      const answer = answers[q.id];
      if (answer && (typeof answer === 'string' && !answer.trim())) {
        newErrors[q.id] = `Question ${index + 1} requires an answer`;
      }
      if (q.question_type === 'file_upload') {
        if (answer instanceof File) {
          const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          const maxSize = 10 * 1024 * 1024;
          if (!allowedTypes.includes(answer.type)) {
            newErrors[q.id] = `File type not allowed for Question ${index + 1}. Please upload PDF, JPEG, PNG, WebP, DOC, or DOCX.`;
          }
          if (answer.size > maxSize) {
            newErrors[q.id] = `File size exceeds 10MB limit for Question ${index + 1}`;
          }
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit && !window.confirm('Are you sure you want to submit?')) return;
    
    // ── Run validation before submit ──
    if (!autoSubmit && !validateAnswers()) {
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        toast.error(errors[firstError]);
        const questionIndex = assessment.questions.findIndex(q => q.id === firstError);
        if (questionIndex !== -1) setCurrentQ(questionIndex);
      }
      return;
    }
    
    setIsSubmitting(true);
    submittingRef.current = true;
    stopCamera();

    const timeTaken = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    const isMalpractice = strikes.current > 5 || autoSubmit === true && strikes.current > 0;

    try {
      const r = await fetch('/api/verify/submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: parseInt(asmId),
          answers,
          time_taken_seconds: timeTaken,
          proctoring_events: pgEvents.current,
          is_malpractice: isMalpractice
        })
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success('Assessment submitted successfully!');
        setStep('finished');
        if (assessment.show_result_immediately) {
          navigate(`/verify?tab=result&result_id=${d.data.result_id}`);
        } else {
          navigate('/verify?tab=candidate');
        }
      } else {
        toast.error(d.detail || 'Submission failed');
      }
    } catch (e) {
      toast.error('Failed to submit. Please contact support.');
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(e => console.log(e));
      }
    }
  };
  
  // Connect the ref
  useEffect(() => { submitRef.current = handleSubmit; }, [handleSubmit]);

  // Helper to render error message
  const renderError = (questionId) => {
    if (errors[questionId]) {
      return <p className="text-red-500 text-xs font-medium mt-2">{errors[questionId]}</p>;
    }
    return null;
  };

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-purple-600" /></div>;
  if (!assessment) return <div className="p-10 text-center text-gray-400">Assessment not found</div>;

  if (step === 'setup') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6 pt-10">
        <div className="text-center mb-4">
          <Shield size={40} className="text-purple-600 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl font-bold text-gray-800">{assessment.title}</h1>
          <p className="text-gray-500 mt-2">{assessment.description}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-purple-600 border-b border-purple-200 pb-4">Proctoring Setup</h2>
          
          <div className="bg-gray-50 border border-gray-200 rounded-xl aspect-video relative overflow-hidden flex items-center justify-center">
            {stream ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            ) : (
              <div className="text-center">
                <Camera size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-xs font-medium text-gray-400">Camera Preview</p>
              </div>
            )}
            {!stream && (
              <button onClick={requestCamera} className="absolute bottom-6 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-xs font-medium">
                Enable Camera
              </button>
            )}
          </div>
          
          {cameraError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex gap-3 text-rose-600">
              <AlertTriangle size={18} className="shrink-0" />
              <p className="text-xs font-medium leading-relaxed">{cameraError}</p>
            </div>
          )}

          <ul className="space-y-3 text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl">
            <li className="flex gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Ensure you are in a well-lit room.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Do not switch tabs or minimize the window.</li>
            <li className="flex gap-2"><CheckCircle size={14} className="text-emerald-500 shrink-0"/> Time limit: {assessment.time_limit_minutes} minutes.</li>
          </ul>

          <button 
            onClick={startAssessment}
            disabled={!stream} 
            className="w-full py-4 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:hover:bg-purple-600"
          >
            Start Assessment
          </button>
        </div>
      </div>
    );
  }

  const q = assessment.questions[currentQ];
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Top Bar */}
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 rounded border border-gray-200 overflow-hidden relative bg-gray-100">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] opacity-50" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-sm font-semibold text-gray-800 truncate max-w-sm">{assessment.title}</h2>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-sm font-bold ${timeLeft < 300 ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
          <Clock size={16} />
          {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col md:flex-row">
        {/* Left Sidebar - Question List */}
        <div className="md:w-64 bg-gray-50 border-r border-gray-200 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Questions</h3>
          <div className="grid grid-cols-4 gap-2">
            {assessment.questions.map((_, i) => {
              const hasError = errors[assessment.questions[i].id];
              const isAnswered = answers[assessment.questions[i].id] && 
                (typeof answers[assessment.questions[i].id] === 'string' ? 
                  answers[assessment.questions[i].id].trim() : 
                  true);
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-colors relative ${
                    currentQ === i 
                      ? hasError ? 'bg-red-500 text-white' : 'bg-purple-600 text-white'
                      : isAnswered 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                        : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                  {hasError && currentQ !== i && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center">!</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${errors[q.id] ? 'bg-red-50 text-red-600 border-red-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
              Question {currentQ + 1} of {assessment.questions.length}
              {errors[q.id] && ' ⚠️'}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {q.marks} Points | {q.question_type}
            </span>
          </div>

          <div className="mb-8 text-gray-800 leading-relaxed font-medium">
            <div className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                {q.question_text}
              </ReactMarkdown>
            </div>
            {renderError(q.id)}
          </div>

          {/* MCQ Answer Input */}
          {q.question_type === 'mcq' && (
            <div className="space-y-3">
              {(q.options || []).map((opt, i) => (
                <label 
                  key={i} 
                  onClick={() => {
                    setAnswers({ ...answers, [q.id]: opt });
                    if (errors[q.id]) {
                      const newErrors = { ...errors };
                      delete newErrors[q.id];
                      setErrors(newErrors);
                    }
                  }}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${answers[q.id] === opt ? 'bg-purple-50 border-purple-300 text-gray-800' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${answers[q.id] === opt ? 'border-purple-600' : 'border-gray-300'}`}>
                    {answers[q.id] === opt && <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                  </div>
                  <span className="text-sm font-medium">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {/* Written Answer Input */}
          {q.question_type === 'written' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={e => {
                setAnswers({ ...answers, [q.id]: e.target.value });
                // Clear error for this question when user types
                if (errors[q.id]) {
                  const newErrors = { ...errors };
                  delete newErrors[q.id];
                  setErrors(newErrors);
                }
              }}
              placeholder="Type your answer here..."
              className={`w-full bg-gray-50 border ${errors[q.id] ? 'border-red-400' : 'border-gray-200'} rounded-xl p-5 text-sm text-gray-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all min-h-[300px] resize-y`}
            />
          )}

          {/* Coding Challenge Input */}
          {q.question_type === 'coding' && (
            <div className="flex flex-col h-[500px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <div className="bg-gray-100 px-4 py-2 flex justify-between items-center border-b border-gray-200">
                <span className="text-xs font-semibold text-purple-600">{q.programming_language || 'javascript'}</span>
              </div>
              <div className={`flex-1 ${errors[q.id] ? 'border-2 border-red-400' : ''}`}>
                <Editor
                  height="100%"
                  language={(q.programming_language || 'javascript').toLowerCase()}
                  theme="vs-dark"
                  value={answers[q.id] !== undefined ? answers[q.id] : (q.starter_code || '')}
                  onChange={(val) => {
                    setAnswers({ ...answers, [q.id]: val });
                    if (errors[q.id]) {
                      const newErrors = { ...errors };
                      delete newErrors[q.id];
                      setErrors(newErrors);
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    scrollBeyondLastLine: false,
                    padding: { top: 16 }
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Bottom Navigation */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between">
            <button
              onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
              disabled={currentQ === 0}
              className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:hover:bg-gray-100 flex items-center gap-2"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            {currentQ === assessment.questions.length - 1 ? (
              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <><Send size={16} /> Submit Assessment</>}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQ(q => Math.min(assessment.questions.length - 1, q + 1))}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                Next <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
