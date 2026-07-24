import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { usePermissions } from '../../../core/auth/usePermissions';
import { P } from '../../../core/permissions';
import {
  UserPlus, Mail, CheckCircle, Clock, Trash2, Plus,
  FileText, Briefcase, GraduationCap, MapPin, Phone,
  ChevronRight, BadgeCheck, ShieldAlert, Eye, ExternalLink,
  Copy, Link, Ban, Save, User, CreditCard, Lock, X, Download
} from 'lucide-react';
import ComboBox from '../../../core/components/ComboBox';
import HorizontalLoader from '../../../core/components/HorizontalLoader';
import useEscapeClose from '../../../core/hooks/useEscapeClose';
import useTabListKeyNav from '../../../core/hooks/useTabListKeyNav';
import {
  isEmail,
  isEmployeeCode,
  isFutureDate,
  isNonEmpty,
  isValidPhone,
  isValidDate,
} from '../../../core/utils/validators';

const DESIGNATIONS = [
    'Software Engineer', 'Senior Engineer', 'Team Lead', 'Project Manager', 
    'Product Manager', 'Designer', 'QA Analyst', 'Sales Executive', 
    'HR Associate', 'Accountant', 'Marketing Specialist', 'Operations Manager'
];

const DEPARTMENTS = [
    'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 
    'Human Resources', 'Finance', 'Operations', 'Quality Assurance'
];

// Hoisted OUTSIDE OnboardingPanel so React keeps a stable component reference
// across re-renders.
const SectionHeader = ({ icon: Icon, label, isLightMode }) => (
  <div className="flex items-center gap-3">
    <Icon size={16} className={isLightMode ? 'text-[#8b5cf6]' : 'text-primary'} />
    <span className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#8b8ba3]' : 'text-white/30'}`}>{label}</span>
  </div>
);

const FIELD_TOOLTIPS = {
  'Employee Code': 'Unique employee identifier used across HR and payroll records.',
  'New Employee Code': 'Unique employee identifier assigned when this person is deployed.',
  'Reporting Manager': 'The manager this employee reports to.',
  'Access Role': 'Controls what this user can view and manage in the workspace.',
  'PF Included': 'Choose whether Provident Fund contributions apply to this employee.',
  'Mediclaim Included': 'Choose whether this employee is covered by mediclaim.',
};

const Field = ({ label, children, isLightMode }) => (
  <div className="space-y-1.5">
    <label data-tooltip={FIELD_TOOLTIPS[label]} className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>{label}</label>
    {children}
  </div>
);

