/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../../core/api/axios';
import { usePermission } from '../../../core/permissions/usePermission';
import { 
  Folder, File, ChevronRight, Search, Upload, Trash2, CalendarDays, Loader, Plus, X, 
  LayoutGrid, List, ExternalLink, User, ArrowRightLeft, Zap, Briefcase, CheckCircle2,
  FolderPlus, MoveRight, Layers, ArrowLeft
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const PDF_LIMIT_BYTES = 30 * 1024 * 1024;
const ZIP_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

const getCandidateName = (c) => {
  if (c.full_name && c.full_name.trim() && c.full_name !== 'Unknown Candidate') return c.full_name.trim();
  if (c.name && c.name.trim() && c.name !== 'Unknown Candidate') return c.name.trim();
  if (c.resume_path) {
    const raw = c.resume_path.split('/').pop() || '';
    const clean = raw
      .replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}_/, '')
      .replace(/^[0-9a-fA-F]{32}_/, '');
    if (clean && !clean.startsWith('uuid_')) return clean;
  }
  if (c.email && !c.email.startsWith('unknown_')) {
    return c.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  return c.full_name || c.name || 'Unnamed Resume';
};

export default function ResumeRepo({ onBulkUpload, onViewProfile }) {
  const hasManagePermission = usePermission('source.candidates.manage');
  
  // Data state
  const [folders, setFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [jobRoles, setJobRoles] = useState([]);
  const [allSubfolders, setAllSubfolders] = useState([]);
  
  // Navigation state: Year -> Month (currentFolder) -> Role Sub-Folder (currentSubfolder)
  const [currentYear, setCurrentYear] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null); // Month folder: { id: "2026-09", label, year, month_num, count, unassigned_count, subfolders: [...] }
  const [currentSubfolder, setCurrentSubfolder] = useState(null); // Role subfolder: { id, name, month_year, job_role_id, job_role_title, count }
  
  // Candidates in active view
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selected, setSelected] = useState(new Set());
  
  // View controls
  const [forceFolderDate, setForceFolderDate] = useState(true);
  const [manualYears, setManualYears] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals state
  const [showFolderModal, setShowFolderModal] = useState(false); // Year / Month creation
  const [showSubfolderModal, setShowSubfolderModal] = useState(false); // Sub-folder creation
  const [showMoveModal, setShowMoveModal] = useState(false); // Move resumes
  const [showScoreModal, setShowScoreModal] = useState(false); // Score subfolder resumes

  // Subfolder creation form state
  const [newSubfolderType, setNewSubfolderType] = useState('role'); // 'role' | 'custom'
  const [selectedJobRoleId, setSelectedJobRoleId] = useState('');
  const [customSubfolderName, setCustomSubfolderName] = useState('');
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);

  // Move form state
  const [targetMoveMonth, setTargetMoveMonth] = useState('');
  const [targetMoveFolderId, setTargetMoveFolderId] = useState(''); // '' means root/unassigned, or folder_id
  const [isMoving, setIsMoving] = useState(false);

  // Scoring form state
  const [scoreRoleId, setScoreRoleId] = useState('');
  const [isScoring, setIsScoring] = useState(false);

  // Year/Month modal state
  const currentDate = new Date();
  const [newFolderMonth, setNewFolderMonth] = useState(currentDate.getMonth() + 1);
  const [newFolderYear, setNewFolderYear] = useState(currentDate.getFullYear());

  // ── Fetch folders & job roles ─────────────────────────────────────────────
  const fetchFolders = async () => {
    setLoadingFolders(true);
    try {
      const res = await api.get('/source/candidates/repository/folders');
      const data = res.data.data || res.data || [];
      setFolders(data);
      
      // If currentFolder is open, refresh its data reference
      if (currentFolder) {
        const updated = data.find(f => f.id === currentFolder.id);
        if (updated) {
          setCurrentFolder(updated);
          if (currentSubfolder) {
            const updatedSub = (updated.subfolders || []).find(s => s.id === currentSubfolder.id);
            if (updatedSub) setCurrentSubfolder(updatedSub);
          }
        }
      }
    } catch (err) {
      toast.error('Failed to load folders');
    } finally {
      setLoadingFolders(false);
    }
  };

  const fetchJobRoles = async () => {
    try {
      const res = await api.get('/source/job-roles');
      setJobRoles(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load job roles:', err);
    }
  };

  const fetchAllSubfolders = async () => {
    try {
      const res = await api.get('/source/candidates/repository/all-subfolders');
      setAllSubfolders(res.data.data || []);
    } catch (err) {
      console.error('Failed to load all subfolders:', err);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchJobRoles();
  }, []);

  // ── Fetch candidates based on current hierarchy level ──────────────────────
  const fetchCandidates = async (folderId, subfolderId = null) => {
    setLoadingCandidates(true);
    try {
      const params = { limit: 1000 };
      if (subfolderId) {
        // Fetch candidates for specific role sub-folder
        params.folder_id = subfolderId;
        // If current subfolder is linked to a job role, include role_id so ai_scores are returned
        if (currentSubfolder?.job_role_id) {
          params.role_id = currentSubfolder.job_role_id;
        }
      } else {
        // Fetch unassigned candidates for this month
        params.upload_time = folderId;
        params.folder_id = 'unassigned';
      }

      const res = await api.get('/source/candidates/search', { params });
      const raw = res.data.data || [];
      const normalized = raw.map(c => ({
        ...c,
        name: getCandidateName(c)
      }));
      setCandidates(normalized);
      setSelected(new Set());
    } catch (err) {
      toast.error('Failed to load resumes');
    } finally {
      setLoadingCandidates(false);
    }
  };

  // Re-fetch candidates when folder or subfolder changes
  useEffect(() => {
    if (currentFolder) {
      if (currentSubfolder) {
        fetchCandidates(currentFolder.id, currentSubfolder.id);
      } else {
        fetchCandidates(currentFolder.id, null);
      }
    } else {
      setCandidates([]);
      setSelected(new Set());
    }
  }, [currentFolder?.id, currentSubfolder?.id]);

  // Derived filtered & sorted candidates
  const filteredCandidates = useMemo(() => {
    return candidates
      .filter(c => {
        const name = (c.name || c.full_name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        return name.includes(search) || email.includes(search);
      })
      .sort((a, b) => {
        const nameA = a.name || a.full_name || '';
        const nameB = b.name || b.full_name || '';
        if (sortBy === 'name_asc') return nameA.localeCompare(nameB);
        if (sortBy === 'name_desc') return nameB.localeCompare(nameA);
        if (sortBy === 'score_desc') {
          const scoreA = parseFloat(a.ai_fit_score || a.insights?.final_score || 0);
          const scoreB = parseFloat(b.ai_fit_score || b.insights?.final_score || 0);
          return scoreB - scoreA;
        }
        if (sortBy === 'date_asc') return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        if (sortBy === 'date_desc') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        return 0;
      });
  }, [candidates, searchQuery, sortBy]);

  // Year aggregation
  const yearCounts = useMemo(() => {
    return folders.reduce((acc, f) => {
      acc[f.year] = (acc[f.year] || 0) + f.count;
      return acc;
    }, {});
  }, [folders]);

  const yearList = useMemo(() => {
    return Array.from(new Set([...Object.keys(yearCounts).map(Number), ...manualYears])).sort((a, b) => b - a);
  }, [yearCounts, manualYears]);

  const foldersForYear = useMemo(() => {
    return currentYear ? folders.filter(f => f.year === currentYear) : [];
  }, [folders, currentYear]);

  // Subfolders for the active month
  const activeMonthSubfolders = useMemo(() => {
    if (!currentFolder) return [];
    const fresh = folders.find(f => f.id === currentFolder.id);
    return fresh?.subfolders || currentFolder.subfolders || [];
  }, [folders, currentFolder]);

  // ── Drag & Drop ─────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Some files were rejected due to size or type restrictions.');
    }
    if (accepted.length === 0) return;

    const overrideDate = currentFolder && forceFolderDate ? currentFolder.id : null;
    const folderId = currentSubfolder ? currentSubfolder.id : null;
    
    if (onBulkUpload) {
      await onBulkUpload(accepted, overrideDate, folderId);
      // Wait a bit and refresh
      setTimeout(() => {
        fetchFolders();
        if (currentFolder) {
          fetchCandidates(currentFolder.id, currentSubfolder ? currentSubfolder.id : null);
        }
      }, 1500);
    } else {
      toast.error('Bulk upload handler not provided.');
    }
  }, [currentFolder, currentSubfolder, forceFolderDate, onBulkUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'application/octet-stream': ['.zip'],
    },
    validator: (file) => {
      const name = (file.name || '').toLowerCase();
      if (name.endsWith('.zip') && file.size > ZIP_LIMIT_BYTES) return { code: 'too-large', message: 'ZIP files must be <= 2GB' };
      if ((name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) && file.size > PDF_LIMIT_BYTES) return { code: 'too-large', message: 'Docs must be <= 30MB' };
      return null;
    }
  });

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(new Set(filteredCandidates.map(c => c.id)));
    } else {
      setSelected(new Set());
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // ── Subfolder Actions ───────────────────────────────────────────────────────
  const handleOpenCreateSubfolderModal = () => {
    setNewSubfolderType('role');
    setSelectedJobRoleId(jobRoles.length > 0 ? String(jobRoles[0].id) : '');
    setCustomSubfolderName('');
    setShowSubfolderModal(true);
  };

  const handleCreateSubfolder = async (e) => {
    e.preventDefault();
    if (!currentFolder) return;

    let folderName = '';
    let jobRoleId = null;

    if (newSubfolderType === 'role') {
      const selectedRole = jobRoles.find(r => String(r.id) === String(selectedJobRoleId));
      if (!selectedRole) {
        toast.error('Please select a Job Role');
        return;
      }
      folderName = selectedRole.title;
      jobRoleId = selectedRole.id;
    } else {
      if (!customSubfolderName.trim()) {
        toast.error('Please enter a role sub-folder name');
        return;
      }
      folderName = customSubfolderName.trim();
      if (selectedJobRoleId) {
        jobRoleId = parseInt(selectedJobRoleId, 10);
      }
    }

    setIsCreatingSubfolder(true);
    try {
      const res = await api.post('/source/candidates/repository/subfolders', {
        name: folderName,
        month_year: currentFolder.id,
        job_role_id: jobRoleId
      });

      toast.success(`Role folder "${folderName}" created`);
      setShowSubfolderModal(false);
      await fetchFolders();

      // Open newly created subfolder directly
      const createdFolder = res.data.data;
      if (createdFolder) {
        setCurrentSubfolder(createdFolder);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to create role sub-folder';
      toast.error(detail);
    } finally {
      setIsCreatingSubfolder(false);
    }
  };

  const handleDeleteSubfolder = async (subfolder, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Delete folder "${subfolder.name}"? Candidates in this folder will remain in ${currentFolder.label} under Unassigned.`)) {
      return;
    }

    try {
      await api.delete(`/source/candidates/repository/subfolders/${subfolder.id}`);
      toast.success(`Folder "${subfolder.name}" deleted`);
      if (currentSubfolder?.id === subfolder.id) {
        setCurrentSubfolder(null);
      }
      await fetchFolders();
      if (currentFolder) {
        fetchCandidates(currentFolder.id, null);
      }
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  // ── Move Candidates ─────────────────────────────────────────────────────────
  const handleOpenMoveModal = () => {
    if (selected.size === 0) return;
    fetchAllSubfolders();
    setTargetMoveMonth(currentFolder ? currentFolder.id : (folders[0]?.id || ''));
    setTargetMoveFolderId('');
    setShowMoveModal(true);
  };

  const handleMoveCandidates = async (e) => {
    e.preventDefault();
    if (selected.size === 0) return;

    setIsMoving(true);
    try {
      const payload = {
        candidate_ids: Array.from(selected),
        target_month: targetMoveMonth || null,
        target_folder_id: targetMoveFolderId ? parseInt(targetMoveFolderId, 10) : null
      };

      const res = await api.post('/source/candidates/move', payload);
      toast.success(res.data.message || `Moved ${selected.size} resume(s) successfully!`);
      setShowMoveModal(false);
      setSelected(new Set());
      
      await fetchFolders();
      if (currentFolder) {
        fetchCandidates(currentFolder.id, currentSubfolder ? currentSubfolder.id : null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to move resumes');
    } finally {
      setIsMoving(false);
    }
  };

  // ── Score Subfolder with Job Description ──────────────────────────────────
  const handleOpenScoreModal = () => {
    if (!currentSubfolder) return;
    setScoreRoleId(currentSubfolder.job_role_id ? String(currentSubfolder.job_role_id) : (jobRoles[0]?.id ? String(jobRoles[0].id) : ''));
    setShowScoreModal(true);
  };

  const handleRunFolderScoring = async (e) => {
    e.preventDefault();
    if (!scoreRoleId || !currentSubfolder) {
      toast.error('Please select a Job Role to score against');
      return;
    }

    setIsScoring(true);
    const tid = toast.loading(`Scoring ${candidates.length} resume(s) against job description...`);
    try {
      const res = await api.post(`/source/job-roles/${scoreRoleId}/score-folder`, {
        folder_id: currentSubfolder.id
      });
      
      toast.success(res.data.message || `Scored candidates successfully!`, { id: tid });
      setShowScoreModal(false);

      // Re-fetch candidates with the active role_id to display the updated scores
      const fetchParams = {
        folder_id: currentSubfolder.id,
        role_id: parseInt(scoreRoleId, 10),
        limit: 1000
      };
      const candRes = await api.get('/source/candidates/search', { params: fetchParams });
      const raw = candRes.data.data || [];
      setCandidates(raw.map(c => ({ ...c, name: getCandidateName(c) })));
      
      // Update subfolder reference if linked
      await fetchFolders();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to score folder candidates', { id: tid });
    } finally {
      setIsScoring(false);
    }
  };

  // ── Bulk Delete ────────────────────────────────────────────────────────────
  const handleBulkDelete = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selected.size} resume(s)?`)) return;

    try {
      await api.post('/source/candidates/bulk-delete', { candidate_ids: Array.from(selected) });
      toast.success(`${selected.size} resume(s) deleted successfully`);
      setSelected(new Set());
      await fetchFolders();
      if (currentFolder) {
        fetchCandidates(currentFolder.id, currentSubfolder ? currentSubfolder.id : null);
      }
    } catch (err) {
      toast.error('Failed to delete resumes');
    }
  };

  // ── Year / Month creation ──────────────────────────────────────────────────
  const handleCreateFolder = () => {
    if (!currentYear) {
      setManualYears(prev => new Set(prev).add(newFolderYear));
      setCurrentYear(newFolderYear);
      setShowFolderModal(false);
      return;
    }
    
    const monthStr = newFolderMonth.toString().padStart(2, '0');
    const folderId = `${currentYear}-${monthStr}`;
    const date = new Date(currentYear, newFolderMonth - 1);
    const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    const existing = folders.find(f => f.id === folderId);
    if (existing) {
      setCurrentFolder(existing);
      setCurrentSubfolder(null);
    } else {
      setCurrentFolder({ id: folderId, label, year: currentYear, month_num: newFolderMonth, count: 0, unassigned_count: 0, subfolders: [] });
      setCurrentSubfolder(null);
    }
    setShowFolderModal(false);
  };

  return (
    <div {...getRootProps()} style={{ outline: 'none', minHeight: '100%', height: '100%' }}>
      <input {...getInputProps()} />
      
      {/* Drag Overlay */}
      {isDragActive && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(147, 51, 234, 0.12)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, border: '4px dashed #9333EA', borderRadius: '16px', margin: '20px'
        }}>
          <div style={{ textAlign: 'center', color: '#9333EA', background: '#FFFFFF', padding: '40px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <Upload size={64} style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {currentSubfolder 
                ? `Drop resumes to upload into "${currentSubfolder.name}"` 
                : currentFolder 
                ? `Drop resumes to upload into "${currentFolder.label}"` 
                : 'Drop resumes to upload instantly'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: 8 }}>
              Accepted: PDF, DOCX, DOC, ZIP (up to 2GB)
            </p>
          </div>
        </div>
      )}

      {/* Header & Breadcrumbs */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem', fontWeight: 600 }}>
            <span 
              style={{ color: (!currentYear && !currentFolder) ? '#111827' : '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => { setCurrentYear(null); setCurrentFolder(null); setCurrentSubfolder(null); }}
              className="hover:text-purple-600 transition-colors"
            >
              <Folder size={18} />
              Resume Repo
            </span>
            
            {currentYear && (
              <>
                <ChevronRight size={16} color="#9CA3AF" />
                <span 
                  style={{ color: (currentFolder || currentSubfolder) ? '#6B7280' : '#111827', cursor: 'pointer' }}
                  onClick={() => { setCurrentFolder(null); setCurrentSubfolder(null); }}
                  className="hover:text-purple-600 transition-colors"
                >
                  {currentYear}
                </span>
              </>
            )}

            {currentFolder && (
              <>
                <ChevronRight size={16} color="#9CA3AF" />
                <span 
                  style={{ color: currentSubfolder ? '#6B7280' : '#111827', cursor: 'pointer' }}
                  onClick={() => setCurrentSubfolder(null)}
                  className="hover:text-purple-600 transition-colors"
                >
                  {currentFolder.label}
                </span>
              </>
            )}

            {currentSubfolder && (
              <>
                <ChevronRight size={16} color="#9CA3AF" />
                <span style={{ color: '#9333EA', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Briefcase size={16} />
                  {currentSubfolder.name}
                </span>
              </>
            )}
          </div>

          {/* Quick Back button if deep */}
          {(currentFolder || currentSubfolder) && (
            <button 
              onClick={() => {
                if (currentSubfolder) setCurrentSubfolder(null);
                else if (currentFolder) setCurrentFolder(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ══════════════════════════════════════════════════════════════════════
            LEVEL 1: YEAR VIEW
            ══════════════════════════════════════════════════════════════════════ */}
        {!currentYear && !currentFolder && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="form-input w-full" 
                  placeholder="Search years..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 36, width: '100%', borderRadius: '8px' }}
                />
              </div>
              {hasManagePermission && (
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3.5 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2" 
                  onClick={() => setShowFolderModal(true)}
                >
                  <Plus size={15} /> Create Folder
                </button>
              )}
            </div>
            
            {loadingFolders ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
            ) : yearList.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <Folder size={48} color="#9CA3AF" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600, color: '#374151', fontSize: '1.1rem' }}>No resumes have been uploaded yet.</p>
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', marginTop: 4 }}>Upload files or drop them anywhere to create month folders automatically.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                {yearList.filter(year => year.toString().includes(searchQuery)).map((year, i) => (
                  <div 
                    key={year} 
                    className="card"
                    style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #E5E7EB', borderRadius: 14, background: '#FFFFFF', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => setCurrentYear(year)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Folder size={32} color="#9333EA" style={{ fill: 'rgba(147, 51, 234, 0.1)' }} />
                      <span className="badge badge-secondary" style={{ fontSize: '0.75rem', fontWeight: 600, background: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: 6 }}>
                        {yearCounts[year] || 0} resumes
                      </span>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#111827', fontWeight: 700 }}>{year}</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>Uploaded files repository</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            LEVEL 2: MONTH VIEW (inside Year)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentYear && !currentFolder && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="form-input w-full" 
                  placeholder="Search months..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: 36, width: '100%', borderRadius: '8px' }}
                />
              </div>
              {hasManagePermission && (
                <button 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3.5 rounded-lg text-sm transition-colors duration-200 flex items-center justify-center gap-2" 
                  onClick={() => setShowFolderModal(true)}
                >
                  <Plus size={15} /> Create Month Folder
                </button>
              )}
            </div>
            
            {foldersForYear.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <Folder size={48} color="#9CA3AF" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600, color: '#374151' }}>No resumes uploaded in {currentYear}.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {foldersForYear.filter(f => f.label.toLowerCase().includes(searchQuery.toLowerCase())).map((f, i) => {
                  const subCount = f.subfolders?.length || 0;
                  return (
                    <div 
                      key={f.id} 
                      className="card"
                      style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #E5E7EB', borderRadius: 14, background: '#FFFFFF', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onClick={() => setCurrentFolder(f)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Folder size={32} color="#9333EA" style={{ fill: 'rgba(147, 51, 234, 0.1)' }} />
                        <span className="badge badge-secondary" style={{ fontSize: '0.75rem', fontWeight: 600, background: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: 6 }}>
                          {f.count} resumes
                        </span>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827', fontWeight: 700 }}>{f.label}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: '0.75rem', color: '#6B7280' }}>
                          <span className="flex items-center gap-1 font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            <Layers size={11} /> {subCount} role {subCount === 1 ? 'folder' : 'folders'}
                          </span>
                          {f.unassigned_count > 0 && (
                            <span className="text-gray-400">· {f.unassigned_count} unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            LEVEL 3: INSIDE MONTH (Role Sub-Folders + Unassigned Resumes)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentFolder && !currentSubfolder && (
          <div className="animate-fade-in flex flex-col gap-6">
            {/* SUB-FOLDERS SECTION */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 m-0">Role Sub-Folders</h2>
                    <p className="text-xs text-gray-500 m-0 mt-0.5">Organize resumes by Job Role within {currentFolder.label}</p>
                  </div>
                </div>

                {hasManagePermission && (
                  <button 
                    onClick={handleOpenCreateSubfolderModal}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                  >
                    <FolderPlus size={14} /> New Role Folder
                  </button>
                )}
              </div>

              {activeMonthSubfolders.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 flex flex-col items-center justify-center gap-2">
                  <Briefcase size={28} className="text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700 m-0">No role sub-folders yet for {currentFolder.label}</p>
                  <p className="text-xs text-gray-400 m-0 max-w-md">
                    Create a sub-folder to group resumes by Job Role (e.g., Frontend, DevOps). This lets you score only that folder's CVs against specific job descriptions.
                  </p>
                  {hasManagePermission && (
                    <button 
                      onClick={handleOpenCreateSubfolderModal}
                      className="mt-2 text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-white border border-purple-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-purple-50 transition-colors"
                    >
                      <Plus size={13} /> Create First Role Folder
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeMonthSubfolders.map(sf => (
                    <div 
                      key={sf.id}
                      onClick={() => setCurrentSubfolder(sf)}
                      className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                      style={{ minHeight: 110 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                            <Briefcase size={16} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-gray-800 truncate m-0 group-hover:text-purple-600 transition-colors" title={sf.name}>
                              {sf.name}
                            </h3>
                            {sf.job_role_title && (
                              <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-medium truncate inline-block max-w-[170px] mt-0.5">
                                {sf.job_role_title}
                              </span>
                            )}
                          </div>
                        </div>

                        {hasManagePermission && (
                          <button 
                            onClick={(e) => handleDeleteSubfolder(sf, e)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete role folder"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs">
                        <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                          {sf.count || 0} {sf.count === 1 ? 'CV' : 'CVs'}
                        </span>
                        <span className="text-purple-600 font-medium flex items-center gap-1 text-[11px] group-hover:translate-x-0.5 transition-transform">
                          Open Folder <ChevronRight size={12} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* UNASSIGNED RESUMES SECTION */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 m-0 flex items-center gap-2">
                    <File size={16} className="text-gray-500" />
                    Month Resumes ({currentFolder.label})
                  </h2>
                  <p className="text-xs text-gray-500 m-0 mt-0.5">
                    Resumes in this month's general pool. Select resumes to move them into a Role Sub-Folder.
                  </p>
                </div>
              </div>

              {/* Action Bar for Candidates */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: '#F9FAFB', padding: '10px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input 
                    type="checkbox" 
                    style={{ accentColor: '#9333EA', width: 16, height: 16, cursor: 'pointer' }}
                    checked={filteredCandidates.length > 0 && selected.size === filteredCandidates.length}
                    onChange={toggleSelectAll}
                  />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Select All ({filteredCandidates.length})</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 280 }}>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      type="text" 
                      className="form-input w-full" 
                      placeholder="Search resumes..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 32, width: '100%', borderRadius: '8px', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <select 
                    className="form-input" 
                    value={sortBy} 
                    onChange={e => setSortBy(e.target.value)} 
                    style={{ borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                  </select>

                  <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '8px', padding: '3px' }}>
                    <button 
                      className={`btn btn-sm ${viewMode === 'list' ? 'bg-white shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-700'}`} 
                      style={{ padding: '4px 8px', height: 'auto', border: 'none', borderRadius: 6 }} 
                      onClick={() => setViewMode('list')}
                    >
                      <List size={15} />
                    </button>
                    <button 
                      className={`btn btn-sm ${viewMode === 'grid' ? 'bg-white shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-700'}`} 
                      style={{ padding: '4px 8px', height: 'auto', border: 'none', borderRadius: 6 }} 
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid size={15} />
                    </button>
                  </div>

                  {hasManagePermission && (
                    <>
                      {selected.size > 0 && (
                        <>
                          <button 
                            onClick={handleOpenMoveModal}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <ArrowRightLeft size={13} /> Move ({selected.size})
                          </button>
                          <button 
                            onClick={handleBulkDelete}
                            className="text-red-600 hover:bg-red-50 border border-red-200 font-semibold py-1 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 size={13} /> Delete ({selected.size})
                          </button>
                        </>
                      )}

                      <label 
                        className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-1 px-3 rounded-lg text-xs transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-2xs" 
                        style={{ margin: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <Upload size={13} /> Upload Resumes
                        <input {...getInputProps()} style={{ display: 'none' }} />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {loadingCandidates ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
              ) : filteredCandidates.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                  <File size={40} color="#9CA3AF" style={{ opacity: 0.5, margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 600, color: '#374151', fontSize: '0.95rem' }}>No unassigned resumes in this month.</p>
                  <p style={{ color: '#9CA3AF', fontSize: '0.8rem', marginTop: 4 }}>
                    All resumes in {currentFolder.label} may be organized into Role Sub-Folders above, or you can drop files here to upload.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr', gap: 12 }}>
                  {filteredCandidates.map((c, i) => (
                    <div 
                      key={c.id} 
                      className="card"
                      style={{ 
                        padding: '14px', 
                        border: selected.has(c.id) ? '2px solid #9333EA' : '1px solid #E5E7EB',
                        borderRadius: 12,
                        background: selected.has(c.id) ? '#FAF5FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        flexDirection: viewMode === 'grid' ? 'column' : 'row',
                        alignItems: viewMode === 'grid' ? 'stretch' : 'center',
                        gap: 10
                      }}
                      onClick={() => toggleSelect(c.id)}
                    >
                      <div style={{ display: 'flex', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', gap: 12, flex: 1 }}>
                        <input 
                          type="checkbox" 
                          style={{ accentColor: '#9333EA', width: 16, height: 16, marginTop: viewMode === 'grid' ? 4 : 0 }}
                          checked={selected.has(c.id)}
                          onChange={() => {}}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 24 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: viewMode === 'grid' ? 4 : 0 }}>
                              <File size={16} color="#9333EA" style={{ flexShrink: 0 }} />
                              <span 
                                style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                                title={c.name || c.full_name}
                                className="hover:text-purple-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewProfile?.(c);
                                }}
                              >
                                {c.name || c.full_name || getCandidateName(c)}
                              </span>
                            </div>
                            {viewMode === 'grid' && (
                              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.email}
                              </div>
                            )}
                          </div>
                          {viewMode === 'list' && (
                            <div style={{ width: 220, fontSize: '0.85rem', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.email}
                            </div>
                          )}
                          {viewMode === 'list' && (
                            <div style={{ width: 140, fontSize: '0.85rem', color: '#9CA3AF' }}>
                              {new Date(c.created_at || Date.now()).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: viewMode === 'grid' ? 'auto' : 0, paddingTop: viewMode === 'grid' ? 10 : 0, borderTop: viewMode === 'grid' ? '1px solid #F3F4F6' : 'none', gap: 8 }}>
                        <button
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-medium py-1 px-2.5 rounded-lg text-xs transition-colors duration-200 flex items-center gap-1"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile?.(c);
                          }}
                        >
                          <User size={13} />
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            LEVEL 4: INSIDE ROLE SUB-FOLDER (Scoped CVs + Score with Job Description)
            ══════════════════════════════════════════════════════════════════════ */}
        {currentFolder && currentSubfolder && (
          <div className="animate-fade-in flex flex-col gap-5">
            {/* Sub-folder Banner */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                  <Briefcase size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-gray-900 m-0">{currentSubfolder.name}</h1>
                    <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">
                      {candidates.length} {candidates.length === 1 ? 'Candidate' : 'Candidates'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 flex-wrap">
                    <span>Month: <strong className="text-gray-700">{currentFolder.label}</strong></span>
                    {currentSubfolder.job_role_title ? (
                      <span>Linked Role: <strong className="text-purple-700">{currentSubfolder.job_role_title}</strong></span>
                    ) : (
                      <span className="text-gray-400">No Job Role linked</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {hasManagePermission && (
                  <>
                    <button
                      onClick={handleOpenScoreModal}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm"
                      title="Run AI ATS scoring for CVs in this folder against a Job Description"
                    >
                      <Zap size={15} /> Score with Job Description
                    </button>

                    <label 
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-3.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Upload CVs directly into this role folder"
                    >
                      <Upload size={14} /> Upload CVs
                      <input {...getInputProps()} style={{ display: 'none' }} />
                    </label>

                    <button 
                      onClick={(e) => handleDeleteSubfolder(currentSubfolder, e)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                      title="Delete this role folder (resumes stay in month)"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Candidate List Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF', padding: '12px 18px', borderRadius: '14px', border: '1px solid #E5E7EB', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input 
                  type="checkbox" 
                  style={{ accentColor: '#9333EA', width: 16, height: 16, cursor: 'pointer' }}
                  checked={filteredCandidates.length > 0 && selected.size === filteredCandidates.length}
                  onChange={toggleSelectAll}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Select All ({filteredCandidates.length})</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 280 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="form-input w-full" 
                    placeholder="Search candidate or email..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: 32, width: '100%', borderRadius: '8px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <select 
                  className="form-input" 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)} 
                  style={{ borderRadius: '8px', padding: '6px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <option value="score_desc">Highest Fit Score</option>
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                </select>

                <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: '8px', padding: '3px' }}>
                  <button 
                    className={`btn btn-sm ${viewMode === 'list' ? 'bg-white shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-700'}`} 
                    style={{ padding: '4px 8px', height: 'auto', border: 'none', borderRadius: 6 }} 
                    onClick={() => setViewMode('list')}
                  >
                    <List size={15} />
                  </button>
                  <button 
                    className={`btn btn-sm ${viewMode === 'grid' ? 'bg-white shadow-2xs font-semibold' : 'text-gray-500 hover:text-gray-700'}`} 
                    style={{ padding: '4px 8px', height: 'auto', border: 'none', borderRadius: 6 }} 
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGrid size={15} />
                  </button>
                </div>

                {hasManagePermission && selected.size > 0 && (
                  <>
                    <button 
                      onClick={handleOpenMoveModal}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <ArrowRightLeft size={13} /> Move ({selected.size})
                    </button>
                    <button 
                      onClick={handleBulkDelete}
                      className="text-red-600 hover:bg-red-50 border border-red-200 font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Delete ({selected.size})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Candidates in Sub-folder */}
            {loadingCandidates ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner spinner-lg" /></div>
            ) : filteredCandidates.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB' }}>
                <Briefcase size={48} color="#9CA3AF" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 700, color: '#111827', fontSize: '1.1rem' }}>No resumes in this role folder yet.</p>
                <p style={{ color: '#6B7280', fontSize: '0.85rem', marginTop: 4, maxWidth: 460, margin: '8px auto 20px' }}>
                  Upload resumes directly into this folder or move resumes from {currentFolder.label} unassigned pool.
                </p>
                {hasManagePermission && (
                  <label 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Upload size={16} /> Upload Resumes Now
                    <input {...getInputProps()} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr', gap: 14 }}>
                {filteredCandidates.map((c, i) => {
                  const score = parseFloat(c.ai_fit_score || c.insights?.final_score || 0);
                  const hasScore = !isNaN(score) && score > 0;
                  
                  return (
                    <div 
                      key={c.id} 
                      className="card"
                      style={{ 
                        padding: '16px', 
                        border: selected.has(c.id) ? '2px solid #9333EA' : '1px solid #E5E7EB',
                        borderRadius: 14,
                        background: selected.has(c.id) ? '#FAF5FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        flexDirection: viewMode === 'grid' ? 'column' : 'row',
                        alignItems: viewMode === 'grid' ? 'stretch' : 'center',
                        gap: 12
                      }}
                      onClick={() => toggleSelect(c.id)}
                    >
                      <div style={{ display: 'flex', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', gap: 12, flex: 1 }}>
                        <input 
                          type="checkbox" 
                          style={{ accentColor: '#9333EA', width: 16, height: 16, marginTop: viewMode === 'grid' ? 4 : 0 }}
                          checked={selected.has(c.id)}
                          onChange={() => {}}
                        />
                        <div style={{ flex: 1, minWidth: 0, display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 24 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: viewMode === 'grid' ? 4 : 0 }}>
                              <File size={16} color="#9333EA" style={{ flexShrink: 0 }} />
                              <span 
                                style={{ fontWeight: 700, fontSize: '0.92rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                                title={c.name || c.full_name}
                                className="hover:text-purple-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewProfile?.(c);
                                }}
                              >
                                {c.name || c.full_name || getCandidateName(c)}
                              </span>
                            </div>
                            {viewMode === 'grid' && (
                              <div style={{ fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.email}
                              </div>
                            )}
                          </div>

                          {/* Score Badge */}
                          {hasScore && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                                score >= 70 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : score >= 50 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-purple-50 text-purple-700 border-purple-200'
                              }`}>
                                <Zap size={11} /> {Math.round(score)}% Fit
                              </span>
                            </div>
                          )}

                          {viewMode === 'list' && (
                            <div style={{ width: 200, fontSize: '0.82rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.email}
                            </div>
                          )}
                          {viewMode === 'list' && (
                            <div style={{ width: 120, fontSize: '0.82rem', color: '#9CA3AF' }}>
                              {new Date(c.created_at || Date.now()).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: viewMode === 'grid' ? 'auto' : 0, paddingTop: viewMode === 'grid' ? 12 : 0, borderTop: viewMode === 'grid' ? '1px solid #F3F4F6' : 'none', gap: 8 }}>
                        <button
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-semibold py-1 px-3 rounded-lg text-xs transition-colors duration-200 flex items-center gap-1.5"
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile?.(c);
                          }}
                        >
                          <User size={13} />
                          View Profile
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CREATE ROLE SUB-FOLDER
          ══════════════════════════════════════════════════════════════════════ */}
      {showSubfolderModal && currentFolder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: 440, padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <FolderPlus size={20} color="#9333EA" /> Create Role Sub-Folder
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" 
                onClick={() => setShowSubfolderModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Create a role folder inside <strong className="text-gray-800">{currentFolder.label}</strong>. This organizes candidates by role and will not create new month folders.
            </p>

            <form onSubmit={handleCreateSubfolder} className="flex flex-col gap-4">
              {/* Type toggle */}
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setNewSubfolderType('role')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    newSubfolderType === 'role' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  From Existing Job Role
                </button>
                <button
                  type="button"
                  onClick={() => setNewSubfolderType('custom')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    newSubfolderType === 'custom' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Custom Role Title
                </button>
              </div>

              {newSubfolderType === 'role' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Job Role</label>
                  {jobRoles.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      No job roles found. Switch to "Custom Role Title" to enter a name.
                    </p>
                  ) : (
                    <select
                      className="form-input w-full"
                      value={selectedJobRoleId}
                      onChange={e => setSelectedJobRoleId(e.target.value)}
                      required
                    >
                      <option value="">Select a role...</option>
                      {jobRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Folder Name / Role Title</label>
                    <input
                      type="text"
                      className="form-input w-full"
                      placeholder="e.g. Senior Backend Engineer"
                      value={customSubfolderName}
                      onChange={e => setCustomSubfolderName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Link to Job Role (Optional)</label>
                    <select
                      className="form-input w-full"
                      value={selectedJobRoleId}
                      onChange={e => setSelectedJobRoleId(e.target.value)}
                    >
                      <option value="">None (Custom only)</option>
                      {jobRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  onClick={() => setShowSubfolderModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isCreatingSubfolder || (newSubfolderType === 'role' && !selectedJobRoleId)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingSubfolder ? <Loader size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                  Create & Open Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: MOVE CANDIDATES
          ══════════════════════════════════════════════════════════════════════ */}
      {showMoveModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: 460, padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <ArrowRightLeft size={20} color="#9333EA" /> Move Resumes
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" 
                onClick={() => setShowMoveModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Moving <strong className="text-purple-700 font-bold">{selected.size} resume(s)</strong>. Select target month and/or role sub-folder.
            </p>

            <form onSubmit={handleMoveCandidates} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Month Folder</label>
                <select
                  className="form-input w-full"
                  value={targetMoveMonth}
                  onChange={e => {
                    setTargetMoveMonth(e.target.value);
                    setTargetMoveFolderId('');
                  }}
                  required
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Target Role Sub-Folder</label>
                <select
                  className="form-input w-full"
                  value={targetMoveFolderId}
                  onChange={e => setTargetMoveFolderId(e.target.value)}
                >
                  <option value="">Month Root (Unassigned)</option>
                  {/* Filter subfolders belonging to chosen target month */}
                  {allSubfolders
                    .filter(sf => sf.month_year === targetMoveMonth)
                    .map(sf => (
                      <option key={sf.id} value={sf.id}>
                        📁 {sf.name} ({sf.count || 0} CVs)
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Selecting Month Root leaves the resume unassigned within that month.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  onClick={() => setShowMoveModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isMoving}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isMoving ? <Loader size={14} className="animate-spin" /> : <MoveRight size={14} />}
                  Confirm Move
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: SCORE WITH JOB DESCRIPTION
          ══════════════════════════════════════════════════════════════════════ */}
      {showScoreModal && currentSubfolder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: 460, padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <Zap size={20} color="#9333EA" /> Score Folder with Job Description
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" 
                onClick={() => setShowScoreModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-100 mb-4 text-xs text-purple-900 leading-relaxed">
              Target Folder: <strong>{currentSubfolder.name}</strong> ({candidates.length} candidates)<br />
              AI ATS scoring will only evaluate resumes within this folder against the selected Job Description.
            </div>

            <form onSubmit={handleRunFolderScoring} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Job Description</label>
                <select
                  className="form-input w-full"
                  value={scoreRoleId}
                  onChange={e => setScoreRoleId(e.target.value)}
                  required
                >
                  <option value="">Choose a job role...</option>
                  {jobRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.title} (min {r.min_experience} yrs)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 mt-3 pt-3 border-t border-gray-100">
                <button 
                  type="button" 
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  onClick={() => setShowScoreModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isScoring || !scoreRoleId}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isScoring ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
                  Run ATS Scoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CREATE YEAR / MONTH FOLDER
          ══════════════════════════════════════════════════════════════════════ */}
      {showFolderModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: 400, padding: 24, borderRadius: 16, background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <Folder size={20} color="#9333EA" /> Create Folder
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors" 
                onClick={() => setShowFolderModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              {!currentYear ? (
                <>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#4B5563' }}>Select Year</label>
                  <select 
                    className="form-input w-full" 
                    value={newFolderYear} 
                    onChange={e => setNewFolderYear(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {Array.from({ length: 10 }).map((_, i) => {
                      const y = currentDate.getFullYear() - i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </>
              ) : (
                <>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: '#4B5563' }}>Select Month for {currentYear}</label>
                  <select 
                    className="form-input w-full" 
                    value={newFolderMonth} 
                    onChange={e => setNewFolderMonth(Number(e.target.value))}
                    style={{ width: '100%' }}
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const monthNum = i + 1;
                      const date = new Date(2000, i);
                      const monthName = date.toLocaleString('default', { month: 'long' });
                      const isFuture = currentYear === currentDate.getFullYear() && monthNum > currentDate.getMonth() + 1;
                      return <option key={monthNum} value={monthNum} disabled={isFuture}>{monthName}</option>;
                    })}
                  </select>
                </>
              )}
              <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 8 }}>
                Folders organize resumes by their upload date.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="text-gray-600 hover:bg-gray-100 font-medium py-2 px-4 rounded-xl transition-colors duration-200" onClick={() => setShowFolderModal(false)}>Cancel</button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200" onClick={handleCreateFolder}>Create & Open</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
