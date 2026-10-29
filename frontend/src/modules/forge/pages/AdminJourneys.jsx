import React, { useEffect, useState } from 'react';
import { journeyApi, forgeApi } from '../../../core/api/forgeApi';
import { verifyApi } from '../../../core/api/verifyApi';
import {
  Plus, Trash2, ChevronRight, BookOpen, ShieldCheck, Layers,
  Save, X, Edit2, Clock, Users, ArrowUp, ArrowDown, Search,
  CheckCircle, AlertCircle, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../core/auth/AuthContext';
import { P } from '../../../core/permissions';
import AssignJourneyModal from '../components/AssignJourneyModal';
import ForgeHeader from '../components/ForgeHeader';
import BannerCard from '../components/BannerCard';
import '../styles/forge.css';

export default function AdminJourneys({ embedded = false }) {
  const { user, hasPermission, hasRole } = useAuth();
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Builder Modal / Form State
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState([]); // { type, reference_id, title }

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [activeJourney, setActiveJourney] = useState(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [journeyToDelete, setJourneyToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Available steps picker data
  const [availableAssessments, setAvailableAssessments] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTab, setPickerTab] = useState('courses'); // 'courses' | 'assessments'
  const [saving, setSaving] = useState(false);

  const canEdit =
    hasPermission(P.FORGE_COURSES_MANAGE) ||
    hasRole(['hr', 'org_admin', 'super_admin', 'manager']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jRes, aRes, cRes] = await Promise.all([
        journeyApi.listJourneys().catch(() => ({ data: { data: [] } })),
        verifyApi.getAssessments().catch(() => ({ data: { data: [] } })),
        forgeApi.listCourses().catch(() => ({ data: { data: [] } })),
      ]);

      setJourneys(jRes.data?.data || []);

      const aData = aRes.data?.data || aRes.data || [];
      setAvailableAssessments(Array.isArray(aData) ? aData : []);

      const cData = cRes.data?.data || cRes.data || [];
      setAvailableCourses(Array.isArray(cData) ? cData : []);
    } catch (err) {
      toast.error('Failed to load journeys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAssignModal = (journey) => {
    setActiveJourney(journey);
    setShowAssignModal(true);
  };

  const openEdit = async (journey) => {
    setLoading(true);
    try {
      const res = await journeyApi.getJourney(journey.id);
      const data = res.data.data;
      setTitle(data.title || '');
      setDescription(data.description || '');
      setSteps(data.steps || []);
      setEditingId(journey.id);
      setShowCreate(true);
    } catch {
      toast.error('Failed to load journey details');
    } finally {
      setLoading(false);
    }
  };

  const addStep = (type, item) => {
    if (steps.find((s) => s.type === type && s.reference_id === item.id)) {
      toast.error(`"${item.title}" is already in this journey.`);
      return;
    }
    setSteps([...steps, { type, reference_id: item.id, title: item.title }]);
  };

  const removeStep = (index) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const newSteps = [...steps];
    const [moved] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, moved);
    setSteps(newSteps);
  };

  const handleSaveJourney = async () => {
    if (!title.trim()) return toast.error('Journey name is required.');
    if (steps.length === 0) return toast.error('Please add at least one step to the journey.');

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        steps: steps.map((s, i) => ({
          type: s.type,
          reference_id: s.reference_id,
          order_index: i,
        })),
      };

      if (editingId) {
        await journeyApi.updateJourney(editingId, payload);
        toast.success('Journey updated successfully!');
      } else {
        await journeyApi.createJourney(payload);
        toast.success('Journey created successfully!');
      }

      setShowCreate(false);
      resetForm();
      loadData();
    } catch {
      toast.error(editingId ? 'Failed to update journey' : 'Failed to create journey');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJourney = async () => {
    if (!journeyToDelete) return;
    setDeleting(true);
    try {
      await journeyApi.deleteJourney(journeyToDelete.id);
      toast.success(`Journey "${journeyToDelete.title}" deleted.`);
      setShowDeleteModal(false);
      setJourneyToDelete(null);
      loadData();
    } catch {
      toast.error('Failed to delete journey');
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSteps([]);
    setEditingId(null);
    setPickerSearch('');
  };

  const filteredCourses = availableCourses.filter(
    (c) => !pickerSearch || (c.title && c.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  );
  const filteredAssessments = availableAssessments.filter(
    (a) => !pickerSearch || (a.title && a.title.toLowerCase().includes(pickerSearch.toLowerCase()))
  );

  return (
    <div
      className={embedded ? 'space-y-8 animate-fade-in-up' : 'forge-container forge-grain'}
      style={embedded ? {} : { minHeight: '100vh', padding: '0 0 80px' }}
    >
      {!embedded && <ForgeHeader />}

      <div style={embedded ? {} : { padding: '0 40px' }}>
        {/* ── Banner ───────────────────────────────────────────────────────── */}
        <BannerCard
          eyebrow="CAREER PATHWAYS & SEQUENCES"
          title="Learning Journeys"
          subtitle="Build sequential learning tracks combining skill verification assessments and interactive training courses."
          rightContent={
            !showCreate && (
              <button
                className="px-6 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 hover:opacity-90 transition-all shadow-md"
                onClick={() => {
                  resetForm();
                  setShowCreate(true);
                }}
              >
                <Plus size={16} /> Create New Journey
              </button>
            )
          }
        />

        {/* ── Main Canvas ──────────────────────────────────────────────────── */}
        {showCreate ? (
          /* ══════════════════════════════════════════════════════════════════
              JOURNEY PIPELINE BUILDER
          ══════════════════════════════════════════════════════════════════ */
          <div
            className="card animate-scale-up"
            style={{
              maxWidth: 1040,
              margin: '0 auto',
              padding: 0,
              borderRadius: 24,
              overflow: 'hidden',
              background: '#ffffff',
              border: '1px solid #ebe4ff',
              boxShadow: '0 20px 50px rgba(180, 140, 255, 0.1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px 32px',
                background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={22} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                    {editingId ? 'Update Learning Journey' : 'Build New Learning Journey'}
                  </h3>
                  <p style={{ margin: '2px 0 0 0', opacity: 0.85, fontSize: '0.82rem' }}>
                    Assemble courses and skill assessments into an ordered curriculum.
                  </p>
                </div>
              </div>
              <button
                className="btn-icon"
                onClick={() => setShowCreate(false)}
                style={{ color: 'white', background: 'rgba(255, 255, 255, 0.15)', borderRadius: 12, width: 36, height: 36 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 32 }}>
              {/* Journey Title & Description */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 2fr',
                  gap: 20,
                  marginBottom: 32,
                  paddingBottom: 24,
                  borderBottom: '1px solid #f0ecff',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 8 }}>
                    Journey Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Cybersecurity Onboarding Track"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{ height: 46, borderRadius: 12, fontWeight: 700, fontSize: '0.95rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280', marginBottom: 8 }}>
                    Purpose & Description
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Summarize the career outcomes or objectives..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={{ height: 46, borderRadius: 12, fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* 2-Column: Left Components Discovery | Right Sequenced Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 32 }}>
                {/* Left: Component Discovery */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7c3aed' }}>
                      Add Components
                    </h4>
                  </div>

                  {/* Tabs: Courses vs Assessments */}
                  <div style={{ display: 'flex', background: '#f3f0ff', padding: 4, borderRadius: 12, marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => setPickerTab('courses')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: pickerTab === 'courses' ? '#ffffff' : 'transparent',
                        color: pickerTab === 'courses' ? '#7c3aed' : '#6b7280',
                        boxShadow: pickerTab === 'courses' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <BookOpen size={13} style={{ display: 'inline', marginRight: 6 }} />
                      Courses ({availableCourses.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickerTab('assessments')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 10,
                        border: 'none',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: pickerTab === 'assessments' ? '#ffffff' : 'transparent',
                        color: pickerTab === 'assessments' ? '#7c3aed' : '#6b7280',
                        boxShadow: pickerTab === 'assessments' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <ShieldCheck size={13} style={{ display: 'inline', marginRight: 6 }} />
                      Verify ({availableAssessments.length})
                    </button>
                  </div>

                  {/* Search within picker */}
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Search ${pickerTab === 'courses' ? 'courses' : 'assessments'}...`}
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      style={{ paddingLeft: 34, height: 38, borderRadius: 10, fontSize: '0.8rem' }}
                    />
                  </div>

                  {/* Component Items List */}
                  <div
                    style={{
                      maxHeight: 340,
                      overflowY: 'auto',
                      border: '1px solid #ebe4ff',
                      borderRadius: 14,
                      padding: 6,
                      background: '#faf8ff',
                    }}
                  >
                    {pickerTab === 'courses' ? (
                      filteredCourses.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                          No courses available.
                        </div>
                      ) : (
                        filteredCourses.map((c) => {
                          const isAlreadyAdded = steps.some((s) => s.type === 'forge' && s.reference_id === c.id);
                          return (
                            <div
                              key={c.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                margin: '3px 0',
                                borderRadius: 10,
                                background: isAlreadyAdded ? '#f3f4f6' : '#ffffff',
                                border: '1px solid #f0ecff',
                                opacity: isAlreadyAdded ? 0.6 : 1,
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#111827' }} className="truncate">
                                  {c.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#3B82F6', fontWeight: 700 }}>
                                  SCORM Course · {c.domain_name || 'General'}
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={isAlreadyAdded}
                                onClick={() => addStep('forge', c)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: isAlreadyAdded ? '#e5e7eb' : '#7c3aed',
                                  color: isAlreadyAdded ? '#9ca3af' : 'white',
                                  fontWeight: 800,
                                  fontSize: '0.72rem',
                                  cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Plus size={12} /> {isAlreadyAdded ? 'Added' : 'Add'}
                              </button>
                            </div>
                          );
                        })
                      )
                    ) : filteredAssessments.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem' }}>
                        No assessments available.
                      </div>
                    ) : (
                      filteredAssessments.map((a) => {
                        const isAlreadyAdded = steps.some((s) => s.type === 'verify' && s.reference_id === a.id);
                        return (
                          <div
                            key={a.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              margin: '3px 0',
                              borderRadius: 10,
                              background: isAlreadyAdded ? '#f3f4f6' : '#ffffff',
                              border: '1px solid #f0ecff',
                              opacity: isAlreadyAdded ? 0.6 : 1,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#111827' }} className="truncate">
                                {a.title}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 700 }}>
                                Verify Assessment
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isAlreadyAdded}
                              onClick={() => addStep('verify', a)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: isAlreadyAdded ? '#e5e7eb' : '#7c3aed',
                                color: isAlreadyAdded ? '#9ca3af' : 'white',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Plus size={12} /> {isAlreadyAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right: The Pipeline Sequence Track */}
                <div
                  style={{
                    background: '#faf8ff',
                    borderRadius: 20,
                    padding: 24,
                    border: '1px solid #ebe4ff',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#111827' }}>
                        Curriculum Sequence
                      </h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#6b7280' }}>
                        Employees must finish each step in order to unlock the next.
                      </p>
                    </div>
                    <span
                      style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: '#ede9fe',
                        color: '#7c3aed',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {steps.length} Steps
                    </span>
                  </div>

                  {steps.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 40,
                        border: '2px dashed #ddd6fe',
                        borderRadius: 16,
                        background: '#ffffff',
                      }}
                    >
                      <Layers size={36} color="#7c3aed" style={{ opacity: 0.5, marginBottom: 8 }} />
                      <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>Pipeline is empty</div>
                      <p style={{ color: '#6b7280', fontSize: '0.78rem', margin: '4px 0 0 0' }}>
                        Click "+ Add" on any course or assessment on the left to sequence it.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 340 }}>
                      {steps.map((step, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#ffffff',
                            padding: '12px 16px',
                            borderRadius: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            border: '1px solid #ebe4ff',
                          }}
                        >
                          {/* Step number badge */}
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: step.type === 'verify' ? '#fee2e2' : '#dbeafe',
                              color: step.type === 'verify' ? '#dc2626' : '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827' }} className="truncate">
                              {step.title}
                            </div>
                            <div
                              style={{
                                fontSize: '0.68rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontWeight: 800,
                                color: step.type === 'verify' ? '#dc2626' : '#2563eb',
                              }}
                            >
                              {step.type === 'verify' ? 'Skill Verification Step' : 'Interactive Course Step'}
                            </div>
                          </div>

                          {/* Reordering and remove actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === 0}
                              onClick={() => moveStep(idx, -1)}
                              title="Move up"
                              style={{ width: 28, height: 28, borderRadius: 6, opacity: idx === 0 ? 0.3 : 1 }}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === steps.length - 1}
                              onClick={() => moveStep(idx, 1)}
                              title="Move down"
                              style={{ width: 28, height: 28, borderRadius: 6, opacity: idx === steps.length - 1 ? 0.3 : 1 }}
                            >
                              <ArrowDown size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => removeStep(idx)}
                              title="Remove step"
                              style={{ width: 28, height: 28, borderRadius: 6, color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save Footer */}
                  <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, height: 46, fontSize: '0.9rem', borderRadius: 12, fontWeight: 800, background: '#7c3aed' }}
                      onClick={handleSaveJourney}
                      disabled={saving || !title.trim() || steps.length === 0}
                    >
                      {saving ? (
                        <>
                          <div className="spinner" style={{ width: 14, height: 14 }} /> Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> {editingId ? 'Update Journey' : 'Save & Deploy Journey'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowCreate(false)}
                      style={{ height: 46, borderRadius: 12, padding: '0 20px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
              JOURNEYS GRID / LIST VIEW
          ══════════════════════════════════════════════════════════════════ */
          <div>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 280, flexDirection: 'column', gap: 16 }}>
                <div className="spinner spinner-lg" />
                <p style={{ color: '#6b7280', fontWeight: 600 }}>Loading learning journeys...</p>
              </div>
            ) : journeys.length === 0 ? (
              <div
                className="card"
                style={{
                  padding: 60,
                  textAlign: 'center',
                  borderRadius: 24,
                  background: '#ffffff',
                  border: '1px solid #ebe4ff',
                  boxShadow: '0 10px 40px rgba(180,140,255,0.08)',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    background: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Layers size={32} />
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 900, fontSize: '1.4rem', color: '#111827' }}>
                  No Learning Journeys Created Yet
                </h3>
                <p style={{ color: '#6b7280', maxWidth: 460, margin: '0 auto 24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Design career pathways by sequencing skill assessments and training modules into automated progression tracks.
                </p>
                <button
                  onClick={() => {
                    resetForm();
                    setShowCreate(true);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', borderRadius: 14, fontWeight: 800, background: '#7c3aed' }}
                >
                  <Plus size={16} /> Create Your First Journey
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: 24,
                }}
              >
                {journeys.map((j) => (
                  <div
                    key={j.id}
                    className="bg-white border border-[#ebe4ff] rounded-2xl p-6 shadow-[0_10px_40px_rgba(180,140,255,0.08)] relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] flex flex-col justify-between"
                    style={{ minHeight: 260 }}
                  >
                    <div>
                      {/* Top Bar of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            background: '#ede9fe',
                            color: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Layers size={22} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {canEdit && (
                            <>
                              <button
                                className="btn-icon"
                                onClick={() => openEdit(j)}
                                title="Edit journey pipeline"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: '#f9fafb',
                                  border: '1px solid #e5e7eb',
                                  color: '#374151',
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => {
                                  setJourneyToDelete(j);
                                  setShowDeleteModal(true);
                                }}
                                title="Delete journey"
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: 'rgba(239, 68, 68, 0.08)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  color: '#ef4444',
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        style={{
                          margin: '0 0 8px 0',
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#0f172a',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {j.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.84rem',
                          color: '#64748b',
                          margin: '0 0 20px 0',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: 40,
                        }}
                      >
                        {j.description || 'Structured pathway combining assessment and training modules.'}
                      </p>

                      {/* Metadata Chips */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: '12px 0',
                          borderTop: '1px solid #f0ecff',
                          marginBottom: 16,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 800, color: '#7c3aed' }}>
                          <ShieldCheck size={15} />
                          <span>{j.steps_count || 0} Steps</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 700, color: '#374151' }}>
                          <Users size={15} color="#6b7280" />
                          <span>{j.assigned_count || 0} Enrolled</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#94a3b8', marginLeft: 'auto' }}>
                          <Clock size={13} />
                          <span>{j.created_at ? new Date(j.created_at).toLocaleDateString() : 'Active'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        paddingTop: 12,
                        borderTop: '1px solid #f0ecff',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(j)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 12,
                          border: '1px solid #e5e7eb',
                          background: '#f9fafb',
                          color: '#374151',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() => openAssignModal(j)}
                        style={{
                          padding: '9px 20px',
                          borderRadius: 12,
                          border: 'none',
                          background: '#7c3aed',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                        }}
                      >
                        Assign <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Assign Journey Modal ─────────────────────────────────────────── */}
        {showAssignModal && (
          <AssignJourneyModal
            isOpen={showAssignModal}
            onClose={() => setShowAssignModal(false)}
            journeyId={activeJourney?.id}
            journeyTitle={activeJourney?.title}
            onSuccess={loadData}
          />
        )}

        {/* ── Delete Journey Confirmation Modal ────────────────────────────── */}
        <AnimatePresence>
          {showDeleteModal && journeyToDelete && (
            <div className="modal-backdrop" onClick={() => !deleting && setShowDeleteModal(false)}>
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="modal-box"
                style={{
                  maxWidth: 460,
                  width: '100%',
                  background: '#ffffff',
                  borderRadius: 20,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: '24px 28px', borderBottom: '1px solid #fee2e2', background: '#fff5f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: '#fee2e2',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#dc2626' }}>
                        Delete Learning Journey
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>
                        Irreversible administrative action
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '24px 28px' }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#1f2937', lineHeight: 1.5 }}>
                    Are you sure you want to permanently delete{' '}
                    <strong style={{ color: '#000000' }}>"{journeyToDelete.title}"</strong>?
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#ef4444' }}>
                    This will remove the path and unassign any active employee enrollments.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={deleting}
                      onClick={() => setShowDeleteModal(false)}
                      style={{ padding: '8px 18px', borderRadius: 10 }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeleteJourney}
                      style={{
                        padding: '8px 20px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#ef4444',
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {deleting ? (
                        <>
                          <div className="spinner" style={{ width: 14, height: 14 }} /> Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={15} /> Yes, Delete
                        </>
                      )}
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
