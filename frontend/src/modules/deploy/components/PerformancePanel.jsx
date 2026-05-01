import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';
import { Activity, Download, Save, Send, CheckCircle, Plus, AlertCircle, BarChart3, TrendingUp } from 'lucide-react';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const KRA_TEMPLATE = [
  { category: 'Performance', subcategory: 'Adherence to schedules', options: { 10: "Delivery before target 80%-100% of the time", 5: "100% target dates met", 1: "<100% target dates met" } },
  { category: 'Performance', subcategory: 'Quality of deliverables', options: { 10: "Zero defects, meets/exceeds CTQs", 5: "Minor defects, meets most CTQs", 1: "High defects, fails to meet key CTQs" } },
  { category: 'Performance', subcategory: 'Stakeholder feedback', options: { 10: "Consistently excellent feedback", 5: "Neutral feedback", 1: "Negative or critical feedback" } },
  { category: 'Performance', subcategory: 'Team contribution', options: { 10: "Actively leads and supports team success", 5: "Participates regularly, meets expectations", 1: "Limited or no contribution to the team" } },
  { category: 'Potential', subcategory: 'Communication and influence', options: { 10: "Clear, persuasive, highly impactful", 5: "Communicates effectively", 1: "Poor communication, lacks clarity" } },
  { category: 'Potential', subcategory: 'Problem-solving', options: { 10: "Innovates and solves complex problems", 5: "Solves problems as expected", 1: "Struggles to address key problems" } },
  { category: 'Potential', subcategory: 'Adaptability', options: { 10: "Adapts quickly to new tasks/tools", 5: "Adapts with minimal guidance", 1: "Resists or struggles with change" } },
  { category: 'Values', subcategory: 'Integrity and accountability', options: { 10: "Takes full ownership, demonstrates honesty", 5: "Generally reliable and ethical", 1: "Fails to take accountability, lacks ethics" } },
  { category: 'Values', subcategory: 'Teamwork and collaboration', options: { 10: "Frequently collaborates and builds trust", 5: "Works well with others", 1: "Difficult to work with, creates conflict" } },
  { category: 'Values', subcategory: 'Initiative and proactivity', options: { 10: "Consistently self-driven, exceeds scope", 5: "Meets expectations with minimal prompting", 1: "Reluctant or reactive, lacks initiative" } },
  { category: 'Growth and Development', subcategory: 'Learning and upskilling', options: { 10: "Frequently completes certifications, learns", 5: "Occasionally improves skills", 1: "Little or no effort toward upskilling" } },
  { category: 'Growth and Development', subcategory: 'Team development contribution', options: { 10: "Regularly mentors, shares knowledge", 5: "Occasionally mentors others", 1: "Does not assist in team development" } },
  { category: 'Impact', subcategory: 'Creativity and originality', options: { 10: "Introduces innovative, unique solutions", 5: "Occasionally suggests creative ideas", 1: "Lacks originality, repeats existing ideas" } },
  { category: 'Impact', subcategory: 'Business goal contributions', options: { 10: "Directly and significantly impacts goals", 5: "Meets expectations, some measurable impact", 1: "No measurable contribution to business goals" } },
];

const DEFAULT_ENTRIES = KRA_TEMPLATE.map(k => ({
  ...k, self_score: 5, manager_score: 5, score: 5, employee_comment: '', manager_comment: ''
}));

const STATUS_CONFIG = {
  'Draft':     { bg: 'bg-white/10',            text: 'text-white/50' },
  'Requested': { bg: 'bg-amber-500/10',        text: 'text-amber-400 animate-pulse' },
  'Submitted': { bg: 'bg-primary/10',           text: 'text-primary' },
  'Reviewed':  { bg: 'bg-emerald-500/10',       text: 'text-emerald-400' },
  'Finalized': { bg: 'bg-emerald-500/10',       text: 'text-emerald-400' },
};

