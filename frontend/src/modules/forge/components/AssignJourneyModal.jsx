import React, { useEffect, useState } from 'react';
import { journeyApi, forgeApi } from '../../../core/api/forgeApi';
import {
  Calendar, ChevronRight, Layers, X, Search, Check,
  Users, AlertCircle, Shield, Filter, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AssignJourneyModal({
  isOpen,
  onClose,
  journeyId: initialJourneyId,
  journeyTitle: initialJourneyTitle,
  onSuccess,
}) {
  const [journeys, setJourneys] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignedEmpIds, setAssignedEmpIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  const [selectedJourneyId, setSelectedJourneyId] = useState(initialJourneyId || '');
  const [selectedJourneyTitle, setSelectedJourneyTitle] = useState(initialJourneyTitle || '');
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [deadline, setDeadline] = useState('');

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Load journeys (if not specified) and active employee database
  useEffect(() => {
    if (!isOpen) return;

    setSelectedJourneyId(initialJourneyId || '');
    setSelectedJourneyTitle(initialJourneyTitle || '');
    setSelectedEmpIds([]);
    setDeadline('');
    setSearch('');
    setDeptFilter('');
    setLoading(true);

    const promises = [
      forgeApi.assignableEmployees()
        .then(res => setEmployees(res.data?.data || []))
        .catch(err => {
          console.error('Failed to load active employees', err);
          toast.error('Failed to load active employees');
        })
    ];

    if (!initialJourneyId) {
      promises.push(
        journeyApi.listJourneys()
          .then(res => setJourneys(res.data?.data || []))
          .catch(() => setJourneys([]))
      );
    } else {
      promises.push(
        journeyApi.getJourney(initialJourneyId)
          .then(res => {
            const j = res.data?.data || {};
            setSelectedJourneyTitle(j.title || initialJourneyTitle || '');
            const assigned = new Set([
              ...(j.assigned_employee_ids || []),
              ...(j.assigned_user_ids || []),
            ]);
            setAssignedEmpIds(assigned);
          })
          .catch(() => setAssignedEmpIds(new Set()))
      );
    }

    Promise.all(promises).finally(() => setLoading(false));
  }, [isOpen, initialJourneyId, initialJourneyTitle]);

  // When journey selection changes in modal
  const handleSelectJourney = async (id, title) => {
    setSelectedJourneyId(id);
    setSelectedJourneyTitle(title);
    try {
      const res = await journeyApi.getJourney(id);
      const j = res.data?.data || {};
      const assigned = new Set([
        ...(j.assigned_employee_ids || []),
        ...(j.assigned_user_ids || []),
      ]);
      setAssignedEmpIds(assigned);
    } catch {
      setAssignedEmpIds(new Set());
    }
  };

  const handleAssign = async () => {
    const jId = initialJourneyId || selectedJourneyId;
    if (!jId) {
      toast.error('Please select a learning journey to assign.');
      return;
    }
    if (selectedEmpIds.length === 0) {
      toast.error('Please select at least one employee.');
      return;
    }

    setAssigning(true);
    try {
      const payload = {
        employee_ids: selectedEmpIds,
        deadline: deadline ? new Date(deadline).toISOString() : null,
      };

      const res = await journeyApi.assignJourney(jId, payload);
      const assignedCount = res.data?.data?.assigned ?? selectedEmpIds.length;
      toast.success(res.data?.message || `Journey assigned to ${assignedCount} employee${assignedCount === 1 ? '' : 's'}!`);

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Failed to assign journey');
    } finally {
      setAssigning(false);
    }
  };

  // Filtered roster
  const filteredEmployees = employees.filter((emp) => {
    const term = search.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (emp.name && emp.name.toLowerCase().includes(term)) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(term)) ||
      (emp.email && emp.email.toLowerCase().includes(term));
    const matchesDept = !deptFilter || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const isEmpAlreadyAssigned = (emp) => {
    return (
      assignedEmpIds.has(emp.employee_id) ||
      assignedEmpIds.has(emp.id) ||
      (emp.user_id && assignedEmpIds.has(emp.user_id))
    );
  };

  const eligibleEmployees = filteredEmployees.filter(e => !isEmpAlreadyAssigned(e));
  const allEligibleIds = eligibleEmployees.map(e => e.employee_id || e.id);
  const isAllSelected =
    allEligibleIds.length > 0 &&
    allEligibleIds.every(id => selectedEmpIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !allEligibleIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...allEligibleIds])));
    }
  };

  const toggleEmployee = (empId) => {
    setSelectedEmpIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const departmentsList = Array.from(
    new Set(employees.map(e => e.department).filter(Boolean))
  ).sort();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={() => !assigning && onClose()}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="modal-box"
          style={{
            maxWidth: 740,
            width: '100%',
            background: '#ffffff',
            borderRadius: 24,
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
            border: '1px solid #ebe4ff',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Modal Header ────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '22px 28px',
              borderBottom: '1px solid #f0ecff',
              background: 'linear-gradient(to right, #faf8ff, #ffffff)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)',
                }}
              >
                <Layers size={22} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    color: '#7c3aed',
                    textTransform: 'uppercase',
                  }}
                >
                  Learning Path Assignment
                </div>
                <h3
                  style={{
                    margin: '3px 0 0 0',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {selectedJourneyTitle || 'Assign Learning Journey'}
                </h3>
              </div>
            </div>

            <button
              className="btn-icon"
              disabled={assigning}
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Modal Body ──────────────────────────────────────────────────── */}
          <div style={{ padding: '24px 28px', maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Step 1: Journey Selection (only if journeyId wasn't passed directly) */}
            {!initialJourneyId && (
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#6b7280',
                    marginBottom: 10,
                  }}
                >
                  Step 1: Select Learning Journey
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {journeys.map((j) => {
                    const isSelected = selectedJourneyId === j.id;
                    return (
                      <div
                        key={j.id}
                        onClick={() => handleSelectJourney(j.id, j.title)}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 14,
                          border: isSelected ? '2px solid #7c3aed' : '1px solid #e5e7eb',
                          background: isSelected ? '#f6f0ff' : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isSelected ? '#7c3aed' : '#111827' }}>
                            {j.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                            {j.steps_count || 0} Steps
                          </div>
                        </div>
                        {isSelected && <Check size={16} color="#7c3aed" strokeWidth={3} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Employee Discovery & Roster */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#6b7280',
                  }}
                >
                  {initialJourneyId ? 'Select Employees to Enroll' : 'Step 2: Select Employees'}
                </label>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed' }}>
                  {selectedEmpIds.length} Selected
                </span>
              </div>

              {/* Search & Department Filters */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, employee code, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      paddingLeft: 40,
                      height: 42,
                      borderRadius: 12,
                      fontSize: '0.84rem',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                    }}
                  />
                </div>

                {departmentsList.length > 0 && (
                  <select
                    className="form-control"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{
                      width: 180,
                      height: 42,
                      borderRadius: 12,
                      fontSize: '0.84rem',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      fontWeight: 600,
                    }}
                  >
                    <option value="">All Departments</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Roster Container */}
              <div
                style={{
                  border: '1px solid #ebe4ff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#ffffff',
                  marginBottom: 20,
                }}
              >
                {/* Select All bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 18px',
                    background: '#faf8ff',
                    borderBottom: '1px solid #ebe4ff',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      color: '#374151',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: 'pointer' }}
                    />
                    Select All ({allEligibleIds.length} eligible)
                  </label>

                  <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: 600 }}>
                    Total: {filteredEmployees.length} employees
                  </span>
                </div>

                {/* Employees Scroll List */}
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
                      <div className="spinner" style={{ width: 28, height: 28 }} />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div style={{ padding: '36px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.86rem' }}>
                      <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      No employees match your search.
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const empId = emp.employee_id || emp.id;
                      const isAlreadyAssigned = isEmpAlreadyAssigned(emp);
                      const isSelected = selectedEmpIds.includes(empId);
                      const displayName = emp.name || emp.full_name || 'Employee';
                      const initials = displayName
                        .split(' ')
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);

                      return (
                        <div
                          key={empId}
                          onClick={() => !isAlreadyAssigned && toggleEmployee(empId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 18px',
                            borderBottom: '1px solid #f3f4f6',
                            cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                            background: isSelected ? '#f6f0ff' : 'transparent',
                            opacity: isAlreadyAssigned ? 0.6 : 1,
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                            <input
                              type="checkbox"
                              disabled={isAlreadyAssigned}
                              checked={isSelected}
                              onChange={() => !isAlreadyAssigned && toggleEmployee(empId)}
                              style={{ width: 16, height: 16, accentColor: '#7c3aed', cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: isSelected
                                  ? 'linear-gradient(135deg, #7c3aed, #9333ea)'
                                  : 'linear-gradient(135deg, #e5e7eb, #d1d5db)',
                                color: isSelected ? 'white' : '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="truncate">{displayName}</span>
                                {emp.employee_code && (
                                  <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>
                                    ({emp.employee_code})
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#6b7280', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <span>{emp.email}</span>
                                {emp.department && <span>· {emp.department}</span>}
                                {emp.designation && <span>· {emp.designation}</span>}
                              </div>
                            </div>
                          </div>

                          {isAlreadyAssigned && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: '#e0e7ff',
                                color: '#4338ca',
                                textTransform: 'uppercase',
                                flexShrink: 0,
                              }}
                            >
                              Enrolled
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 3: Target Completion Deadline */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  background: '#f9fafb',
                  borderRadius: 14,
                  border: '1px solid #e5e7eb',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#111827' }}>
                    Target Completion Deadline (Optional)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                    Learners will receive automated reminder notifications before this date.
                  </div>
                </div>
                <input
                  type="date"
                  className="form-control"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{
                    width: 170,
                    height: 40,
                    borderRadius: 10,
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Modal Footer ────────────────────────────────────────────────── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 28px',
              borderTop: '1px solid #f0ecff',
              background: '#ffffff',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
              Enrolled learners will see this journey on their Personal dashboard immediately.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={assigning}
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={assigning || selectedEmpIds.length === 0}
                onClick={handleAssign}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 24px',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  background: selectedEmpIds.length === 0 ? '#9ca3af' : '#7c3aed',
                  color: 'white',
                  cursor: selectedEmpIds.length === 0 ? 'not-allowed' : 'pointer',
                  border: 'none',
                  boxShadow: selectedEmpIds.length > 0 ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
                }}
              >
                {assigning ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14 }} />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Confirm Assignment ({selectedEmpIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
