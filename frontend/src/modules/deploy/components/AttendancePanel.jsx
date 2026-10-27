import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';
import { usePermissions } from '../../../core/auth/usePermissions';
import { P } from '../../../core/permissions';
import { 
  Clock, CheckCircle, XCircle, LogIn, LogOut, Calendar, Users, BarChart3, Activity, Zap, Shield, 
  Edit, Save, Plus, Search, AlertCircle, Sparkles, Gift, Download, FileSpreadsheet, X, Loader2,
  CheckCircle2, Clock3, Award, TrendingUp, CalendarOff, Filter, ChevronDown, ArrowUpRight, 
  Sun, Moon, Briefcase, Mail, Phone, Building2, UserCheck, Layers, PieChart, ChevronRight, FileText, Info
} from 'lucide-react';
import HorizontalLoader from '../../../core/components/HorizontalLoader';
import useEscapeClose from '../../../core/hooks/useEscapeClose';
import useTabListKeyNav from '../../../core/hooks/useTabListKeyNav';
import CorrectionSystem from './CorrectionSystem';
import HolidayManagementPanel from './HolidayManagementPanel';
import { getInitials } from '../../../core/utils/nameHelpers';

export default function AttendancePanel({ mode }) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Granular Attendance Permissions

  const canReqCorrection = hasPermission(P.DEPLOY_ATT_REQ_CORRECTION);
  const canAppCorrection = hasPermission(P.DEPLOY_ATT_APP_CORRECTION);
  const canReqLeave = hasPermission(P.DEPLOY_LEAVES_REQUEST);
  const canAppLeave = hasPermission(P.DEPLOY_LEAVES_APPROVE);
  const canManagePolicies = hasPermission(P.DEPLOY_ATT_MANAGE_POLICIES);
  const canViewAll = hasPermission(P.DEPLOY_ATT_VIEW_ALL) || user?.role === 'org_admin' || user?.role === 'admin';
  const canViewTeam = hasPermission(P.DEPLOY_ATT_VIEW_TEAM) || canViewAll;

  const isAdmin = mode === 'admin';
  const isEmployee = mode === 'employee';
  const [status, setStatus] = useState(null);
  const [correctionQueue, setCorrectionQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [dailyLog, setDailyLog] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [employeeTab, setEmployeeTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [workLog, setWorkLog] = useState('');
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [adminTab, setAdminTab] = useState('today');
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [leaveForm, setLeaveForm] = useState({ start_date: '', end_date: '', leave_type: 'Leave', reason: '', start_day_type: 'Full Day', end_day_type: 'Full Day' });
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ employee_code: '', date: new Date().toISOString().split('T')[0], clock_in: '', clock_out: '', work_log: '' });

  // Download Report States
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadPeriodType, setDownloadPeriodType] = useState('cycle'); // 'cycle' or 'custom'
  const [downloadCycle, setDownloadCycle] = useState(new Date().getDate() > 15 ? 2 : 1);
  const [downloadYear, setDownloadYear] = useState(new Date().getFullYear());
  const [downloadMonth, setDownloadMonth] = useState(new Date().getMonth() + 1);
  const [downloadStartDate, setDownloadStartDate] = useState('');
  const [downloadEndDate, setDownloadEndDate] = useState('');
  const [downloadScope, setDownloadScope] = useState('org');
  const [isDownloading, setIsDownloading] = useState(false);

  // New States
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedEmployeeHistory, setSearchedEmployeeHistory] = useState([]);

  useEscapeClose(() => setShowLeaveForm(false), showLeaveForm);
  useEscapeClose(() => setShowClockOutModal(false), showClockOutModal);
  useEscapeClose(() => setEditingRecord(null), !!editingRecord);
  useEscapeClose(() => setSelectedLog(null), !!selectedLog);
  useEscapeClose(() => !isDownloading && setShowDownloadModal(false), showDownloadModal);
  const handleTabKeyNav = useTabListKeyNav();
  const [searchedEmployeeLeaves, setSearchedEmployeeLeaves] = useState([]);
  const [searchedEmployeeBalance, setSearchedEmployeeBalance] = useState(null);
  const [employeeDetailTab, setEmployeeDetailTab] = useState('attendance'); // 'attendance', 'leaves', 'quota'
  const [recordFilterPeriod, setRecordFilterPeriod] = useState('all'); // 'all', 'this_month', '30d', '90d'
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('all'); // 'all', 'half_day', 'Approved', 'Pending', 'Rejected'
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all'); // 'all', 'Present', 'Half Day', 'Absent', 'Leave'
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);  
  
  const panelStyle =
  "bg-white border border-[#ebe4ff] rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)]";

  const inputStyle =
  "w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#c084fc] transition-all";

  const buttonPrimary =
  "bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-[0_12px_30px_rgba(180,140,255,0.28)]";

  const buttonSecondary =
  "bg-white border border-[#ebe4ff] text-[#6b7280] hover:bg-[#faf7ff]";

  const tableHeader =
  "bg-[#f5efff] border-b border-[#ece2ff]";

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (isAdmin && adminTab === 'heatmap') {
        fetchSummary();
    }
  }, [adminTab, selectedMonth, selectedYear, isAdmin]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const parseResJson = async (res) => {
    if (!res.ok) {
      let msg = 'Request failed';
      try {
        const data = await res.json();
        msg = data.detail || msg;
      } catch {
        try {
          const text = await res.text();
          msg = text || res.statusText || msg;
        } catch {
          msg = res.statusText || msg;
        }
      }
      throw new Error(msg);
    }
    return res.json();
  };

  const fetchSummary = async () => {
      try {
          const res = await fetch(`/api/attendance/admin/summary?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' });
          const data = await parseResJson(res);
          setAttendanceSummary(Array.isArray(data) ? data : []);
      } catch (e) { toast.error(e.message || 'Failed to load summary'); }
  };

  const loadData = async () => {
  setLoading(true);
  try {
    const fetchSafe = (url, fallback = []) =>
      fetch(url, { credentials: 'include' })
        .then(r => r.ok ? r.json() : fallback)
        .catch(() => fallback);

    if (user?.employee_code) {
        const [s, h, b, ml, hl] = await Promise.all([
          fetchSafe('/api/attendance/status', null),
          fetchSafe('/api/attendance/history', []),
          fetchSafe('/api/attendance/leave/balance', null),
          fetchSafe('/api/attendance/leave/my-requests', []),
          fetchSafe('/api/attendance/holidays', [])
        ]);
        setStatus(s);
        setHistory(Array.isArray(h) ? h : []);
        setLeaveBalance(b);
        setMyLeaves(Array.isArray(ml) ? ml : []);
        setHolidaysList(Array.isArray(hl) ? hl : []);
    }

    if (isAdmin) {
      const [al, dl, el, cq, hl] = await Promise.all([
        fetchSafe('/api/attendance/leave/all-requests', []),
        fetchSafe('/api/attendance/admin/today', []),
        fetchSafe('/api/employees', []),
        fetchSafe('/api/attendance/correction/pending-requests', []),
        fetchSafe('/api/attendance/holidays', [])
      ]);
      setAllLeaves(Array.isArray(al) ? al : []);
      setDailyLog(Array.isArray(dl) ? dl : []);
      setHolidaysList(Array.isArray(hl) ? hl : []);
      
      // ── FILTER ACTIVE EMPLOYEES (SAME LOGIC AS ASSETS PANEL) ──
      const employeeList = Array.isArray(el) ? el : [];
      const active = employeeList.filter(emp => 
        emp.employment_status === 'Active' || 
        emp.employment_status === 'active' ||
        emp.is_active === 1 ||
        emp.is_active === true
      );
      
      setEmployees(employeeList);
      setActiveEmployees(active);
      setCorrectionQueue(Array.isArray(cq) ? cq : []);
    }
  } catch (e) { 
      toast.error(e.message || 'Failed to load attendance data'); 
  } finally { 
      setLoading(false); 
  }
};

  const clockIn = async () => {
    try {
      const now = new Date();
      const local_date = now.toLocaleDateString('en-CA');
      const local_time = now.toTimeString().split(' ')[0];
      
      const res = await fetch('/api/attendance/clock-in', { 
          method: 'POST', 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ local_date, local_time })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Clock in failed');
      toast.success('Clocked in!');
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const clockOut = async () => {
    try {
      const now = new Date();
      const local_date = now.toLocaleDateString('en-CA');
      const local_time = now.toTimeString().split(' ')[0];

      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            work_log: workLog || 'No log provided',
            local_date,
            local_time
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Clock out failed');
      toast.success('Clocked out!');
      setWorkLog('');
      loadData();
      setShowClockOutModal(false);
    } catch (e) { toast.error(e.message); }
  };

  const applyLeave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...leaveForm, duration_days: durationDays };
      const res = await fetch('/api/attendance/leave/apply', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Application failed');
      toast.success(data.message);
      setShowLeaveForm(false);
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const leaveAction = async (id, action) => {
    try {
      const fd = new FormData();
      fd.append('action', action);
      const res = await fetch(`/api/attendance/leave/action/${id}`, { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Action failed');
      }
      toast.success(action === 'Approved' ? "Clearance Granted" : "Application Rejected");
      loadData();
    } catch (e) { toast.error(e.message); }
  };

  const saveAttendanceEdit = async () => {
    try {
        const res = await fetch('/api/attendance/admin/edit', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });
        if (!res.ok) throw new Error();
        toast.success("Changes Saved");
        setEditingRecord(null);
        setEditForm({ employee_code: '', date: new Date().toISOString().split('T')[0], clock_in: '', clock_out: '', work_log: '' });
        loadData();
    } catch {
        toast.error("Couldn't Save Changes");
    }
  };

  const openDownloadModal = (presetMonth = null, presetYear = null) => {
    const y = presetYear || selectedYear || new Date().getFullYear();
    const m = presetMonth || selectedMonth || (new Date().getMonth() + 1);
    setDownloadYear(y);
    setDownloadMonth(m);
    
    const numDays = new Date(y, m, 0).getDate();
    const mStr = String(m).padStart(2, '0');
    setDownloadStartDate(`${y}-${mStr}-01`);
    setDownloadEndDate(`${y}-${mStr}-${String(numDays).padStart(2, '0')}`);
    
    if (!canViewAll) {
      setDownloadScope('team');
    }
    setShowDownloadModal(true);
  };

  const setQuickRange = (rangeType) => {
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    if (rangeType === 'last7') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setDownloadStartDate(formatDate(start));
      setDownloadEndDate(formatDate(today));
    } else if (rangeType === 'last14') {
      const start = new Date(today);
      start.setDate(today.getDate() - 13);
      setDownloadStartDate(formatDate(start));
      setDownloadEndDate(formatDate(today));
    } else if (rangeType === 'thisMonth') {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const numDays = new Date(y, m, 0).getDate();
      setDownloadStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
      setDownloadEndDate(`${y}-${String(m).padStart(2, '0')}-${String(numDays).padStart(2, '0')}`);
    } else if (rangeType === 'lastMonth') {
      const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const numDays = new Date(y, m, 0).getDate();
      setDownloadStartDate(`${y}-${String(m).padStart(2, '0')}-01`);
      setDownloadEndDate(`${y}-${String(m).padStart(2, '0')}-${String(numDays).padStart(2, '0')}`);
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const params = new URLSearchParams();

      if (downloadPeriodType === 'custom') {
        if (!downloadStartDate || !downloadEndDate) {
          toast.error('Please select both Start Date and End Date');
          setIsDownloading(false);
          return;
        }
        if (downloadStartDate > downloadEndDate) {
          toast.error('Start date cannot be after end date');
          setIsDownloading(false);
          return;
        }
        params.set('start_date', downloadStartDate);
        params.set('end_date', downloadEndDate);
      } else {
        params.set('year', downloadYear.toString());
        params.set('month', downloadMonth.toString());
        if (downloadCycle === 1 || downloadCycle === 2) {
          params.set('cycle', downloadCycle.toString());
        }
      }

      const scopeToUse = canViewAll ? downloadScope : 'team';
      params.set('scope', scopeToUse);

      const res = await fetch(`/api/attendance/report/download-excel?${params.toString()}`, {
        credentials: 'include'
      });

      if (!res.ok) {
        let errMessage = 'Failed to generate Excel report';
        try {
          const errData = await res.json();
          errMessage = errData.detail || errMessage;
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      const blob = await res.blob();
      
      let filename = 'Attendance_Report.xlsx';
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      toast.success('Attendance report (.xlsx) downloaded successfully!');
      setShowDownloadModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to download report');
    } finally {
      setIsDownloading(false);
    }
  };

  const isWithinLast7Days = (dateStr) => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const d = new Date(dateStr);
      d.setHours(0,0,0,0);
      const diffTime = Math.abs(today - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
  };

  const searchEmployeeRecords = async (code) => {
    if (!code) return;
    setIsSearching(true);
    try {
      const [h, l, b] = await Promise.all([
        fetch(`/api/attendance/admin/employee/${code}/history?limit=365`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        fetch(`/api/attendance/admin/employee/${code}/leaves`, { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        fetch(`/api/attendance/admin/employee/${code}/balance`, { credentials: 'include' }).then(r => r.ok ? r.json() : null)
      ]);
      setSearchedEmployeeHistory(Array.isArray(h) ? h : []);
      setSearchedEmployeeLeaves(Array.isArray(l) ? l : []);
      setSearchedEmployeeBalance(b && typeof b === 'object' ? b : null);
    } catch (e) {
      toast.error(e.message || 'Failed to load employee records');
    } finally {
      setIsSearching(false);
    }
  };

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '--:--';
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return timeStr;
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Calculations for the inspected employee
  const employeeStats = useMemo(() => {
    if (!selectedEmployee) return null;

    // Filter by period if needed
    const filterByDate = (dateStr) => {
      if (!dateStr || recordFilterPeriod === 'all') return true;
      const d = new Date(dateStr);
      const now = new Date();
      if (recordFilterPeriod === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (recordFilterPeriod === '30d') {
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 30;
      }
      if (recordFilterPeriod === '90d') {
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90;
      }
      return true;
    };

    const filteredLogs = searchedEmployeeHistory.filter(h => filterByDate(h.date));
    const filteredLeaves = searchedEmployeeLeaves.filter(l => filterByDate(l.start_date) || filterByDate(l.end_date));

    // Attendance Log metrics
    const presentLogs = filteredLogs.filter(h => {
      const s = (h.status || '').toLowerCase();
      return s === 'present' || s === 'on time' || s.includes('present');
    });
    const halfDayLogs = filteredLogs.filter(h => {
      const s = (h.status || '').toLowerCase();
      return s === 'half day' || s.includes('half');
    });
    const absentLogs = filteredLogs.filter(h => {
      const s = (h.status || '').toLowerCase();
      return s === 'absent';
    });
    const leaveLogs = filteredLogs.filter(h => {
      const s = (h.status || '').toLowerCase();
      return s === 'leave';
    });

    const totalHoursWorked = filteredLogs.reduce((acc, h) => {
      if (typeof h.duration_hours === 'number') return acc + h.duration_hours;
      if (h.clock_in && h.clock_out) {
        try {
          const t1 = new Date(`1970-01-01T${h.clock_in}`);
          const t2 = new Date(`1970-01-01T${h.clock_out}`);
          let diff = (t2 - t1) / (1000 * 3600);
          if (diff < 0) diff += 24;
          return acc + Math.max(0, diff);
        } catch {
          return acc;
        }
      }
      return acc;
    }, 0);

    // Leave metrics (with explicit Half-Day detection)
    const approvedLeaves = filteredLeaves.filter(l => l.status === 'Approved');
    const pendingLeaves = filteredLeaves.filter(l => (l.status || 'Pending') === 'Pending');
    const rejectedLeaves = filteredLeaves.filter(l => l.status === 'Rejected');

    // Total leaves taken (in days)
    const totalLeaveDays = approvedLeaves.reduce((acc, l) => acc + (parseFloat(l.duration_days) || 1), 0);

    // Half days in leaves: duration_days === 0.5 or start/end day type != Full Day
    const isHalfDayLeave = (l) => {
      const dur = parseFloat(l.duration_days);
      const sType = (l.start_day_type || '').toLowerCase();
      const eType = (l.end_day_type || '').toLowerCase();
      return dur === 0.5 || sType.includes('half') || eType.includes('half') || (dur > 0 && dur % 1 !== 0);
    };

    const halfDayLeavesList = filteredLeaves.filter(isHalfDayLeave);
    const approvedHalfDayLeaves = approvedLeaves.filter(isHalfDayLeave);
    const totalHalfDayLeavesCount = approvedHalfDayLeaves.length;
    const totalHalfDayLeaveDays = approvedHalfDayLeaves.reduce((acc, l) => acc + (parseFloat(l.duration_days) || 0.5), 0);

    // Full day leaves
    const fullDayLeavesCount = approvedLeaves.filter(l => !isHalfDayLeave(l)).length;

    // Combined half-days (Half-day attendance logs + Half-day leaves)
    const totalCombinedHalfDays = halfDayLogs.length + totalHalfDayLeavesCount;

    // Leave Balance
    const quotaTotal = searchedEmployeeBalance?.total_leaves ?? 18;
    const quotaUsed = searchedEmployeeBalance?.used_leaves ?? totalLeaveDays;
    const quotaAvailable = Math.max(0, quotaTotal - quotaUsed);
    const quotaExtended = searchedEmployeeBalance?.extended_leaves ?? 0;

    // Attendance Rate
    const effectiveDays = presentLogs.length + (halfDayLogs.length * 0.5);
    const attendanceRate = (presentLogs.length + halfDayLogs.length + absentLogs.length) > 0 
      ? Math.min(100, Math.round((effectiveDays / Math.max(1, effectiveDays + absentLogs.length)) * 100))
      : 100;

    return {
      filteredLogs,
      filteredLeaves,
      presentCount: presentLogs.length,
      halfDayLogsCount: halfDayLogs.length,
      absentCount: absentLogs.length,
      leaveLogsCount: leaveLogs.length,
      totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
      avgHoursPerDay: (presentLogs.length + halfDayLogs.length) > 0 
        ? (Math.round((totalHoursWorked / (presentLogs.length + halfDayLogs.length)) * 10) / 10)
        : 0,
      totalLeaveDays: Math.round(totalLeaveDays * 10) / 10,
      totalHalfDayLeavesCount,
      totalHalfDayLeaveDays: Math.round(totalHalfDayLeaveDays * 10) / 10,
      halfDayLeavesList,
      fullDayLeavesCount,
      totalCombinedHalfDays,
      approvedLeavesCount: approvedLeaves.length,
      pendingLeavesCount: pendingLeaves.length,
      rejectedLeavesCount: rejectedLeaves.length,
      quotaTotal,
      quotaUsed: Math.round(quotaUsed * 10) / 10,
      quotaAvailable: Math.round(quotaAvailable * 10) / 10,
      quotaExtended,
      attendanceRate
    };
  }, [selectedEmployee, searchedEmployeeHistory, searchedEmployeeLeaves, searchedEmployeeBalance, recordFilterPeriod]);

  // Compute frontend matrix dashboard stats from existing data safely
  let totalPresent = 0;
  let totalLeave = 0;
  let totalHalfDay = 0;
  let totalAbsent = 0;

  const localTodayStr = new Date().toLocaleDateString('en-CA');
  
  attendanceSummary.forEach(emp => {
    if (emp && Array.isArray(emp.days)) {
      emp.days.forEach(d => {
        if (d.date === localTodayStr) {
          if (d.status === 'Present' || d.status === 'Active') totalPresent++;
          else if (d.status === 'Leave') totalLeave++;
          else if (d.status.startsWith('Half Day Leave')) totalLeave += 0.5;
          else if (d.status.startsWith('Half Day')) totalHalfDay++;
          else if (d.status === 'Absent') totalAbsent++;
        }
      });
    }
  });

  const isSingleDay = !leaveForm.end_date || leaveForm.start_date === leaveForm.end_date;
  let durationDays = 0;
  let excludedHolidayCount = 0;
  let holidayNamesInRange = [];

  if (leaveForm.start_date && leaveForm.end_date) {
    const s = new Date(leaveForm.start_date);
    const e = new Date(leaveForm.end_date);
    if (e >= s) {
      const holidayDatesMap = {};
      holidaysList.forEach(h => {
        holidayDatesMap[h.date] = h;
      });

      let curr = new Date(s);
      let days = 0;

      while (curr <= e) {
        const dStr = curr.toISOString().split('T')[0];
        const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
        const holiday = holidayDatesMap[dStr];

        if (holiday) {
          excludedHolidayCount++;
          if (!holidayNamesInRange.includes(holiday.name)) {
            holidayNamesInRange.push(holiday.name);
          }
          if (holiday.is_half_day) {
            days += 0.5;
          }
        } else if (!isWeekend) {
          if (isSingleDay) {
            if (leaveForm.start_day_type === 'First Half' || leaveForm.start_day_type === 'Second Half') {
              days += 0.5;
            } else {
              days += 1.0;
            }
          } else {
            let dayVal = 1.0;
            if (dStr === leaveForm.start_date && leaveForm.start_day_type === 'Second Half') dayVal = 0.5;
            if (dStr === leaveForm.end_date && leaveForm.end_day_type === 'First Half') dayVal = 0.5;
            days += dayVal;
          }
        }
        curr.setDate(curr.getDate() + 1);
      }
      durationDays = days;
    }
  }

  if (loading) return <HorizontalLoader label="Loading attendance..." />;

  return (
    <div className="space-y-6">
      
      {/* ── HERO SECTION ── */}
      <div className="rounded-[2.5rem] border border-[#ebe7ff] bg-[#f7f3ff] px-10 py-10">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7c3aed] mb-3">
          Attendance Management
        </p>
        <h1 className="text-5xl font-black text-black tracking-tight leading-none">
          Attendance Panel
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {isAdmin ? 'Manage and monitor employee attendance across the organization' : 'Track your attendance, leaves, and manage your schedule'}
        </p>
      </div>

      {/* Leave Balance & Action */}
      {isEmployee && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                  { label: 'Available Leave Balance', value: (leaveBalance?.total_leaves || 15) - (leaveBalance?.used_leaves || 0), total: leaveBalance?.total_leaves || 15, color: '#10B981', icon: Shield, suffix: 'Days' },
                  { label: 'Additional Leave Balance', value: leaveBalance?.extended_leaves || 0, total: 100, color: '#F43F5E', icon: Activity, suffix: 'Days' },
              ].map((lb, i) => (
                  <div key={i} className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-6 border-white/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 text-black/5 group-hover:text-black/10 transition-colors">
                          <lb.icon size={48} />
                      </div>
                      <div className="flex justify-between items-start mb-4 relative z-10">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b8ba3]">{lb.label}</span>
                          <span className="text-xl font-black font-display italic text-black">{Number(lb.value).toString()} {lb.suffix}</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 relative z-10">
                          <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: lb.total > 0 ? `${(lb.value / lb.total) * 100}%` : '0%', background: lb.color }} />
                      </div>
                  </div>
              ))}
          </div>
          {canReqLeave && (
            <button 
                onClick={() => setShowLeaveForm(true)}
                className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/10 hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-3 p-6 group"
            >
                <div className="w-12 h-12 rounded-2xl bg-[#f3e8ff] flex items-center justify-center text-[#8b5cf6] group-hover:bg-[#8b5cf6] group-hover:text-white transition-all">
                    <Calendar size={24} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7280] group-hover:text-black">Apply Leave</span>
            </button>
          )}
        </div>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div onKeyDown={handleTabKeyNav} className="flex flex-wrap gap-2">
                {[
                { id: 'today', label: "Daily Log", icon: Users },
                { id: 'leaves', label: 'Absence Queue', icon: Clock },
                { id: 'corrections', label: 'Corrections Queue', icon: Edit },
                { id: 'heatmap', label: 'Team Attendance Overview', icon: BarChart3 },
                { id: 'holidays', label: 'Company Holidays', icon: Gift },
                { id: 'search', label: 'Employee Search', icon: Search },
                ].map(t => (
                <button key={t.id} onClick={() => setAdminTab(t.id)}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    adminTab === t.id ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg shadow-transparent' : 'bg-[#f5efff] border border-[#ebe4ff] rounded-[2rem] shadow-none border-[#ece2ff] text-[#6b7280] hover:text-black'
                    }`}>
                    <t.icon size={14} />
                    {t.label}
                    {t.id === 'corrections' && correctionQueue.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">{correctionQueue.length}</span>
                    )}
                </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openDownloadModal()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all active:scale-95 group"
                title="Download Attendance Report as Excel (.xlsx)"
              >
                <FileSpreadsheet size={15} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                <span>Download Report</span>
              </button>
            </div>
          </div>

          {adminTab === 'today' && (
            <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/5 overflow-x-auto animate-fade-in-up">
              <table className="w-full text-left min-w-[720px]">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['Employee', 'Clock In', 'Clock Out', 'Status', 'Work Summary'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#8b8ba3]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {dailyLog.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-16 text-center text-[10px] text-[#b6b6c7] uppercase font-black tracking-widest italic animate-pulse">Scanning matrix for records...</td></tr>
                  ) : dailyLog.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                          <p className="text-xs font-bold text-black uppercase italic">{r.employee_name || r.employee_code}</p>
                          <p className="text-[9px] text-[#8b8ba3] font-mono tracking-tighter uppercase">{r.designation || 'Specialist'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-emerald-400">{r.clock_in || '—'}</td>
                      <td className="px-6 py-4 text-xs font-mono text-red-500">{r.clock_out || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase italic ${
                          r.status === 'Present' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-[#6b7280] italic truncate max-w-[200px]">{r.work_log || 'No notes found'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'leaves' && (
            <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/5 overflow-x-auto animate-fade-in-up">
              <table className="w-full text-left min-w-[640px]">
                <thead className="bg-[#f5efff] border-b border-[#ebe4ff]">
                  <tr>
                    {['Applicant', 'Manager', 'Leave Type', 'Window', 'Reason', 'Control'].map(h => (
                      <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#8b8ba3]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece2ff]">
                  {allLeaves.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-16 text-center text-[10px] text-[#b6b6c7] uppercase font-black tracking-widest italic animate-pulse">Absence Queue Clear</td></tr>
                  ) : allLeaves.map((l, i) => (
                    <tr key={i} className="hover:bg-[#faf7ff]">
                      <td className="px-6 py-4">
                          <p className="text-xs font-bold text-black uppercase italic">{l.employee_name || l.employee_code}</p>
                          <p className="text-[9px] text-[#8b8ba3] font-mono uppercase">Level {l.applicant_role || '4'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#8b8ba3] uppercase italic">{l.manager_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs text-[#8b5cf6] font-black uppercase italic">{l.leave_type} {l.duration_days ? `(${l.duration_days} Day${l.duration_days !== 1 ? 's' : ''})` : ''}</td>
                      <td className="px-6 py-4 text-xs font-mono text-[#6b7280]">
                          <div className="flex flex-col">
                              <span>{l.start_date} {l.start_day_type && l.start_day_type !== 'Full Day' ? `(${l.start_day_type})` : ''}</span>
                              {l.start_date !== l.end_date ? <span>↓ {l.end_date} {l.end_day_type && l.end_day_type !== 'Full Day' ? `(${l.end_day_type})` : ''}</span> : null}
                          </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] text-[#6b7280] max-w-xs truncate">{l.reason}</td>
                      <td className="px-6 py-4">
                        {canAppLeave && (
                          <div className="flex gap-2">
                            <button onClick={() => leaveAction(l.id, 'Approved')}
                              className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-400 hover:text-black transition-all">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => leaveAction(l.id, 'Rejected')}
                              className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black transition-all">
                              <XCircle size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adminTab === 'corrections' && (
            <div className="animate-fade-in-up">
                <CorrectionSystem isManager={true} />
            </div>
          )}

          {adminTab === 'holidays' && (
            <div className="animate-fade-in-up">
              <HolidayManagementPanel isAdmin={true} />
            </div>
          )}

          {/* TEAM ATTENDANCE OVERVIEW TAB */}
          {adminTab === 'heatmap' && (
              <div className="space-y-4 animate-fade-in-up">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                          { label: 'Present Today', count: totalPresent, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                          { label: 'On Leave', count: totalLeave, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                          { label: 'Half Day', count: totalHalfDay, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                          { label: 'Absent Today', count: totalAbsent, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                      ].map((card) => (
                          <div key={card.label} className="bg-white border border-[#ebe4ff] rounded-2xl p-4 flex justify-between items-center shadow-sm">
                              <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[#6b7280] flex items-center gap-1.5">
                                      {card.label}
                                  </p>
                                  <p className="text-2xl font-black text-black mt-1">{card.count}</p>
                              </div>
                              <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${card.bg} ${card.text} border ${card.border}`}>
                                  Total
                              </span>
                          </div>
                      ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-2">
                          <select
                              value={selectedMonth}
                              onChange={e => setSelectedMonth(Number(e.target.value))}
                              className="bg-[#faf7ff] border border-[#ebe4ff] shadow-[0_4px_12px_rgba(0,0,0,0.12)] text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:outline-none"
                          >
                              {Array.from({length: 12}, (_, i) => (
                                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
                              ))}
                          </select>
                          <input
                              type="number"
                              value={selectedYear}
                              onChange={e => setSelectedYear(Number(e.target.value))}
                              className="w-24 bg-[#faf7ff] border border-[#ebe4ff] shadow-[0_4px_12px_rgba(0,0,0,0.12)] text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl focus:outline-none"
                          />
                      </div>
                      <button
                          type="button"
                          onClick={() => openDownloadModal(selectedMonth, selectedYear)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95"
                          title="Export this month's attendance to Excel (.xlsx)"
                      >
                          <FileSpreadsheet size={14} className="text-emerald-600" />
                          <span>Export Excel</span>
                      </button>
                  </div>

                  <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-none border-[#ece2ff] overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[1200px]">
                          <thead>
                              <tr className="bg-[#f8f5ff]">
                                  <th className="sticky left-0 bg-[#f8f5ff] px-6 py-3 text-[9px] font-black uppercase tracking-widest text-[#8b8ba3] border-r border-[#ece2ff] z-20">Employee Attendance</th>
                                  {Array.from({length: new Date(selectedYear, selectedMonth, 0).getDate()}, (_, i) => (
                                      <th
                                          key={i + 1}
                                          className="h-[40px] min-w-[32px] text-[11px] font-semibold text-center text-[#6b7280] border-r border-[#ebe7f5]"
                                      >
                                          {i+1}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-[#ece2ff]">
                              {attendanceSummary.map((emp, i) => (
                                  <tr key={i} className="hover:bg-[#faf7ff]">
                                      <td className="sticky left-0 bg-white px-6 py-2 border-r border-[#ece2ff] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                                          <p className="text-[11px] font-bold text-black uppercase italic truncate max-w-[180px]">{emp.name}</p>
                                          <p className="text-[9px] text-[#9ca3af] font-mono">{emp.code}</p>
                                      </td>
                                      {emp.days.map((d, di) => {
                                          let cellStyle = { backgroundColor: '#E5E7EB' };
                                          let extraClass = "";

                                          if (d.status === 'Present') {
                                              cellStyle = { backgroundColor: '#22C55E' };
                                          } else if (d.status === 'Active') {
                                              cellStyle = { 
                                                  backgroundColor: '#22C55E',
                                                  boxShadow: '0 0 12px rgba(34,197,94,0.6)'
                                              };
                                              extraClass = "animate-pulse";
                                          } else if (d.status.startsWith('Half Day Leave')) {
                                              cellStyle = { backgroundColor: '#8B5CF6' };
                                          } else if (d.status.startsWith('Half Day')) {
                                              cellStyle = { backgroundColor: '#F59E0B' };
                                          } else if (d.status === 'Absent') {
                                              cellStyle = { backgroundColor: '#EF4444' };
                                          } else if (d.status === 'Leave') {
                                              cellStyle = { backgroundColor: '#3B82F6' };
                                          } else if (d.status === 'Holiday' || d.status.startsWith('Holiday')) {
                                              cellStyle = { backgroundColor: '#A855F7', boxShadow: '0 0 8px rgba(168,85,247,0.3)' };
                                          } else if (d.status === 'Weekend' || d.status === 'No Data') {
                                              cellStyle = { backgroundColor: '#E5E7EB' };
                                          }
                                                                            
                                          return (
                                              <td key={di} className="h-[40px] w-[32px] border-r border-[#ebe7f5] text-center align-middle">
                                                  <div className="flex items-center justify-center w-full h-full">
                                                      <div
                                                          title={d.holiday_name ? `${d.date}: Holiday (${d.holiday_name})` : `${d.date}: ${d.status}`}
                                                          className={`w-[24px] h-[24px] rounded-[6px] hover:scale-110 transition-all duration-200 cursor-pointer ${extraClass}`}
                                                          style={cellStyle}
                                                      />
                                                  </div>
                                              </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      <div className="px-6 py-4 border-t border-[#ece2ff] flex flex-wrap gap-3 bg-[#faf9ff]">
                          {[
                              { label: 'Present', dotColor: '#22C55E', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                              { label: 'Active', dotColor: '#22C55E', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', pulse: true },
                              { label: 'Half Day (Attendance)', dotColor: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                              { label: 'Absent', dotColor: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                              { label: 'Leave', dotColor: '#3B82F6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                              { label: 'Half Day (Leave)', dotColor: '#8B5CF6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                              { label: 'Holiday', dotColor: '#A855F7', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                              { label: 'Weekend / No Data', dotColor: '#E5E7EB', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
                          ].map(l => (
                              <div key={l.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${l.bg} ${l.text} border ${l.border}`}>
                                  <div 
                                      className={`w-2.5 h-2.5 rounded-full ${l.pulse ? 'animate-pulse' : ''}`} 
                                      style={{ 
                                          backgroundColor: l.dotColor,
                                          boxShadow: l.pulse ? '0 0 8px rgba(34,197,94,0.6)' : 'none'
                                      }} 
                                  />
                                  <span>{l.label}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {adminTab === 'search' && (
            <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-none border-[#ece2ff] overflow-hidden animate-fade-in-up p-6 md:p-8 space-y-6">
              {/* Top Search & Filter Bar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#ece2ff]">
                <div className="relative w-full lg:max-w-md" ref={dropdownRef}>
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8b8ba3]">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setIsOpen(true);
                    }}
                    onFocus={() => {
                      setQuery('');
                      setIsOpen(true);
                    }}
                    placeholder={selectedEmployee ? `Selected: ${selectedEmployee.name || selectedEmployee.full_name} (${selectedEmployee.employee_code})` : "Search employee by name, code or department..."}
                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-sm pl-11 pr-10 py-3 rounded-2xl focus:outline-none focus:border-[#c084fc] focus:bg-white transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOpen) setQuery('');
                      setIsOpen(o => !o);
                    }}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#8b8ba3] hover:text-purple-600 transition-colors cursor-pointer"
                  >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-[#ebe4ff] rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50 divide-y divide-[#faf7ff]">
                      {activeEmployees
                        .filter(e => {
                          if (!query.trim()) return true;
                          const q = query.toLowerCase();
                          return (
                            (e.name || e.full_name || '').toLowerCase().includes(q) ||
                            (e.employee_code || '').toLowerCase().includes(q) ||
                            (e.designation || '').toLowerCase().includes(q) ||
                            (e.department || '').toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => (a.name || a.full_name || '').localeCompare(b.name || b.full_name || ''))
                        .map(e => (
                          <div
                            key={e.employee_code || e.id}
                            onClick={() => {
                              setSelectedEmployee(e);
                              searchEmployeeRecords(e.employee_code);
                              setQuery('');
                              setIsOpen(false);
                            }}
                            className={`px-4 py-3 flex items-center justify-between text-sm text-black hover:bg-[#f5efff] cursor-pointer transition-colors ${
                              selectedEmployee?.employee_code === e.employee_code ? 'bg-[#faf7ff] font-bold text-purple-700' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                {getInitials(e.name || e.full_name)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 leading-tight">{e.name || e.full_name}</p>
                                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                  {e.employee_code} {e.designation ? `· ${e.designation}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                              Inspect
                            </span>
                          </div>
                        ))}
                      {activeEmployees.filter(e => {
                        if (!query.trim()) return true;
                        const q = query.toLowerCase();
                        return (
                          (e.name || e.full_name || '').toLowerCase().includes(q) ||
                          (e.employee_code || '').toLowerCase().includes(q) ||
                          (e.designation || '').toLowerCase().includes(q)
                        );
                      }).length === 0 && (
                        <div className="px-4 py-6 text-sm text-gray-400 text-center italic">
                          No matching active employees found
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right controls: Period Selector */}
                {selectedEmployee && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Filter size={12} /> Period:
                    </span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 font-bold bg-[#faf7ff] p-1 rounded-2xl border border-[#ebe4ff]">
                      {[
                        { id: 'all', label: 'All Records' },
                        { id: 'this_month', label: 'This Month' },
                        { id: '30d', label: 'Last 30 Days' },
                        { id: '90d', label: 'Last 90 Days' },
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setRecordFilterPeriod(p.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            recordFilterPeriod === p.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-black hover:bg-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-16 gap-3">
                  <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Employee Records...</p>
                </div>
              ) : selectedEmployee && employeeStats ? (
                <div className="space-y-6">
                  {/* ── Employee Header Banner ── */}
                  <div className="bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 p-6 rounded-3xl border border-purple-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-sm flex items-center justify-center text-white font-black text-xl tracking-wider shrink-0">
                        {getInitials(selectedEmployee.name || selectedEmployee.full_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg font-black text-gray-900 tracking-tight">
                            {selectedEmployee.name || selectedEmployee.full_name}
                          </h3>
                          <span className="font-mono text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-lg border border-purple-200">
                            {selectedEmployee.employee_code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Personnel
                          </span>
                        </div>
                        <div className="flex items-center gap-3.5 mt-2 text-xs text-gray-500 flex-wrap">
                          {selectedEmployee.designation && (
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <Briefcase size={13} className="text-purple-600" /> {selectedEmployee.designation}
                            </span>
                          )}
                          {selectedEmployee.department && (
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <Building2 size={13} className="text-purple-600" /> {selectedEmployee.department}
                            </span>
                          )}
                          {selectedEmployee.email && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Mail size={13} className="text-gray-400" /> {selectedEmployee.email}
                            </span>
                          )}
                          {selectedEmployee.reporting_manager && (
                            <span className="flex items-center gap-1 text-gray-500">
                              <Users size={13} className="text-gray-400" /> Manager: {selectedEmployee.reporting_manager}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEmployee(null);
                        setSearchedEmployeeHistory([]);
                        setSearchedEmployeeLeaves([]);
                        setSearchedEmployeeBalance(null);
                        setQuery('');
                      }}
                      className="self-start md:self-auto px-4 py-2 text-xs font-bold text-gray-600 hover:text-purple-700 hover:bg-white bg-gray-50 border border-gray-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      Change Personnel
                    </button>
                  </div>

                  {/* ── 5 KPI Stat Cards ── */}
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* 1. Total Attendance */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all border-l-4 border-l-emerald-500">
                      <div className="flex items-center justify-between text-gray-500 mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Attendance</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {employeeStats.presentCount} <span className="text-xs font-bold text-gray-500">Days</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {employeeStats.totalHoursWorked > 0 
                          ? `${employeeStats.totalHoursWorked} hrs logged (${employeeStats.avgHoursPerDay}h/day)` 
                          : 'Full days present'}
                      </p>
                    </div>

                    {/* 2. Half Days */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between text-gray-500 mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Half Days</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Clock3 size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {employeeStats.totalCombinedHalfDays} <span className="text-xs font-bold text-gray-500">Total</span>
                      </div>
                      <p className="text-[11px] text-amber-700 font-medium mt-1">
                        {employeeStats.halfDayLogsCount} work logs · {employeeStats.totalHalfDayLeavesCount} leave (0.5d)
                      </p>
                    </div>

                    {/* 3. Total Leaves Taken */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all border-l-4 border-l-blue-500">
                      <div className="flex items-center justify-between text-gray-500 mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Total Leaves</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <CalendarOff size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {employeeStats.totalLeaveDays} <span className="text-xs font-bold text-gray-500">Days</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {employeeStats.approvedLeavesCount} approved ({employeeStats.totalHalfDayLeavesCount} half-day requests)
                      </p>
                    </div>

                    {/* 4. Leave Balance Quota */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all border-l-4 border-l-purple-500">
                      <div className="flex items-center justify-between text-gray-500 mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Leave Balance</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Award size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {employeeStats.quotaAvailable} <span className="text-xs font-bold text-gray-500">/ {employeeStats.quotaTotal} Days</span>
                      </div>
                      <p className="text-[11px] text-purple-700 font-medium mt-1">
                        {employeeStats.quotaUsed} days used · {employeeStats.pendingLeavesCount} pending
                      </p>
                    </div>

                    {/* 5. Attendance Rate */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs hover:shadow-sm transition-all border-l-4 border-l-teal-500 col-span-2 lg:col-span-1">
                      <div className="flex items-center justify-between text-gray-500 mb-2">
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Attendance Rate</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-black text-gray-900">
                        {employeeStats.attendanceRate}%
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${employeeStats.attendanceRate}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Section Navigation Tabs ── */}
                  <div className="flex items-center justify-between border-b border-gray-200 pt-2 flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEmployeeDetailTab('attendance')}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                          employeeDetailTab === 'attendance'
                            ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Clock size={14} />
                        <span>Attendance Logs</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          {employeeStats.filteredLogs.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmployeeDetailTab('leaves')}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                          employeeDetailTab === 'leaves'
                            ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Calendar size={14} />
                        <span>Leave History & Half Days</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          {employeeStats.filteredLeaves.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEmployeeDetailTab('quota')}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                          employeeDetailTab === 'quota'
                            ? 'border-purple-600 text-purple-700 bg-purple-50/50 rounded-t-xl'
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        <Award size={14} />
                        <span>Leave Quota & Balances</span>
                      </button>
                    </div>

                    {/* Filter pills depending on active tab */}
                    {employeeDetailTab === 'attendance' && (
                      <div className="flex items-center gap-1.5 pb-2 flex-wrap">
                        {[
                          { id: 'all', label: 'All Status' },
                          { id: 'Present', label: 'Present' },
                          { id: 'Half Day', label: 'Half Day' },
                          { id: 'Absent', label: 'Absent' },
                          { id: 'Leave', label: 'Leave' },
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setAttendanceStatusFilter(f.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              attendanceStatusFilter === f.id
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {employeeDetailTab === 'leaves' && (
                      <div className="flex items-center gap-1.5 pb-2 flex-wrap">
                        {[
                          { id: 'all', label: 'All Leaves' },
                          { id: 'half_day', label: 'Half Days Only' },
                          { id: 'Approved', label: 'Approved' },
                          { id: 'Pending', label: 'Pending' },
                          { id: 'Rejected', label: 'Rejected' },
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => setLeaveStatusFilter(f.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              leaveStatusFilter === f.id
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── TAB 1: ATTENDANCE LOGS ── */}
                  {employeeDetailTab === 'attendance' && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                      {employeeStats.filteredLogs.length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                            <Clock size={24} />
                          </div>
                          <h4 className="text-sm font-bold text-gray-800">No Attendance Records</h4>
                          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                            No clock-in/clock-out records have been logged for {selectedEmployee.name || selectedEmployee.full_name} during the selected period.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-6 py-3.5">Date</th>
                                <th className="px-6 py-3.5">Clock In</th>
                                <th className="px-6 py-3.5">Clock Out</th>
                                <th className="px-6 py-3.5">Duration</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5">Work Summary</th>
                                <th className="px-6 py-3.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs">
                              {employeeStats.filteredLogs
                                .filter(h => {
                                  if (attendanceStatusFilter === 'all') return true;
                                  const s = (h.status || '').toLowerCase();
                                  return s === attendanceStatusFilter.toLowerCase() || s.includes(attendanceStatusFilter.toLowerCase());
                                })
                                .map((h, i) => {
                                  const rawStatus = (h.status || 'Present').toLowerCase();
                                  const isHalf = rawStatus.includes('half');
                                  const isAbsent = rawStatus === 'absent';
                                  const isLeave = rawStatus === 'leave';
                                  const isPresent = !isHalf && !isAbsent && !isLeave;

                                  return (
                                    <tr 
                                      key={i} 
                                      onClick={() => setSelectedLog(h)}
                                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                                    >
                                      <td className="px-6 py-3.5 font-semibold text-gray-900 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Calendar size={13} className="text-gray-400" />
                                          <span>{formatDateDisplay(h.date)}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3.5 font-mono text-gray-700 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1">
                                          <LogIn size={12} className="text-emerald-500" />
                                          {formatTimeAMPM(h.clock_in)}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5 font-mono text-gray-700 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1">
                                          <LogOut size={12} className="text-amber-500" />
                                          {formatTimeAMPM(h.clock_out)}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5 whitespace-nowrap font-medium text-gray-700">
                                        {typeof h.duration_hours === 'number' && h.duration_hours > 0 ? (
                                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                            {Math.floor(h.duration_hours)}h {Math.round((h.duration_hours % 1) * 60)}m
                                          </span>
                                        ) : h.clock_in && h.clock_out ? (
                                          <span className="text-gray-400">—</span>
                                        ) : (
                                          <span className="text-gray-300">—</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3.5 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1 border ${
                                          isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                          isHalf ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                          isLeave ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            isPresent ? 'bg-emerald-500' :
                                            isHalf ? 'bg-amber-500' :
                                            isLeave ? 'bg-blue-500' :
                                            'bg-red-500'
                                          }`} />
                                          {h.status || 'Present'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">
                                        {h.work_log ? (
                                          <span className="truncate block" title={h.work_log}>{h.work_log}</span>
                                        ) : (
                                          <span className="text-gray-300 italic">No notes</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setSelectedLog(h); }}
                                          className="text-xs text-purple-600 hover:text-purple-800 font-bold group-hover:underline inline-flex items-center gap-1"
                                        >
                                          <span>Details</span>
                                          <ChevronRight size={13} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── TAB 2: LEAVE HISTORY & HALF DAYS ── */}
                  {employeeDetailTab === 'leaves' && (
                    <div className="space-y-4">
                      {/* Summary Banner */}
                      <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-700 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600" />
                            Full Day Leaves: <strong className="text-purple-900">{employeeStats.fullDayLeavesCount}</strong>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Half Day Leaves: <strong className="text-amber-900">{employeeStats.totalHalfDayLeavesCount} ({employeeStats.totalHalfDayLeaveDays} days)</strong>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Total Approved Days: <strong className="text-blue-900">{employeeStats.totalLeaveDays} Days</strong>
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          Showing {employeeStats.filteredLeaves.length} total request{employeeStats.filteredLeaves.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                        {employeeStats.filteredLeaves.length === 0 ? (
                          <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                              <CalendarOff size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-gray-800">No Leave Requests</h4>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                              No leave requests (including half days) found for {selectedEmployee.name || selectedEmployee.full_name} in this period.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-gray-50/75 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                  <th className="px-6 py-3.5">Leave Type</th>
                                  <th className="px-6 py-3.5">Day Category</th>
                                  <th className="px-6 py-3.5">Duration</th>
                                  <th className="px-6 py-3.5">Date Range</th>
                                  <th className="px-6 py-3.5">Status</th>
                                  <th className="px-6 py-3.5">Reason</th>
                                  <th className="px-6 py-3.5 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-xs">
                                {employeeStats.filteredLeaves
                                  .filter(l => {
                                    if (leaveStatusFilter === 'all') return true;
                                    if (leaveStatusFilter === 'half_day') {
                                      const dur = parseFloat(l.duration_days);
                                      const sType = (l.start_day_type || '').toLowerCase();
                                      const eType = (l.end_day_type || '').toLowerCase();
                                      return dur === 0.5 || sType.includes('half') || eType.includes('half') || (dur > 0 && dur % 1 !== 0);
                                    }
                                    return (l.status || 'Pending').toLowerCase() === leaveStatusFilter.toLowerCase();
                                  })
                                  .map((l, i) => {
                                    const dur = parseFloat(l.duration_days) || 1;
                                    const sType = (l.start_day_type || '').toLowerCase();
                                    const eType = (l.end_day_type || '').toLowerCase();
                                    const isHalf = dur === 0.5 || sType.includes('half') || eType.includes('half') || (dur > 0 && dur % 1 !== 0);

                                    return (
                                      <tr 
                                        key={i} 
                                        onClick={() => setSelectedLog({ type: 'leave', ...l })}
                                        className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                                      >
                                        <td className="px-6 py-3.5 font-bold text-gray-900 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <Calendar size={13} className="text-purple-600" />
                                            <span>{l.leave_type || 'Leave'}</span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                          {isHalf ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                              <span>🌗 Half Day</span>
                                              {l.start_day_type && l.start_day_type !== 'Full Day' && (
                                                <span className="font-normal">({l.start_day_type})</span>
                                              )}
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                              Full Day
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono font-bold text-gray-800 whitespace-nowrap">
                                          {dur} {dur === 1 ? 'Day' : 'Days'}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600 whitespace-nowrap">
                                          <span className="font-mono text-[11px]">
                                            {l.start_date} {l.start_day_type && l.start_day_type !== 'Full Day' ? `(${l.start_day_type})` : ''} 
                                            {l.end_date && l.end_date !== l.start_date ? ` → ${l.end_date}` : ''}
                                          </span>
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap">
                                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center gap-1 border ${
                                            l.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            l.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                          }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                              l.status === 'Approved' ? 'bg-emerald-500' :
                                              l.status === 'Rejected' ? 'bg-red-500' :
                                              'bg-amber-500 animate-pulse'
                                            }`} />
                                            {l.status || 'Pending'}
                                          </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">
                                          {l.reason ? (
                                            <span className="truncate block" title={l.reason}>{l.reason}</span>
                                          ) : (
                                            <span className="text-gray-300 italic">No reason specified</span>
                                          )}
                                        </td>
                                        <td className="px-6 py-3.5 text-right whitespace-nowrap">
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setSelectedLog({ type: 'leave', ...l }); }}
                                            className="text-xs text-purple-600 hover:text-purple-800 font-bold group-hover:underline inline-flex items-center gap-1"
                                          >
                                            <span>Details</span>
                                            <ChevronRight size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── TAB 3: LEAVE QUOTA & BALANCES ── */}
                  {employeeDetailTab === 'quota' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-900">Annual Leave Quota</h4>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Year {new Date().getFullYear()}
                            </span>
                          </div>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-xs text-gray-500 font-medium">Total Entitled Leaves:</span>
                              <span className="text-sm font-black text-gray-900">{employeeStats.quotaTotal} Days</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-xs text-gray-500 font-medium">Used / Approved Leaves:</span>
                              <span className="text-sm font-black text-purple-600">{employeeStats.quotaUsed} Days</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                              <span className="text-xs text-gray-500 font-medium">Pending Requests:</span>
                              <span className="text-sm font-black text-amber-600">{employeeStats.pendingLeavesCount}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                              <span className="text-xs text-gray-500 font-medium">Remaining Available:</span>
                              <span className="text-base font-black text-emerald-600">{employeeStats.quotaAvailable} Days</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                            <span>Quota Utilization</span>
                            <span>{Math.round((employeeStats.quotaUsed / Math.max(1, employeeStats.quotaTotal)) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all" 
                              style={{ width: `${Math.min(100, Math.round((employeeStats.quotaUsed / Math.max(1, employeeStats.quotaTotal)) * 100))}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-gray-900">Half Day Summary</h4>
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              0.5x Factor
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-4">
                            Half-day leaves consume exactly 0.5 days of quota entitlement and allow morning or afternoon shifts.
                          </p>
                          <div className="space-y-3">
                            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-900">Half-Day Leaves (0.5d)</span>
                              <span className="text-sm font-black text-amber-700">{employeeStats.totalHalfDayLeavesCount} requests ({employeeStats.totalHalfDayLeaveDays}d)</span>
                            </div>
                            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-900">Half-Day Shift Logs</span>
                              <span className="text-sm font-black text-purple-700">{employeeStats.halfDayLogsCount} logs</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-gray-900">Attendance Overview</h4>
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {employeeStats.attendanceRate}% Presence
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-xs text-gray-600 font-medium">Full Days Present</span>
                            <span className="text-xs font-bold text-emerald-700">{employeeStats.presentCount} days</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-xs text-gray-600 font-medium">Half Day Logs</span>
                            <span className="text-xs font-bold text-amber-700">{employeeStats.halfDayLogsCount} days</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-xs text-gray-600 font-medium">Total Hours Logged</span>
                            <span className="text-xs font-bold text-gray-800">{employeeStats.totalHoursWorked} hrs</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-gray-100">
                            <span className="text-xs text-gray-600 font-medium">Average Shift Length</span>
                            <span className="text-xs font-bold text-gray-800">{employeeStats.avgHoursPerDay} hrs/day</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-xs text-gray-600 font-medium">Unexcused Absences</span>
                            <span className="text-xs font-bold text-red-600">{employeeStats.absentCount} days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── No Employee Selected Prompt ── */
                <div className="text-center py-16 px-6 max-w-xl mx-auto space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center mx-auto shadow-2xs">
                    <Search size={28} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Select an Employee to Inspect</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto leading-relaxed">
                      Search above by name, employee code, or department to view total attendance, complete leave records with half-day breakdown, and annual quota balances.
                    </p>
                  </div>
                  {activeEmployees.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Select Personnel</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {activeEmployees.slice(0, 8).map(e => (
                          <button
                            key={e.employee_code || e.id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(e);
                              searchEmployeeRecords(e.employee_code);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#faf7ff] border border-[#ebe4ff] text-xs font-semibold text-gray-700 hover:border-purple-300 hover:text-purple-700 hover:bg-white transition-all shadow-2xs cursor-pointer"
                          >
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold">
                              {getInitials(e.name || e.full_name)}
                            </span>
                            <span>{e.name || e.full_name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History & Correction Systems */}
      {!isAdmin && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={() => setEmployeeTab('attendance')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                employeeTab === 'attendance'
                  ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#f5efff] border border-[#ebe4ff] text-[#6b7280] hover:text-black'
              }`}
            >
              <Clock size={14} /> My Attendance & Corrections
            </button>
            <button
              onClick={() => setEmployeeTab('holidays')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                employeeTab === 'holidays'
                  ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg'
                  : 'bg-[#f5efff] border border-[#ebe4ff] text-[#6b7280] hover:text-black'
              }`}
            >
              <Gift size={14} /> Company Holidays
            </button>
          </div>

          {employeeTab === 'holidays' ? (
            <div className="animate-fade-in-up">
              <HolidayManagementPanel isAdmin={false} />
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in-up">
                <CorrectionSystem isManager={false} />
                <div className="grid grid-cols-1 gap-8">              {/* Absence History */}
                  <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-none border-[#ece2ff] overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-[#ece2ff] bg-[#f5efff] flex justify-between items-center">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7280] flex items-center gap-2">
                        <Calendar size={14} className="text-secondary" /> Request History
                      </h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#ece2ff] scrollbar-hide">
                      {myLeaves.length === 0 ? (
                        <p className="p-10 text-center text-[9px] uppercase font-black text-[#b6b6c7]">No requests filed</p>
                      ) : myLeaves.map((l, i) => (
                        <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-[#faf7ff] transition-colors cursor-pointer" onClick={() => setSelectedLog({ type: 'leave', ...l })}>
                          <div>
                            <p className="text-xs font-black text-black italic">{l.leave_type} Request {l.duration_days ? `(${l.duration_days} Day${l.duration_days !== 1 ? 's' : ''})` : ''}</p>
                            <p className="text-[9px] text-[#8b8ba3] font-mono uppercase">{l.start_date} {l.start_day_type && l.start_day_type !== 'Full Day' ? `(${l.start_day_type})` : ''} to {l.end_date} {l.end_day_type && l.end_day_type !== 'Full Day' ? `(${l.end_day_type})` : ''}</p>
                          </div>
                          <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase italic ${
                            l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                            l.status === 'Rejected' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>{l.status || 'Pending'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
            </div>
          )}
        </div>
      )}



      {/* Absence Request Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4 overflow-y-auto">
          <form onSubmit={applyLeave} className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-none border-[#ece2ff] p-6 sm:p-10 w-full max-w-md space-y-6 relative overflow-hidden bg-[#faf7ff] my-8 max-h-[85vh] overflow-y-auto">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Calendar size={100} /></div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-display font-black text-black uppercase italic tracking-widest mb-1">Apply <span className="text-[#8b5cf6]">Leave</span></h3>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#8b8ba3] mb-8">Leave Request</p>

                <div className="space-y-4">
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Leave Type</label>
                        <input 
                            disabled
                            value="Standard Leave"
                            className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black/40 text-xs px-4 py-4 rounded-xl focus:outline-none uppercase font-bold"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Start Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date"
                                    required
                                    value={leaveForm.start_date}
                                    onChange={e => setLeaveForm({...leaveForm, start_date: e.target.value})}
                                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] transition-all uppercase font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">End Date <span className="text-red-500">*</span></label>
                                <input 
                                    type="date"
                                    required
                                    value={leaveForm.end_date}
                                    onChange={e => setLeaveForm({...leaveForm, end_date: e.target.value})}
                                    className="w-full bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/10 text-black text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all uppercase font-mono"
                                />
                            </div>
                        </div>
                        {leaveForm.start_date && new Date(leaveForm.start_date) < new Date(new Date().setHours(0,0,0,0)) && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                <AlertCircle size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">This will be marked as a retroactive leave</span>
                            </div>
                        )}
                        {excludedHolidayCount > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                                <Gift size={12} className="text-purple-600 shrink-0" />
                                <span>Includes {excludedHolidayCount} Company Holiday ({holidayNamesInRange.join(', ')}) — excluded from deduction!</span>
                            </div>
                        )}
                    </div>

                    {leaveForm.start_date && leaveForm.end_date && isSingleDay && (
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Duration Type</label>
                            <select
                                value={leaveForm.start_day_type}
                                onChange={e => setLeaveForm({...leaveForm, start_day_type: e.target.value, end_day_type: e.target.value})}
                                className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] transition-all uppercase font-mono"
                            >
                                <option value="Full Day">Full Day</option>
                                <option value="First Half">First Half</option>
                                <option value="Second Half">Second Half</option>
                            </select>
                        </div>
                    )}
                    
                    {leaveForm.start_date && leaveForm.end_date && !isSingleDay && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Start Day Type</label>
                                <select
                                    value={leaveForm.start_day_type}
                                    onChange={e => setLeaveForm({...leaveForm, start_day_type: e.target.value})}
                                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] transition-all uppercase font-mono"
                                >
                                    <option value="Full Day">Full Day</option>
                                    <option value="Second Half">Second Half</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">End Day Type</label>
                                <select
                                    value={leaveForm.end_day_type}
                                    onChange={e => setLeaveForm({...leaveForm, end_day_type: e.target.value})}
                                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] transition-all uppercase font-mono"
                                >
                                    <option value="Full Day">Full Day</option>
                                    <option value="First Half">First Half</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {leaveForm.start_date && leaveForm.end_date && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Total Deduction:</span>
                            <span className="text-sm font-black text-emerald-700">{durationDays} Day{durationDays !== 1 && 's'}</span>
                        </div>
                    )}


                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Reason <span className="text-red-500">*</span></label>
                        <textarea 
                            required
                            placeholder="State mission-critical reasons for absence..."
                            value={leaveForm.reason}
                            onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})}
                            rows={3}
                            className="w-full bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/10 text-black text-xs bg-white/5 px-4 py-4 rounded-xl focus:outline-none focus:border-primary/50 transition-all resize-none placeholder:text-black/10"
                        />
                    </div>
                </div>

                <div className="flex gap-4 mt-10">
                    <button 
                        type="button"
                        onClick={() => setShowLeaveForm(false)}
                        className="flex-1 py-4 rounded-2xl border border-white/10 text-black/40 text-[10px] font-black uppercase tracking-widest hover:text-black hover:bg-white/5 transition-all"
                    >
                        Abort
                    </button>
                    <button 
                        type="submit"
                        className="flex-1 py-4 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg shadow-primary/10 font-display italic"
                    >
                        Apply Leave
                    </button>
                </div>
            </div>
          </form>
        </div>
      )}



      {/* Edit Attendance Modal */}
      {editingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[#060b19]/80 backdrop-blur-sm" onClick={() => setEditingRecord(null)} />
              <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-white/10 w-full max-w-lg relative z-10 animate-fade-in-up overflow-hidden">
                  <div className="p-6 border-b border-[#ece2ff] bg-[#faf7ff] flex justify-between items-center">
                      <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black italic">Update Attendance Record</h3>
                          <p className="text-[9px] text-[#8b8ba3] uppercase font-bold mt-1">Employee Attendance Adjustment</p>
                      </div>
                      <button onClick={() => setEditingRecord(null)} className="p-2 text-[#8b8ba3] hover:text-black transition-colors">
                          <XCircle size={20} />
                      </button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Employee <span className="text-red-500">*</span></label>
                            {editingRecord.isNew ? (
                                <select
                                    value={editForm.employee_code}
                                    onChange={e => setEditForm({...editForm, employee_code: e.target.value})}
                                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none"
                                >
                                    <option value="" className="bg-white">Select Employee...</option>
                                    {employees.map(e => (
                                        <option key={e.employee_code} value={e.employee_code} className="text-black">{e.name} ({e.employee_code})</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-[#8b8ba3] text-xs px-4 py-4 rounded-xl font-bold uppercase italic">
                                    {editingRecord.employee_name || editingRecord.employee_code}
                                </div>
                            )}
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Time Vector (Date) <span className="text-red-500">*</span></label>
                            <input 
                                type="date"
                                disabled={!editingRecord.isNew}
                                value={editForm.date}
                                onChange={e => setEditForm({...editForm, date: e.target.value})}
                                className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none disabled:opacity-50"
                            />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Clock-in Time</label>
                            <input 
                                type="time"
                                step="1"
                                value={editForm.clock_in}
                                onChange={e => setEditForm({...editForm, clock_in: e.target.value})}
                                className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Clock-out Time</label>
                            <input 
                                type="time"
                                step="1"
                                value={editForm.clock_out}
                                onChange={e => setEditForm({...editForm, clock_out: e.target.value})}
                                className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none"
                            />
                          </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Work Summary</label>
                        <textarea 
                            value={editForm.work_log}
                            onChange={e => setEditForm({...editForm, work_log: e.target.value})}
                            className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none h-24 resize-none"
                            placeholder="Detail the activities conducted during this shift..."
                        />
                      </div>

                      <button 
                        onClick={saveAttendanceEdit}
                        disabled={!editForm.employee_code || !editForm.date}
                        className="w-full py-4 bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl shadow-transparent disabled:opacity-50"
                      >
                        Update Attendance Record
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* View Log Modal */}
      {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[#060b19]/80 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
              <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] w-full max-w-md relative z-10 animate-fade-in-up overflow-hidden">
                  <div className="p-6 border-b border-[#ece2ff] bg-[#faf7ff] flex justify-between items-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5"><Activity size={60} /></div>
                      <div className="relative z-10">
                          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black italic">
                              {selectedLog.type === 'leave' ? 'Reason for Leave' : 'Work Summary'}
                          </h3>
                          <p className="text-[9px] text-[#8b8ba3] uppercase font-bold mt-1">
                              {selectedLog.type === 'leave' ? `${selectedLog.start_date} to ${selectedLog.end_date}` : `${selectedLog.date} (${selectedLog.clock_in} - ${selectedLog.clock_out || 'Active'})`}
                          </p>
                      </div>
                      <button onClick={() => setSelectedLog(null)} className="p-2 text-[#8b8ba3] hover:text-black transition-colors relative z-10">
                          <XCircle size={20} />
                      </button>
                  </div>
                  <div className="p-8">
                      <div className="bg-[#faf7ff] border border-[#ece2ff] rounded-2xl p-6 relative">
                          <div className="absolute -top-3 -left-3 bg-white p-1 rounded-full border border-[#ece2ff] text-primary">
                              <Zap size={16} />
                          </div>
                          <p className="text-sm text-black whitespace-pre-wrap font-medium">
                              {selectedLog.type === 'leave' 
                                  ? selectedLog.reason || <span className="text-[#8b8ba3] italic">No reason provided.</span>
                                  : selectedLog.work_log || <span className="text-[#8b8ba3] italic">No work summary recorded for this session.</span>
                              }
                          </p>
                      </div>
                      {selectedLog.type === 'leave' && selectedLog.rejection_reason && (
                          <div className="mt-4 bg-[#fff1f2] border border-[#ffe4e6] rounded-2xl p-6 relative">
                              <div className="absolute -top-3 -left-3 bg-white p-1 rounded-full border border-[#ffe4e6] text-red-500">
                                  <Shield size={16} />
                              </div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">Rejection Feedback</p>
                              <p className="text-sm text-red-900 whitespace-pre-wrap font-medium">
                                  {selectedLog.rejection_reason}
                              </p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* ── DOWNLOAD ATTENDANCE REPORT MODAL ── */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#060b19]/80 backdrop-blur-sm transition-opacity"
            onClick={() => !isDownloading && setShowDownloadModal(false)}
          />
          <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-[0_20px_60px_rgba(180,140,255,0.2)] w-full max-w-lg relative z-10 animate-fade-in-up overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#ece2ff] bg-gradient-to-r from-[#faf7ff] to-[#f4efff] flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-black tracking-tight">
                    Download Attendance Report
                  </h3>
                  <p className="text-[11px] text-[#6b7280]">
                    Export workforce attendance data to Excel spreadsheet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isDownloading && setShowDownloadModal(false)}
                disabled={isDownloading}
                className="p-2 text-[#8b8ba3] hover:text-black rounded-xl hover:bg-white/60 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Format Badge Callout */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-900">Format: Microsoft Excel (.xlsx)</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  2 Sheets Included
                </span>
              </div>

              {/* Time Period Type Selector */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] mb-2 block">
                  Reporting Period Type
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#faf7ff] p-1.5 rounded-2xl border border-[#ebe4ff]">
                  <button
                    type="button"
                    onClick={() => setDownloadPeriodType('cycle')}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      downloadPeriodType === 'cycle'
                        ? 'bg-white text-purple-900 shadow-sm border border-[#ece2ff]'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Preset Cycle / Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadPeriodType('custom');
                      if (!downloadStartDate || !downloadEndDate) {
                        setQuickRange('thisMonth');
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all ${
                      downloadPeriodType === 'custom'
                        ? 'bg-white text-purple-900 shadow-sm border border-[#ece2ff]'
                        : 'text-gray-500 hover:text-black'
                    }`}
                  >
                    Custom Date Range
                  </button>
                </div>
              </div>

              {/* PRESET PERIOD CONTROLS */}
              {downloadPeriodType === 'cycle' && (
                <div className="space-y-3 bg-[#faf7ff] p-4 rounded-2xl border border-[#ebe4ff]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                        Select Month
                      </label>
                      <select
                        value={downloadMonth}
                        onChange={(e) => setDownloadMonth(Number(e.target.value))}
                        className="w-full bg-white border border-[#ebe4ff] text-black text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-400"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                        Select Year
                      </label>
                      <input
                        type="number"
                        value={downloadYear}
                        onChange={(e) => setDownloadYear(Number(e.target.value))}
                        className="w-full bg-white border border-[#ebe4ff] text-black text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                      Cycle Breakdown
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 1, label: '1st – 15th', sub: 'Mid-Month' },
                        { id: 2, label: '16th – End', sub: 'Month-End' },
                        { id: 0, label: 'Full Month', sub: '1st – End' }
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setDownloadCycle(c.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            downloadCycle === c.id
                              ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{c.label}</div>
                          <div className="text-[9px] text-gray-400 font-medium">{c.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CUSTOM DATE RANGE CONTROLS */}
              {downloadPeriodType === 'custom' && (
                <div className="space-y-3 bg-[#faf7ff] p-4 rounded-2xl border border-[#ebe4ff]">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={downloadStartDate}
                        onChange={(e) => setDownloadStartDate(e.target.value)}
                        className="w-full bg-white border border-[#ebe4ff] text-black text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={downloadEndDate}
                        onChange={(e) => setDownloadEndDate(e.target.value)}
                        className="w-full bg-white border border-[#ebe4ff] text-black text-xs font-semibold px-3 py-2.5 rounded-xl focus:outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 mb-1.5 block">
                      Quick Shortcuts
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'last7', label: 'Last 7 Days' },
                        { id: 'last14', label: 'Last 14 Days' },
                        { id: 'thisMonth', label: 'This Month' },
                        { id: 'lastMonth', label: 'Last Month' }
                      ].map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setQuickRange(q.id)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* REPORT SCOPE (IF ADMIN) */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed] mb-2 block">
                  Report Scope
                </label>
                {canViewAll ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDownloadScope('org')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        downloadScope === 'org'
                          ? 'bg-purple-50 border-purple-400 shadow-sm'
                          : 'bg-[#faf7ff] border-[#ebe4ff] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-black">Organization-Wide</span>
                        {downloadScope === 'org' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                        All active employees across the entire organization
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDownloadScope('team')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        downloadScope === 'team'
                          ? 'bg-purple-50 border-purple-400 shadow-sm'
                          : 'bg-[#faf7ff] border-[#ebe4ff] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-black">My Team Only</span>
                        {downloadScope === 'team' && <div className="w-2 h-2 rounded-full bg-purple-600" />}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                        Direct reports assigned to you
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-[#faf7ff] border border-[#ebe4ff] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">My Team (Direct Reports)</p>
                      <p className="text-[10px] text-gray-500">Report will include your team direct reports.</p>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Team Scope
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#ece2ff] bg-[#faf7ff] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => !isDownloading && setShowDownloadModal(false)}
                disabled={isDownloading}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-white hover:text-black transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isDownloading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50 active:scale-95"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Download Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}