export default function PerformancePanel({ isAdmin }) {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(user?.employee_code || '');
  const [year, setYear] = useState(new Date().getFullYear());
  const [assessments, setAssessments] = useState([]);
  const [periodType, setPeriodType] = useState('Quarterly'); // 'Quarterly' or 'Monthly'
  const [activePeriod, setActivePeriod] = useState(periodType === 'Quarterly' ? 'Q1' : 'Jan');
  const [localData, setLocalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const PERIODS = periodType === 'Quarterly' ? QUARTERS : MONTHS;

  // Load employee list for admin
  useEffect(() => {
    if (!isAdmin) {
      setSelectedEmp(user?.employee_code || '');
      return;
    }
    fetch('/api/employees', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setEmployees(arr);
        if (!selectedEmp && arr.length > 0) setSelectedEmp(arr[0].employee_code);
      }).catch(() => {});
  }, [isAdmin, user?.employee_code]);

  const loadAssessments = useCallback(async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${selectedEmp}/${year}?type=${periodType}`, { credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to load assessments');
      }
      const data = await res.json();
      const list = (Array.isArray(data) ? data : []).map(a => ({
        ...a,
        entries: a.entries.map(e => {
            const template = KRA_TEMPLATE.find(t => t.subcategory === e.subcategory);
            return { ...e, options: template?.options || {} };
        })
      }));
      setAssessments(list);
      const active = list.find(d => d.period_value === activePeriod);
      setLocalData(active || null);
    } catch (e) {
      toast.error(e.message || 'Failed to load assessments');
      setAssessments([]);
      setLocalData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedEmp, year, activePeriod, periodType]);

  useEffect(() => { loadAssessments(); }, [selectedEmp, year, periodType]);

  const handleTabChange = (p) => {
    setActivePeriod(p);
    const active = assessments.find(d => d.period_value === p);
    setLocalData(active || null);
  };

  const createNewAssessment = () => {
    setLocalData({
      period_type: periodType,
      period_value: activePeriod,
      status: 'Draft',
      total_score: 0,
      percentage: 0,
      entries: DEFAULT_ENTRIES.map(e => ({ ...e })),
    });
  };

  const handleRequestReview = async () => {
    if (!isAdmin || !selectedEmp) return;
    try {
        const res = await fetch('/api/assessments/request', {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                employee_code: selectedEmp,
                year: year,
                period_type: periodType,
                period_value: activePeriod
            })
        });
        if (!res.ok) {
            const d = await res.json();
            throw new Error(d.detail || "Request failed");
        }
        toast.success(`Review requested for ${selectedEmp}`);
        loadAssessments();
    } catch (e) { toast.error(e.message || "Request failed"); }
  };

  // True when the admin is viewing their own employee record (personal view via switch)
  const isSelf = !!user?.employee_code && user.employee_code === selectedEmp;

  const handleEntryChange = (idx, field, value) => {
    if (!localData) return;
    
    // Enforcement: Manager view edits manager fields, Employee view edits self fields
    if (isAdmin && (field === 'self_score' || field === 'employee_comment')) return;
    if (!isAdmin && (field === 'manager_score' || field === 'manager_comment')) return;

    const updated = { ...localData, entries: localData.entries.map((e, i) => {
      if (i !== idx) return e;
      const val = (field.includes('score') ? Number(value) : value);
      const updated_entry = { ...e, [field]: val };
      
      // Combined score logic
      updated_entry.score = updated_entry.manager_score || updated_entry.self_score || 0;
      return updated_entry;
    })};

    const total = updated.entries.reduce((s, e) => s + (e.manager_score || e.self_score || 0), 0);
    updated.total_score = total;
    updated.percentage = updated.entries.length ? Math.round((total / (updated.entries.length * 10)) * 100) : 0;
    setLocalData(updated);
  };

  const saveAssessment = async (statusOverride) => {
    if (!localData) return;
    setSaving(true);
    const reqData = {
      employee_code: selectedEmp,
      year: parseInt(year),
      period_type: periodType,
      period_value: activePeriod,
      status: statusOverride || localData.status || 'Draft',
      entries: localData.entries
    };
    try {
      const res = await fetch('/api/assessments/save', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData)
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Save failed');
      }
      toast.success(statusOverride === 'Submitted' ? 'Assessment submitted for review' : statusOverride === 'Reviewed' ? 'Assessment finalized' : 'Draft saved');
      await loadAssessments();
    } catch (e) {
      toast.error(e.message || 'Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  const exportXLSX = async () => {
    if (!localData) return;
    try {
      const XLSX = await import('xlsx');
      const wsData = [
        ['Category', 'Subcategory', 'Self Score', 'Manager Score', 'Combined Score', 'Employee Comment', 'Manager Comment'],
        ...localData.entries.map(e => [e.category, e.subcategory, e.self_score, e.manager_score, e.score, e.employee_comment, e.manager_comment]),
        [],
        ['Total Score', localData.total_score, '', '', '', 'Percentage', `${localData.percentage}%`]
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${activePeriod} Assessment`);
      XLSX.writeFile(wb, `${selectedEmp}_${year}_${activePeriod}_Assessment.xlsx`);
      toast.success('XLSX exported!');
    } catch {
      toast.error('Export failed — xlsx library may need install');
    }
  };

  const empName = isAdmin ? (employees.find(e => e.employee_code === selectedEmp)?.name || selectedEmp) : user?.name;
  const periodStatus = (p) => assessments.find(a => a.period_value === p);

  // Permissions
  const canEmployeeEdit = !isAdmin && (localData?.status === 'Draft' || localData?.status === 'Requested');
  const canManagerEdit = isAdmin && localData?.status !== 'Finalized';
  const statusCfg = STATUS_CONFIG[localData?.status] || STATUS_CONFIG['Draft'];

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="glass-panel p-6 border-white/5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Performance Intelligence Node</p>
            <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
            {isAdmin ? 'Performance Intelligence Panel' : 'My Success Matrix'}
          </h1>
        </div>

        <div className="flex gap-4 items-center">
            {isAdmin && !localData && (
                 <button 
                  onClick={handleRequestReview}
                  className="px-6 py-3 bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all flex items-center gap-2"
                >
                    <Send size={14} /> Request Submission
                </button>
            )}
            <div className="flex bg-white/5 rounded-xl p-1">
                {['Quarterly', 'Monthly'].map(t => (
                    <button 
                        key={t}
                        onClick={() => { setPeriodType(t); setActivePeriod(t === 'Quarterly' ? 'Q1' : 'Jan'); }}
                        className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${periodType === t ? 'bg-primary text-black' : 'text-white/40 hover:text-white'}`}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>
      </div>

        <div className="flex gap-3 items-center flex-wrap">
          {isAdmin && employees.length > 0 && (
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              className="glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-2.5 rounded-xl focus:outline-none focus:border-primary/30"
            >
              {employees.map(e => <option key={e.employee_code} value={e.employee_code} className="bg-[#080f1f]">{e.name} ({e.employee_code})</option>)}
            </select>
          )}
          <select
            value={year}
            onChange={e => { setYear(Number(e.target.value)); }}
            className="glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-2.5 rounded-xl focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-[#080f1f]">{y}</option>)}
          </select>
          <button
            onClick={exportXLSX}
            disabled={!localData}
            className="flex items-center gap-2 px-5 py-2.5 glass-panel border-white/10 hover:border-primary/30 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-30"
          >
            <Download size={14} /> Export XLSX
          </button>
        </div>
      </div>

      {/* Period Overview Stats */}
      <div className={`grid gap-4 ${periodType === 'Quarterly' ? 'grid-cols-4' : 'grid-cols-6 md:grid-cols-12'}`}>
        {PERIODS.map(p => {
          const ast = periodStatus(p);
          return (
            <div
              key={p}
              onClick={() => handleTabChange(p)}
              className={`glass-panel p-4 border-white/5 text-center cursor-pointer transition-all hover:border-primary/20 hover:scale-[1.02] ${activePeriod === p ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${activePeriod === p ? 'text-primary' : 'text-white/20'}`}>{p}</p>
              {ast ? (
                <div className="space-y-1">
                  <p className="text-sm font-display font-black text-white">{ast.percentage ?? 0}%</p>
                  <div className={`w-1.5 h-1.5 rounded-full mx-auto ${STATUS_CONFIG[ast.status]?.text.replace('text-', 'bg-') || 'bg-white/10'}`} />
                </div>
              ) : (
                <div className="h-4 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white/5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Period Tab Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {PERIODS.map(p => {
          const ast = periodStatus(p);
          return (
            <button
              key={p}
              onClick={() => handleTabChange(p)}
              className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                activePeriod === p ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'glass-panel border-white/5 text-white/40 hover:text-white hover:border-white/10'
              }`}
            >
              {p}
              {ast?.status === 'Submitted' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              {(ast?.status === 'Reviewed' || ast?.status === 'Finalized') && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !localData ? (
        /* Empty State */
        <div className="glass-panel border-white/5 p-16 flex flex-col items-center justify-center gap-6 animate-fade-in-up">
          <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/5">
            <BarChart3 size={40} className="text-white/10" />
          </div>
          <div className="text-center">
            <p className="text-white/60 font-bold text-lg mb-2">No {activePeriod} Assessment</p>
            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
              {isAdmin ? `No assessment started for ${empName} - ${activePeriod} ${year}` : `Your ${activePeriod} self-assessment hasn't been initialized yet`}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={createNewAssessment}
              className="flex items-center gap-3 px-10 py-4 bg-primary text-black font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Plus size={18} /> Initiate {activePeriod} Self-Assessment
            </button>
          )}
          {isAdmin && (
            <button
              onClick={createNewAssessment}
              className="flex items-center gap-3 px-10 py-4 glass-panel border-white/10 text-white/60 hover:text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all"
            >
              <Plus size={18} /> Create Assessment for {empName}
            </button>
          )}
        </div>
      ) : (
        /* Assessment Grid */
        <div className="glass-panel border-white/5 overflow-hidden animate-fade-in-up">
          {/* Assessment Header */}
          <div className="px-8 py-6 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">{empName} // {year}</p>
              <h3 className="text-lg font-black uppercase tracking-tighter text-white">{activePeriod} Performance Assessment</h3>
              <span className={`px-3 py-1 mt-2 inline-block rounded-full text-[9px] font-black uppercase tracking-widest ${statusCfg.bg} ${statusCfg.text}`}>
                {localData.status || 'Draft'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">Composite Score</p>
              <p className="text-5xl font-display font-black" style={{
                color: localData.percentage >= 80 ? '#10B981' : localData.percentage >= 60 ? '#F59E0B' : '#F43F5E'
              }}>
                {localData.percentage ?? 0}%
              </p>
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-black">
                {localData.total_score ?? 0} / {(localData.entries?.length || 0) * 10} pts
              </p>
            </div>
          </div>

          {/* Assessment Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/[0.01]">
                <tr>
                  <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Category</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">KRA & Criteria</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-primary w-24">Self (1/5/10)</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-emerald-400 w-24">Mgr (1/5/10)</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/20">Final</th>
                  <th className="px-4 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {(localData.entries || []).map((entry, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-4 text-xs font-black text-primary/70 uppercase tracking-widest">{entry.category}</td>
                    <td className="px-4 py-4 min-w-[280px]">
                      <div className="text-xs font-bold text-white mb-1 uppercase tracking-tight">{entry.subcategory}</div>
                      <div className="text-[10px] text-primary/40 leading-tight bg-primary/5 p-2 rounded-lg border border-primary/10 italic">
                        {entry.options?.[entry.manager_score || entry.self_score] || "Metric definition will appear upon selection"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1">
                        {[1, 5, 10].map(s => (
                          <button
                            key={s}
                            onClick={() => handleEntryChange(idx, 'self_score', s)}
                            disabled={isAdmin || !canEmployeeEdit}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${entry.self_score === s ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'glass-panel border-white/5 text-white/20 hover:text-white/40'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                       <div className="flex gap-1">
                        {[1, 5, 10].map(s => (
                          <button
                            key={s}
                            onClick={() => handleEntryChange(idx, 'manager_score', s)}
                            disabled={!canManagerEdit}
                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${entry.manager_score === s ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'glass-panel border-white/5 text-white/20 hover:text-white/40'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-display font-black" style={{
                        color: (entry.manager_score || entry.self_score || 0) >= 7 ? '#10B981' : (entry.manager_score || entry.self_score || 0) >= 5 ? '#F59E0B' : '#F43F5E'
                      }}>
                        {entry.manager_score || entry.self_score || 0}
                      </span>
                    </td>
                    <td className="px-4 py-4 sm:min-w-[200px]">
                      <input
                        type="text"
                        value={entry.employee_comment || ''}
                        onChange={e => handleEntryChange(idx, 'employee_comment', e.target.value)}
                        disabled={!canEmployeeEdit}
                        placeholder={isAdmin ? "Employee notes locked" : "Add self-observation..."}
                        className="w-full glass-panel border-white/10 text-white text-[10px] bg-transparent px-3 py-2 rounded-lg focus:outline-none disabled:opacity-30 placeholder-white/10"
                      />
                      {isAdmin && (
                        <input
                          type="text"
                          value={entry.manager_comment || ''}
                          onChange={e => handleEntryChange(idx, 'manager_comment', e.target.value)}
                          placeholder="Manager feedback..."
                          className="w-full mt-2 glass-panel border-white/10 text-emerald-400 text-[10px] bg-transparent px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500/30 placeholder-white/10"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="px-8 py-5 border-t border-white/5 bg-white/[0.01] flex gap-3 justify-end items-center flex-wrap">
            {saving && (
              <div className="flex items-center gap-2 text-[10px] text-white/40 font-black uppercase tracking-widest">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Syncing Matrix...
              </div>
            )}

            {/* Employee Actions (Personal View) */}
            {!isAdmin && !saving && (
              <>
                {canEmployeeEdit && (
                  <>
                    <button
                      onClick={() => saveAssessment('Draft')}
                      className="flex items-center gap-2 px-6 py-2.5 glass-panel border-white/10 hover:border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      <Save size={14} /> Save Draft
                    </button>
                    <button
                      onClick={() => saveAssessment('Submitted')}
                      className="flex items-center gap-2 px-8 py-2.5 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      <Send size={14} /> Commit Submission
                    </button>
                  </>
                )}
                {localData.status === 'Submitted' && (
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <AlertCircle size={14} /> Awaiting Managerial Review
                  </div>
                )}
                {(localData.status === 'Reviewed' || localData.status === 'Finalized') && (
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle size={14} /> Protocol Finalized
                  </div>
                )}
              </>
            )}

            {/* Admin Actions (Manager View) */}
            {isAdmin && !saving && (
              <>
                <button
                  onClick={() => saveAssessment(localData.status || 'Draft')}
                  className="flex items-center gap-2 px-6 py-2.5 glass-panel border-white/10 hover:border-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  <Save size={14} /> Save Changes
                </button>
                <button
                  onClick={() => saveAssessment('Reviewed')}
                  className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle size={14} /> Finalize Protocol
                </button>
              </>
            )}
            
            <button
               onClick={exportXLSX}
               className="flex items-center gap-2 px-4 py-2.5 glass-panel border-white/10 hover:border-white/20 text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <Download size={14} /> Export Node
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