export default function OnboardingPanel() {
  const { hasPermission } = usePermissions();
  const canSendInvite = hasPermission(P.DEPLOY_ONBOARD_SEND_INVITE);
  const canCancelInvite = hasPermission(P.DEPLOY_ONBOARD_CANCEL_INVITE);
  const canReviewSubmissions = hasPermission(P.DEPLOY_ONBOARD_REVIEW_SUBMISSIONS);

  const [activeTab, setActiveTab] = useState('invites');
  const [invites, setInvites] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeManagers, setActiveManagers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dynDesignations, setDynDesignations] = useState([]);
  const [dynDepartments, setDynDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [form, setForm] = useState({ employee_code: '', first_name: '', middle_name: '', last_name: '', guardian_name: '', email: '', role: 'employee', department: '', designation: '', doj: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editApprovalForm, setEditApprovalForm] = useState(null);

  const isLightMode = window.location.pathname.startsWith('/deploy');

  useEscapeClose(() => setShowForm(false), showForm);
  useEscapeClose(() => setSelectedApproval(null), !!selectedApproval);
  const handleTabKeyNav = useTabListKeyNav();

  // Approval Form Stats
  const [approveForm, setApproveForm] = useState({
    manager: '',
    type: 'Full Time',
    pf: 'No',
    mediclaim: 'No',
    location: '',
    notes: '',
    code: '',
    doj: ''
  });

  useEffect(() => { 
    if (activeTab === 'invites') loadInvites();
    else {
        loadApprovals();
        loadOptions();
    }
  }, [activeTab]);

  const loadOptions = async () => {
    try {
      // ── Fetch both options and employees ──
      const [optionsRes, employeesRes] = await Promise.all([
        fetch('/api/options', { credentials: 'include' }),
        fetch('/api/employees', { credentials: 'include' })
      ]);

      const optionsData = await optionsRes.json();
      const employeesData = await employeesRes.json();

      const allManagers = optionsData.managers || [];
      const employeeList = Array.isArray(employeesData) ? employeesData : [];

      // ── FILTER ACTIVE EMPLOYEES (SAME LOGIC AS ASSETS PANEL) ──
      const activeEmployees = employeeList.filter(emp => 
        emp.employment_status === 'Active' || 
        emp.employment_status === 'active' ||
        emp.is_active === 1 ||
        emp.is_active === true ||
        emp.is_active === '1' ||
        emp.is_active === 'true'
      );

      // ── FILTER MANAGERS AND ORG_ADMINS FROM ACTIVE EMPLOYEES ──
      const activeManagersFiltered = activeEmployees.filter(emp => {
        const role = String(emp?.role || emp?.user_role || emp?.role_name || '').trim().toLowerCase();
        return role === 'manager' || role === 'org_admin' || role === 'organisationadmin' || role === 'org-admin' || role === 'admin';
      });

      // ── Build a Set of active manager employee codes ──
      const activeManagerCodes = new Set(
        activeManagersFiltered
          .map(emp => emp?.employee_code)
          .filter(Boolean)
      );

      // ── Filter the options managers to only those in the active set ──
      const finalActiveManagers = allManagers.filter(m => {
        const managerCode = m?.employee_code || m?.code || m?.emp_code;
        if (managerCode) {
          return activeManagerCodes.has(managerCode);
        }

        // Fallback: match by email
        const managerEmail = m?.email || m?.email_id || '';
        if (managerEmail) {
          return activeManagersFiltered.some(emp => 
            (emp?.email || emp?.email_id || '').toLowerCase() === managerEmail.toLowerCase()
          );
        }

        // Fallback: match by name
        const managerName = String(m?.name || m?.label || '').trim().toLowerCase();
        if (managerName) {
          return activeManagersFiltered.some(emp => {
            const empName = String(emp?.name || emp?.full_name || emp?.employee_name || '').trim().toLowerCase();
            return empName === managerName;
          });
        }

        return false;
      });

      console.log('📊 Active employees:', activeEmployees.length);
      console.log('📊 Active managers/org_admins:', activeManagersFiltered.length);
      console.log('📊 Filtered active managers for dropdown:', finalActiveManagers.length);

      setManagers(allManagers);
      setActiveManagers(finalActiveManagers);
      setLocations(optionsData.locations || []);
      setDynDesignations(optionsData.designations || []);
      setDynDepartments(optionsData.departments || []);

    } catch (error) {
      console.error('Error loading options:', error);
      toast.error("Failed to sync structural dependencies");
    }
  };

  const loadInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/invites', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvites(data);
    } catch {
      toast.error('Failed to load active invite sequences');
    } finally {
      setLoading(false);
    }
  };

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/approvals', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setApprovals(data);
    } catch {
      toast.error('Failed to load approval pipeline');
    } finally {
      setLoading(false);
    }
  };

  const sendInvite = async () => {
    if (!form.first_name || !form.last_name || !form.email) {
      toast.error('Please input complete vectors');
      return;
    }
    if (!isEmail(form.email)) {
      toast.error('Enter a valid invite email address');
      return;
    }
    if (!isNonEmpty(form.role)) {
      toast.error('Select an onboarding role');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Transmission failed');
      toast.success('Sequence Initiated successfully');
      setForm({ employee_code: '', first_name: '', middle_name: '', last_name: '', guardian_name: '', email: '', role: 'employee', department: '', designation: '', doj: '' });
      setShowForm(false);
      loadInvites();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/onboard?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Sequence link copied to clipboards');
  };

  const revokeInvite = async (id) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;
    try {
      const res = await fetch(`/api/onboarding/invite/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      toast.success('Invite sequence revoked');
      loadInvites();
    } catch {
      toast.error('Failed to abort invitation sequence');
    }
  };

  const hardDeleteInvite = async (id) => {
    if (!confirm('Are you sure you want to completely delete this invite log? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/onboarding/invite/${id}/delete`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error();
      toast.success('Invite log permanently deleted');
      loadInvites();
    } catch {
      toast.error('Failed to delete invite log');
    }
  };

  const openApprovalReview = (approval) => {
    setSelectedApproval(approval);

    // education_details comes back from the API as a JSONB array (or a JSON string in edge cases)
    let eduList = [];
    try {
      eduList = Array.isArray(approval.education_details)
        ? approval.education_details
        : (approval.education_details ? JSON.parse(approval.education_details) : []);
    } catch {
      eduList = [];
    }
    if (!eduList.length) eduList = [{ degree: '', university: '', year: '', percentage: '' }];

    // emergency_contact is stored as a single "Name - CountryCode Number" string
    // (built that way on the onboarding forms); split it back into two fields for editing here.
    const emergencyRaw = approval.emergency_contact || '';
    const emergencySplitIdx = emergencyRaw.indexOf(' - ');
    const emergencyContactName = emergencySplitIdx >= 0 ? emergencyRaw.slice(0, emergencySplitIdx).trim() : emergencyRaw.trim();
    const emergencyContactNumber = emergencySplitIdx >= 0 ? emergencyRaw.slice(emergencySplitIdx + 3).trim() : '';

    // Initialize edit form with everything the individual submitted on the onboarding form
    setEditApprovalForm({
      employee_code: approval.employee_code || '',
      first_name: approval.first_name || '',
      middle_name: approval.middle_name || '',
      last_name: approval.last_name || '',
      guardian_name: approval.guardian_name || '',
      dob: (approval.dob || '').split('T')[0],
      email_id: approval.email_id || '',
      contact_number: approval.contact_number || '',
      emergency_contact_name: emergencyContactName,
      emergency_contact_number: emergencyContactNumber,
      current_address: approval.current_address || '',
      permanent_address: approval.permanent_address || '',
      designation: approval.designation || '',
      team: approval.team || '',
      role: approval.role || 'employee',
      primary_skillset: approval.primary_skillset || '',
      secondary_skillset: approval.secondary_skillset || '',
      education_details: eduList,
      bank_name: approval.bank_name || '',
      bank_account_no: approval.bank_account_no || '',
      pan_no: approval.pan_no || '',
      pf_included: approval.pf_included || 'No',
      mediclaim_included: approval.mediclaim_included || 'No',
      notes: approval.notes || '',
      photo_path: approval.photo_path || '',
      cv_path: approval.cv_path || '',
      id_proofs: approval.id_proofs || '',
    });
    setApproveForm(prev => ({
      ...prev,
      code: approval.employee_code || '',
      location: approval.location || '',
      doj: approval.doj || ''
    }));
  };

  const updateApprovalEducation = (idx, field, value) => {
    setEditApprovalForm(prev => {
      const list = [...(prev.education_details || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, education_details: list };
    });
  };

  const addApprovalEducation = () => {
    setEditApprovalForm(prev => ({
      ...prev,
      education_details: [...(prev.education_details || []), { degree: '', university: '', year: '', percentage: '' }]
    }));
  };

  const removeApprovalEducation = (idx) => {
    setEditApprovalForm(prev => ({
      ...prev,
      education_details: (prev.education_details || []).filter((_, i) => i !== idx)
    }));
  };

  // Uploaded documents are served through a backend endpoint (which reads the
  // file server-side / redirects to a presigned S3 URL) rather than a raw
  // static path, since locally-stored files aren't reachable via any static route.
  // The endpoint serves the file inline by default; ?download=true forces a save.
  const getDocumentUrl = (docType, download = false) =>
    `/api/employee/${editApprovalForm.employee_code}/document/${docType}${download ? '?download=true' : ''}`;

  const viewApprovalDocument = (docType, path) => {
    if (!path) {
      toast.error('Document not uploaded yet');
      return;
    }
    window.open(getDocumentUrl(docType), '_blank');
  };

  const downloadApprovalDocument = async (docType, path, label) => {
    if (!path) return;
    try {
      const url = getDocumentUrl(docType, true);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error();

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = path.split('/').pop() || `${label}.download`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error('Failed to download file');
    }
  };

  const handleSaveApprovalEdit = async () => {
    // Validate fields
    if (!editApprovalForm.first_name?.trim() || !editApprovalForm.last_name?.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (editApprovalForm.email_id && !isEmail(editApprovalForm.email_id)) {
      toast.error("Enter a valid email address");
      return;
    }
    if (editApprovalForm.employee_code && !isEmployeeCode(editApprovalForm.employee_code)) {
      toast.error("Employee code must be 3-20 letters, numbers, hyphens, or underscores");
      return;
    }
    if (editApprovalForm.contact_number && !isValidPhone(editApprovalForm.contact_number)) {
      toast.error("Enter a valid contact number");
      return;
    }
    if (editApprovalForm.emergency_contact_number && !isValidPhone(editApprovalForm.emergency_contact_number)) {
      toast.error("Enter a valid emergency contact number");
      return;
    }
    if (editApprovalForm.dob && !isValidDate(editApprovalForm.dob)) {
      toast.error("Enter a valid date of birth");
      return;
    }

    try {
      // Bank name/account number are locked to HR in this review panel; the
      // server also refuses to touch them, but we don't even send them.
      // emergency_contact_name/number are edit-only conveniences here — recombine
      // them into the single emergency_contact string the backend actually stores.
      const {
        bank_name: _bank_name,
        bank_account_no: _bank_account_no,
        emergency_contact_name,
        emergency_contact_number,
        ...payload
      } = editApprovalForm;
      payload.emergency_contact = [emergency_contact_name, emergency_contact_number].filter(Boolean).join(' - ');

      const res = await fetch(`/api/onboarding/approval/${selectedApproval.employee_code}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Update failed');
      toast.success('Profile details saved successfully');
      // Refresh approvals
      loadApprovals();
      // Update selected approval with new data
      const combinedName = [editApprovalForm.first_name, editApprovalForm.middle_name, editApprovalForm.last_name].filter(Boolean).join(' ');
      setSelectedApproval(prev => ({ ...prev, ...payload, name: combinedName }));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRejectProfile = async () => {
    if (!window.confirm('Reject this profile? This permanently deletes the submitted record and revokes the invite — the person will need a brand new onboarding link.')) {
      return;
    }
    try {
      const res = await fetch(`/api/onboarding/reject/${selectedApproval.employee_code}`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reject profile');
      toast.success('Profile rejected and invite revoked');
      setSelectedApproval(null);
      loadApprovals();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleApprove = async (e) => {
    e.preventDefault();

    // ── Validation ──
    // Only validate fields that have values
    // Manager: only validate if filled
    if (approveForm.manager && !isNonEmpty(approveForm.manager)) {
      toast.error("Reporting manager name cannot be empty");
      return;
    }
    
    // Location: only validate if filled
    if (approveForm.location && !isNonEmpty(approveForm.location)) {
      toast.error("Location cannot be empty");
      return;
    }
    
    // Employee Code: only validate if filled
    if (approveForm.code && !isEmployeeCode(approveForm.code)) {
      toast.error("Employee code must be 3-20 letters, numbers, hyphens, or underscores");
      return;
    }
    
    // DOJ: only validate if filled
    if (approveForm.doj) {
      if (!isValidDate(approveForm.doj)) {
        toast.error("Date of joining is invalid");
        return;
      }
      
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('new_employee_code', approveForm.code || '');
      formData.append('doj', approveForm.doj || '');
      formData.append('reporting_manager', approveForm.manager || '');
      formData.append('employment_type', approveForm.type || 'Full Time');
      formData.append('pf_included', approveForm.pf || 'No');
      formData.append('mediclaim_included', approveForm.mediclaim || 'No');
      formData.append('location', approveForm.location || '');
      formData.append('notes', approveForm.notes || '');

      const res = await fetch(`/api/onboarding/approve/${selectedApproval.employee_code}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Activation failed');
      toast.success("Employee onboarded successfully");
      setSelectedApproval(null);
      loadApprovals();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inviteStatusStyle = {
    'Pending': 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    'Completed': 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    'Expired': 'bg-red-500/10 text-red-500 border border-red-500/20',
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7c3aed] mb-3">Onboarding Management</p>
          <h2 className="text-5xl font-black text-black tracking-tight leading-none">Onboarding Panel</h2>
        </div>
        
        <div onKeyDown={handleTabKeyNav} className={`flex gap-2 p-1.5 rounded-2xl border ${isLightMode ? 'bg-[#f5efff] border-[#ece2ff]' : 'bg-white/5 border-white/5'}`}>
            <button
              onClick={() => setActiveTab('invites')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'invites' 
                  ? (isLightMode ? 'bg-[#7c3aed] text-white shadow-md' : 'bg-primary text-black shadow-lg shadow-primary/20') 
                  : (isLightMode ? 'text-[#6b7280] hover:text-black' : 'text-white/40 hover:text-white')
              }`}
            >
               Outbound Invites
            </button>
            {canReviewSubmissions && (
              <button 
              onClick={() => setActiveTab('approvals')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                activeTab === 'approvals' 
                  ? (isLightMode ? 'bg-[#7c3aed] text-white shadow-md' : 'bg-primary text-black shadow-lg shadow-primary/20') 
                  : (isLightMode ? 'text-[#6b7280] hover:text-black' : 'text-white/40 hover:text-white')
              }`}
            >
              Pending Approvals
              {approvals.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white animate-pulse shadow-md shadow-red-500/30">
                  {approvals.length}
                </span>
              )}
            </button>
            )}
        </div>
      </div>

      {loading ? (
        <HorizontalLoader label="Synchronizing Persistence Layer..." />
      ) : activeTab === 'invites' ? (
        <div className="space-y-6 animate-fade-in-up">
           <div className={`flex justify-between items-center p-6 rounded-[2rem] border ${
             isLightMode 
               ? 'bg-white border-[#ebe4ff] shadow-[0_10px_40px_rgba(180,140,255,0.06)]' 
               : 'bg-white/5 border-white/5 shadow-2xl'
           }`}>
              <div className="flex gap-8 px-4">
                 {[
                   { label: 'Sent', val: invites.length, color: isLightMode ? 'text-[#8b5cf6]' : 'text-primary' },
                   { label: 'Pending', val: invites.filter(i => i.status === 'Pending').length, color: 'text-amber-500' },
                   { label: 'Completed', val: invites.filter(i => i.status === 'Completed').length, color: 'text-emerald-500' }
                 ].map((s, i) => (
                   <div key={i}>
                      <p className={`text-xl font-display font-black ${s.color}`}>{s.val}</p>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#8b8ba3]' : 'text-white/30'}`}>{s.label}</p>
                   </div>
                 ))}
              </div>
              {canSendInvite && (
                <button 
                  onClick={() => setShowForm(true)}
                  className={`flex items-center gap-3 px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all ${
                    isLightMode 
                      ? 'bg-[#7c3aed] text-white shadow-[0_10px_30px_rgba(139,92,246,0.15)] hover:opacity-95' 
                      : 'bg-primary text-black hover:bg-white'
                  }`}
                >
                  <Plus size={16} /> Onboard Employee
                </button>
              )}
           </div>

           <div className={`overflow-x-auto rounded-[2rem] border ${
             isLightMode
               ? 'bg-white border-[#ebe4ff] shadow-[0_10px_40px_rgba(180,140,255,0.06)]'
               : 'glass-panel border-white/5'
           }`}>
             <table className="w-full text-left min-w-[760px]">
  <thead className={`border-b ${isLightMode ? 'bg-[#faf7ff] border-[#f1ebff]' : 'bg-white/5 border-white/10'}`}>
    <tr>
      {['Identity', 'Designation', 'Access Role', 'Current Status', 'Initiated', 'Action'].map(h => (
        <th key={h} className={`px-6 py-5 text-[11px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#8b8ba3]' : 'text-white/30'}`}>{h}</th>
      ))}
    </tr>
  </thead>
  <tbody className={`divide-y ${isLightMode ? 'divide-[#f1ebff]' : 'divide-white/5'}`}>
    {invites.length === 0 ? (
      <tr>
        <td colSpan={6} className={`px-6 py-20 text-center text-[11px] uppercase font-black tracking-widest ${isLightMode ? 'text-[#b6b6c7]' : 'text-white/20'}`}>
          No active invite sequences in current sector
        </td>
      </tr>
    ) : invites.map((inv, i) => (
      <tr key={inv.id || i} className={`transition-colors group ${isLightMode ? 'hover:bg-[#faf7ff]' : 'hover:bg-white/[0.02]'}`}>
        <td className="px-6 py-5">
          <p className={`text-base font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>{inv.name}</p>
          <p className={`text-[11px] font-mono mt-1 ${isLightMode ? 'text-[#4b5563]' : 'text-white/50'}`}>{inv.email}</p>
        </td>
        <td className="px-6 py-5">
          <p className={`text-sm font-medium ${isLightMode ? 'text-black/80' : 'text-white/70'}`}>{inv.designation || 'N/A'}</p>
          <p className={`text-[10px] uppercase tracking-widest ${isLightMode ? 'text-[#4b5563]' : 'text-white/40'}`}>{inv.department || 'General'}</p>
        </td>
        <td className="px-6 py-5">
          <span className={`text-[11px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#8b5cf6]' : 'text-primary'}`}>{inv.role}</span>
        </td>
        <td className="px-6 py-5">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${inviteStatusStyle[inv.status] || 'bg-white/5 text-white/30'}`}>
            {inv.status}
          </span>
        </td>
        <td className={`px-6 py-5 text-[11px] font-mono ${isLightMode ? 'text-[#4b5563]' : 'text-white/30'}`}>
          {new Date(inv.created_at).toLocaleDateString()}
        </td>
        <td className="px-6 py-5">
          <div className="flex gap-2">
            {inv.status === 'Pending' && (
              <>
                <button
                  onClick={() => copyInviteLink(inv.token)}
                  title="Copy Invite Link"
                  className={`p-2 rounded-lg border transition-all ${
                    isLightMode
                      ? 'text-[#6b7280] bg-[#faf7ff] border-[#ebe4ff] hover:bg-[#f3e8ff] hover:text-[#8b5cf6]'
                      : 'text-white/40 bg-white/5 border-white/5 hover:text-primary hover:bg-white/10'
                  }`}
                >
                  <Link size={14} />
                </button>
                {canCancelInvite && (
                  <button
                    onClick={() => revokeInvite(inv.id)}
                    title="Revoke Invite"
                    className={`p-2 rounded-lg border transition-all ${
                      isLightMode
                        ? 'text-[#6b7280] bg-[#faf7ff] border-[#ebe4ff] hover:bg-red-50 hover:text-red-500 hover:border-red-100'
                        : 'text-white/40 bg-white/5 border-white/5 hover:text-error hover:bg-white/10'
                    }`}
                  >
                    <Ban size={14} />
                  </button>
                )}
                {canCancelInvite && (
                  <button
                    onClick={() => hardDeleteInvite(inv.id)}
                    title="Delete Invite"
                    className={`p-2 rounded-lg border transition-all ${
                      isLightMode
                        ? 'text-[#6b7280] bg-[#faf7ff] border-[#ebe4ff] hover:bg-red-50 hover:text-red-500 hover:border-red-100'
                        : 'text-white/40 bg-white/5 border-white/5 hover:text-error hover:bg-white/10'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
            {inv.status === 'Revoked' && (
              <button 
                onClick={() => hardDeleteInvite(inv.id)} 
                title="Delete Log"
                className={`p-2 rounded-lg border transition-all ${
                  isLightMode 
                    ? 'text-[#6b7280] bg-[#faf7ff] border-[#ebe4ff] hover:bg-red-50 hover:text-red-500 hover:border-red-100' 
                    : 'text-white/40 bg-white/5 border-white/5 hover:text-error hover:bg-white/10'
                }`}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
           </div>
        </div>
      ) : (
        /* Approvals Tab */
        <div className="space-y-6 animate-fade-in-up">
           <div className={`overflow-x-auto rounded-[2rem] border ${
             isLightMode
               ? 'bg-white border-[#ebe4ff] shadow-[0_10px_40px_rgba(180,140,255,0.06)]'
               : 'glass-panel border-white/5'
           }`}>
             <table className="w-full text-left min-w-[640px]">
               <thead className={`border-b ${isLightMode ? 'bg-[#faf7ff] border-[#f1ebff]' : 'bg-white/5 border-white/10'}`}>
                 <tr>
                   {['Candidate', 'Role', 'Invite Code', 'Status', 'Action'].map(h => (
                     <th key={h} className={`px-6 py-5 text-[9px] font-black uppercase tracking-widest ${isLightMode ? 'text-[#8b8ba3]' : 'text-white/30'}`}>{h}</th>
                   ))}
                 </tr>
               </thead>
               <tbody className={`divide-y ${isLightMode ? 'divide-[#f1ebff]' : 'divide-white/5'}`}>
                 {approvals.length === 0 ? (
                   <tr>
                     <td colSpan={5} className={`px-6 py-20 text-center text-[10px] uppercase font-black tracking-widest ${isLightMode ? 'text-[#b6b6c7]' : 'text-white/20'}`}>
                       Global personnel pipeline is clear
                     </td>
                   </tr>
                 ) : approvals.map((app, i) => (
                   <tr key={app.employee_code || i} className={`transition-colors group ${isLightMode ? 'hover:bg-[#faf7ff]' : 'hover:bg-white/[0.02]'}`}>
                     <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-lg overflow-hidden shrink-0 ${
                             isLightMode 
                               ? 'bg-[#f3e8ff] text-[#8b5cf6] border border-[#ebe4ff]' 
                               : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                           }`}>
                              {app.photo_path ? (
                                  <img src={app.photo_path.startsWith('http') ? app.photo_path : `/${app.photo_path.replace(/^\//, '')}`} className="w-full h-full object-cover" alt="" />
                              ) : (
                                  app.name?.[0] || '?'
                              )}
                           </div>
                           <div>
                              <p className={`text-sm font-bold ${isLightMode ? 'text-black' : 'text-white'}`}>{app.name}</p>
                              <p className={`text-[10px] font-mono mt-1 ${isLightMode ? 'text-[#6b7280]' : 'text-white/40'}`}>{app.email_id}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-6">
                        <p className={`text-xs font-medium ${isLightMode ? 'text-black/80' : 'text-white/70'}`}>{app.designation}</p>
                        <p className={`text-[9px] uppercase tracking-widest ${isLightMode ? 'text-[#8b8ba3]' : 'text-white/30'}`}>{app.team}</p>
                     </td>
                     <td className="px-6 py-6">
                        <span className={`text-[10px] font-black uppercase font-mono tracking-widest ${isLightMode ? 'text-[#8b5cf6]' : 'text-primary'}`}>{app.employee_code}</span>
                     </td>
                     <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-500"><BadgeCheck size={10} /> Identity Verified</span>
                            <span className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-500"><Clock size={10} /> Awaiting Save</span>
                        </div>
                     </td>
                     <td className="px-6 py-6 text-right">
                        {canReviewSubmissions && (
                          <button 
                            onClick={() => openApprovalReview(app)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group ${
                              isLightMode 
                                ? 'bg-[#faf7ff] border border-[#ebe4ff] text-[#6b7280] hover:bg-gradient-to-r hover:from-[#c084fc] hover:to-[#8b5cf6] hover:text-white' 
                                : 'bg-white/5 text-white hover:bg-primary hover:text-black'
                            }`}
                          >
                            Review Profile <ChevronRight size={14} className="inline ml-1 group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Invite Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className={`p-6 sm:p-10 w-full max-w-3xl space-y-6 scale-in-center rounded-[2.5rem] border max-h-[85vh] overflow-y-auto ${
            isLightMode 
              ? 'bg-white border-[#ebe4ff] shadow-[0_20px_50px_rgba(180,140,255,0.15)] animate-fade-in' 
              : 'glass-panel border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)]'
          }`}>
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isLightMode ? 'bg-[#f3e8ff] text-[#8b5cf6]' : 'bg-primary/10 text-primary'
              }`}><UserPlus size={24} /></div>
              <h3 className={`text-lg font-black uppercase tracking-tighter ${isLightMode ? 'text-black' : 'text-white'}`}>Outbound Sequence</h3>
            </div>
            
            <div className="space-y-4">
               <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>First Name</label>
                    <input
                      value={form.first_name}
                      onChange={e => setForm({...form, first_name: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="First name..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Middle Name</label>
                    <input
                      value={form.middle_name}
                      onChange={e => setForm({...form, middle_name: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="Middle name..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Last Name</label>
                    <input
                      value={form.last_name}
                      onChange={e => setForm({...form, last_name: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="Last name..."
                    />
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Employee Code</label>
                    <input
                      value={form.employee_code}
                      onChange={e => setForm({...form, employee_code: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="Auto-generated"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 whitespace-nowrap ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Father / Husband / Guardian</label>
                    <input
                      value={form.guardian_name}
                      onChange={e => setForm({...form, guardian_name: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="Guardian's name..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                      placeholder="Email address..."
                    />
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 flex-1">
                    <ComboBox
                      label="Designation"
                      options={dynDesignations.length > 0 ? dynDesignations : DESIGNATIONS}
                      value={form.designation}
                      onChange={val => setForm({...form, designation: val})}
                      placeholder="Select Designation..."
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <ComboBox
                      label="Department"
                      options={dynDepartments.length > 0 ? dynDepartments : DEPARTMENTS}
                      value={form.department}
                      onChange={val => setForm({...form, department: val})}
                      placeholder="Select Department..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Date of Joining</label>
                    <input
                      type="date"
                      value={form.doj}
                      onChange={e => setForm({...form, doj: e.target.value})}
                      className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                        isLightMode
                          ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                          : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                      }`}
                    />
                  </div>
               </div>
              <div className="space-y-1.5">
                 <label className={`text-[9px] font-black uppercase tracking-widest ml-2 ${isLightMode ? 'text-[#8b5cf6]' : 'text-white/30'}`}>Access Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className={`w-full text-xs px-5 py-4 rounded-xl outline-none transition-all ${
                      isLightMode
                        ? 'bg-[#faf7ff] border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                        : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                    }`}
                  >
                    {[
                      { id: 'org_admin', label: 'Org Admin (L2)' },
                      { id: 'manager', label: 'Manager (L3)' },
                      { id: 'employee', label: 'Employee (L4)' }
                    ].map(r => (
                      <option key={r.id} value={r.id} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{r.label}</option>
                    ))}
                  </select>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button 
                onClick={() => setShowForm(false)}
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isLightMode 
                    ? 'border border-[#ebe4ff] text-[#6b7280] hover:bg-[#faf7ff] hover:text-black' 
                    : 'border border-white/10 text-white/40 hover:text-white'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={sendInvite} disabled={submitting}
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all ${
                  isLightMode
                    ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg'
                    : 'bg-primary text-black shadow-xl shadow-primary/20'
                }`}
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval & Review Drawer */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
           <div className={`w-full max-w-4xl h-full border-l animate-slide-in-right overflow-y-auto pr-2 custom-scrollbar ${
             isLightMode ? 'bg-white border-[#ebe4ff]' : 'glass-panel border-white/10'
           }`}>
              <div className="p-10 space-y-10">
                 {/* Header */}
                 <div className="flex justify-between items-start">
                    <div className="flex gap-6 items-center">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-display font-black text-3xl overflow-hidden shrink-0 ${
                          isLightMode 
                            ? 'bg-[#f3e8ff] text-[#8b5cf6] border border-[#ebe4ff]' 
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}>
                           {selectedApproval.photo_path ? (
                               <img src={selectedApproval.photo_path.startsWith('http') ? selectedApproval.photo_path : `/${selectedApproval.photo_path.replace(/^\//, '')}`} className="w-full h-full object-cover" alt="" />
                           ) : (
                               selectedApproval.name?.[0]
                           )}
                        </div>
                        <div>
                           <h2 className={`text-3xl font-display font-black uppercase tracking-tighter italic leading-tight ${isLightMode ? 'text-black' : 'text-white'}`}>{selectedApproval.name}</h2>
                           <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 whitespace-nowrap">Pending Invite</span>
                           <p className={`font-black text-xs uppercase tracking-[0.3em] mt-2 italic ${isLightMode ? 'text-[#8b5cf6]' : 'text-primary'}`}>{selectedApproval.designation} // {selectedApproval.team}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                       <button
                         onClick={handleSaveApprovalEdit}
                         className={`flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                           isLightMode
                             ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-lg shadow-[#8b5cf6]/20'
                             : 'bg-primary text-black hover:bg-white shadow-lg shadow-primary/20'
                         }`}
                       >
                         <Save size={11} /> Save Changes
                       </button>
                       <button
                         onClick={handleRejectProfile}
                         className={`flex items-center justify-center gap-1.5 h-8 px-3.5 rounded-lg border text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                           isLightMode
                             ? 'bg-[#faf7ff] border-[#ebe4ff] text-[#6b7280] hover:bg-red-50 hover:text-red-500'
                             : 'bg-white/5 border-white/10 text-white/30 hover:text-error hover:bg-error/10'
                         }`}
                       >
                         <Trash2 size={11} /> Reject Profile
                       </button>
                    </div>
                 </div>

                 {/* Full Onboarding Profile */}
                 <div className="space-y-6">
                    <SectionHeader icon={User} label="Identity" isLightMode={isLightMode} />
                    <div className={`space-y-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="First Name" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.first_name || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, first_name: e.target.value }))}
                            className={`w-full text-sm font-bold px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                            placeholder="First name"
                          />
                        </Field>
                        <Field label="Middle Name" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.middle_name || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, middle_name: e.target.value }))}
                            className={`w-full text-sm font-bold px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                            placeholder="Middle name"
                          />
                        </Field>
                        <Field label="Last Name" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.last_name || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, last_name: e.target.value }))}
                            className={`w-full text-sm font-bold px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                            placeholder="Last name"
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Field label="Father / Husband / Guardian" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.guardian_name || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, guardian_name: e.target.value }))}
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                            placeholder="Guardian's name"
                          />
                        </Field>
                        <Field label="Date of Birth" isLightMode={isLightMode}>
                          <input
                            type="date"
                            value={editApprovalForm?.dob || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, dob: e.target.value }))}
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                          />
                        </Field>
                        <Field label="Employee Code" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.employee_code || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, employee_code: e.target.value }))}
                            className={`w-full text-xs font-mono px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode
                                ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                                : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                          />
                        </Field>
                      </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <SectionHeader icon={Phone} label="Contact" isLightMode={isLightMode} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <Field label="Email" isLightMode={isLightMode}>
                        <input
                          type="email"
                          value={editApprovalForm?.email_id || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, email_id: e.target.value }))}
                          className={`w-full text-xs font-mono px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Enter email address"
                        />
                      </Field>
                      <Field label="Contact Number" isLightMode={isLightMode}>
                        <input
                          type="text"
                          value={editApprovalForm?.contact_number || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, contact_number: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Contact number"
                        />
                      </Field>
                      <Field label="Emergency Contact Name" isLightMode={isLightMode}>
                        <input
                          type="text"
                          value={editApprovalForm?.emergency_contact_name || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Emergency contact name"
                        />
                      </Field>
                      <Field label="Emergency Contact Number" isLightMode={isLightMode}>
                        <input
                          type="text"
                          value={editApprovalForm?.emergency_contact_number || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, emergency_contact_number: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="e.g. +91 9876543210"
                        />
                      </Field>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <SectionHeader icon={MapPin} label="Address" isLightMode={isLightMode} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <Field label="Current Address" isLightMode={isLightMode}>
                        <textarea
                          value={editApprovalForm?.current_address || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, current_address: e.target.value }))}
                          rows={2}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all resize-none ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Current address"
                        />
                      </Field>
                      <Field label="Permanent Address" isLightMode={isLightMode}>
                        <textarea
                          value={editApprovalForm?.permanent_address || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, permanent_address: e.target.value }))}
                          rows={2}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all resize-none ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Permanent address"
                        />
                      </Field>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <SectionHeader icon={Briefcase} label="Role Parameters" isLightMode={isLightMode} />
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <Field label="Designation" isLightMode={isLightMode}>
                        <ComboBox
                          options={dynDesignations.length > 0 ? dynDesignations : DESIGNATIONS}
                          value={editApprovalForm?.designation || ''}
                          onChange={val => setEditApprovalForm(prev => ({ ...prev, designation: val }))}
                          placeholder="Select Designation..."
                        />
                      </Field>
                      <Field label="Team / Department" isLightMode={isLightMode}>
                        <ComboBox
                          options={dynDepartments.length > 0 ? dynDepartments : DEPARTMENTS}
                          value={editApprovalForm?.team || ''}
                          onChange={val => setEditApprovalForm(prev => ({ ...prev, team: val }))}
                          placeholder="Select Department..."
                        />
                      </Field>
                      <Field label="Access Role" isLightMode={isLightMode}>
                        <select
                          value={editApprovalForm?.role || 'employee'}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, role: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                        >
                          {[
                            { id: 'org_admin', label: 'Org Admin (L2)' },
                            { id: 'manager', label: 'Manager (L3)' },
                            { id: 'employee', label: 'Employee (L4)' }
                          ].map(r => (
                            <option key={r.id} value={r.id} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{r.label}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <SectionHeader icon={BadgeCheck} label="Skills" isLightMode={isLightMode} />
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <Field label="Primary Skillset" isLightMode={isLightMode}>
                        <input
                          type="text"
                          value={editApprovalForm?.primary_skillset || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, primary_skillset: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="e.g. React, Node.js"
                        />
                      </Field>
                      <Field label="Secondary Skillset" isLightMode={isLightMode}>
                        <input
                          type="text"
                          value={editApprovalForm?.secondary_skillset || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, secondary_skillset: e.target.value }))}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                            isLightMode
                              ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]'
                              : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="e.g. Docker, AWS"
                        />
                      </Field>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <SectionHeader icon={GraduationCap} label="Education" isLightMode={isLightMode} />
                      <button
                        type="button"
                        onClick={addApprovalEducation}
                        className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                          isLightMode ? 'bg-[#f3e8ff] text-[#8b5cf6] hover:bg-[#ebe0ff]' : 'bg-primary/10 text-primary hover:bg-primary/20'
                        }`}
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                    <div className={`space-y-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      {(editApprovalForm?.education_details || []).map((edu, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_90px_90px_32px] gap-2 items-end">
                          <Field label="Degree" isLightMode={isLightMode}>
                            <input
                              type="text"
                              value={edu.degree || ''}
                              onChange={e => updateApprovalEducation(idx, 'degree', e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-xl outline-none transition-all ${
                                isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            />
                          </Field>
                          <Field label="University" isLightMode={isLightMode}>
                            <input
                              type="text"
                              value={edu.university || ''}
                              onChange={e => updateApprovalEducation(idx, 'university', e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-xl outline-none transition-all ${
                                isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            />
                          </Field>
                          <Field label="Year" isLightMode={isLightMode}>
                            <input
                              type="text"
                              value={edu.year || ''}
                              onChange={e => updateApprovalEducation(idx, 'year', e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-xl outline-none transition-all ${
                                isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            />
                          </Field>
                          <Field label="%" isLightMode={isLightMode}>
                            <input
                              type="text"
                              value={edu.percentage || ''}
                              onChange={e => updateApprovalEducation(idx, 'percentage', e.target.value)}
                              className={`w-full text-xs px-3 py-2 rounded-xl outline-none transition-all ${
                                isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            />
                          </Field>
                          <button
                            type="button"
                            onClick={() => removeApprovalEducation(idx)}
                            className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all ${
                              isLightMode ? 'text-[#b0a8c5] hover:bg-red-50 hover:text-red-500' : 'text-white/30 hover:bg-error/10 hover:text-error'
                            }`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <SectionHeader icon={FileText} label="Documents" isLightMode={isLightMode} />
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      {[
                        { label: 'Photo', docType: 'photo', path: editApprovalForm?.photo_path },
                        { label: 'CV / Resume', docType: 'cv', path: editApprovalForm?.cv_path },
                        { label: 'ID Proof', docType: 'id_proof', path: editApprovalForm?.id_proofs },
                      ].map(doc => (
                        <Field key={doc.label} label={doc.label} isLightMode={isLightMode}>
                          {doc.path ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => viewApprovalDocument(doc.docType, doc.path)}
                                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all ${
                                  isLightMode ? 'bg-white border border-[#ebe4ff] text-[#8b5cf6] hover:border-[#c084fc]' : 'glass-panel border border-white/5 text-primary hover:border-primary/40'
                                }`}
                              >
                                <ExternalLink size={12} /> View
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadApprovalDocument(doc.docType, doc.path, doc.label)}
                                title="Download file"
                                className={`flex items-center justify-center h-9 w-9 rounded-xl transition-all ${
                                  isLightMode ? 'bg-white border border-[#ebe4ff] text-[#8b5cf6] hover:border-[#c084fc]' : 'glass-panel border border-white/5 text-primary hover:border-primary/40'
                                }`}
                              >
                                <Download size={12} />
                              </button>
                            </div>
                          ) : (
                            <p className={`text-xs px-4 py-2 ${isLightMode ? 'text-[#b0a8c5]' : 'text-white/20'}`}>Not uploaded</p>
                          )}
                        </Field>
                      ))}
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <SectionHeader icon={CreditCard} label="Financial & Benefits" isLightMode={isLightMode} />
                      <span className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isLightMode ? 'bg-amber-50 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                        <Lock size={9} /> Bank details locked
                      </span>
                    </div>
                    <div className={`space-y-4 p-6 rounded-3xl border ${
                      isLightMode
                        ? 'bg-[#faf7ff] border-[#f1ebff]'
                        : 'bg-white/5 border-white/5'
                    }`}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Bank Name" isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.bank_name || ''}
                            disabled
                            readOnly
                            title="Bank details cannot be edited from this panel"
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none cursor-not-allowed ${
                              isLightMode ? 'bg-[#f1eef7] border border-[#ebe4ff] text-[#8b8ba3]' : 'bg-white/[0.03] border border-white/5 text-white/30'
                            }`}
                          />
                        </Field>
                        <Field label="Bank Account No." isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.bank_account_no || ''}
                            disabled
                            readOnly
                            title="Bank details cannot be edited from this panel"
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none cursor-not-allowed ${
                              isLightMode ? 'bg-[#f1eef7] border border-[#ebe4ff] text-[#8b8ba3]' : 'bg-white/[0.03] border border-white/5 text-white/30'
                            }`}
                          />
                        </Field>
                        <Field label="PAN No." isLightMode={isLightMode}>
                          <input
                            type="text"
                            value={editApprovalForm?.pan_no || ''}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, pan_no: e.target.value }))}
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                          />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="PF Included" isLightMode={isLightMode}>
                          <select
                            value={editApprovalForm?.pf_included || 'No'}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, pf_included: e.target.value }))}
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                          >
                            {['Yes', 'No'].map(t => <option key={t} value={t} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Mediclaim Included" isLightMode={isLightMode}>
                          <select
                            value={editApprovalForm?.mediclaim_included || 'No'}
                            onChange={e => setEditApprovalForm(prev => ({ ...prev, mediclaim_included: e.target.value }))}
                            className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all ${
                              isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                            }`}
                          >
                            {['Yes', 'No'].map(t => <option key={t} value={t} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{t}</option>)}
                          </select>
                        </Field>
                      </div>
                      <Field label="Notes" isLightMode={isLightMode}>
                        <textarea
                          value={editApprovalForm?.notes || ''}
                          onChange={e => setEditApprovalForm(prev => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          className={`w-full text-xs px-4 py-2 rounded-xl outline-none transition-all resize-none ${
                            isLightMode ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                          }`}
                          placeholder="Any additional notes or remarks..."
                        />
                      </Field>
                    </div>
                 </div>

                 {/* Approval Form */}
                 <div className="space-y-6">
                    <SectionHeader icon={ShieldAlert} label="Approval Workflow" isLightMode={isLightMode} />
                    <form onSubmit={handleApprove} className={`space-y-6 p-8 rounded-3xl border ${
                      isLightMode 
                        ? 'bg-[#faf7ff] border-[#f1ebff]' 
                        : 'bg-white/5 border-white/5'
                    }`}>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Field label="Reporting Manager" isLightMode={isLightMode}>
                            <ComboBox 
                              options={activeManagers}
                              value={approveForm.manager}
                              onChange={val => setApproveForm({...approveForm, manager: val})}
                              placeholder="Select Manager..."
                            />
                          </Field>
                          <Field label="Location" isLightMode={isLightMode}>
                            <ComboBox 
                              options={locations}
                              value={approveForm.location}
                              onChange={val => setApproveForm({...approveForm, location: val})}
                              placeholder="Select Location..."
                            />
                          </Field>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Field label="New Employee Code" isLightMode={isLightMode}>
                            <input 
                              value={approveForm.code} 
                              onChange={e => setApproveForm({...approveForm, code: e.target.value})}
                              className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all ${
                                isLightMode 
                                  ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                                  : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                              placeholder="e.g., EMP-001"
                            />
                          </Field>
                          <Field label="Date of Joining" isLightMode={isLightMode}>
                            <input 
                              type="date"
                              value={approveForm.doj} 
                              onChange={e => setApproveForm({...approveForm, doj: e.target.value})}
                              className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all ${
                                isLightMode 
                                  ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                                  : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            />
                          </Field>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <Field label="Employment Type" isLightMode={isLightMode}>
                            <select 
                              value={approveForm.type}
                              onChange={e => setApproveForm({...approveForm, type: e.target.value})}
                              className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all ${
                                isLightMode 
                                  ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                                  : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            >
                              {['Full Time', 'Part Time', 'Contract', 'Intern', 'Consultant'].map(t => (
                                <option key={t} value={t} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{t}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="PF Included" isLightMode={isLightMode}>
                            <select 
                              value={approveForm.pf}
                              onChange={e => setApproveForm({...approveForm, pf: e.target.value})}
                              className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all ${
                                isLightMode 
                                  ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                                  : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            >
                              {['Yes', 'No'].map(t => (
                                <option key={t} value={t} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{t}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Mediclaim Included" isLightMode={isLightMode}>
                            <select 
                              value={approveForm.mediclaim}
                              onChange={e => setApproveForm({...approveForm, mediclaim: e.target.value})}
                              className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all ${
                                isLightMode 
                                  ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                                  : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                              }`}
                            >
                              {['Yes', 'No'].map(t => (
                                <option key={t} value={t} className={isLightMode ? 'text-black bg-white' : 'text-white bg-[#080f1f]'}>{t}</option>
                              ))}
                            </select>
                          </Field>
                       </div>

                       <Field label="Additional Notes" isLightMode={isLightMode}>
                         <textarea 
                           value={approveForm.notes}
                           onChange={e => setApproveForm({...approveForm, notes: e.target.value})}
                           className={`w-full text-xs px-5 py-3.5 rounded-xl outline-none transition-all resize-none min-h-[80px] ${
                             isLightMode 
                               ? 'bg-white border border-[#ebe4ff] text-black focus:border-[#c084fc]' 
                               : 'glass-panel border border-white/5 text-white bg-black/20 focus:border-primary/40'
                           }`}
                           placeholder="Any additional notes or remarks..."
                         />
                       </Field>

                       <div className="flex gap-4 pt-6">
                          <button 
                            type="button"
                            onClick={() => setSelectedApproval(null)}
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              isLightMode 
                                ? 'border border-[#ebe4ff] text-[#6b7280] hover:bg-[#faf7ff] hover:text-black' 
                                : 'border border-white/10 text-white/40 hover:text-white'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all ${
                              isLightMode
                                ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg'
                                : 'bg-primary text-black shadow-xl shadow-primary/20'
                            }`}
                          >
                            {submitting ? 'Activating...' : 'Approve & Onboard'}
                          </button>
                       </div>
                    </form>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}