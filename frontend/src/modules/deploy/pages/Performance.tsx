'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import {
    Target, Users, Briefcase, Plus, Save, Trash2, CheckCircle,
    LayoutDashboard, User, Settings, Layers, Trophy, X, MessageSquare, ClipboardCheck
} from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

// --- Interfaces ---


interface Employee {
    employee_code: string;
    name: string;
    team: string;
    designation?: string;
    reporting_manager?: string;

}



interface AssessmentEntry {
    category: string;
    subcategory: string;
    self_score: number;
    manager_score: number;
    score: number; // Final/Manager score
    manager_comment: string;
    employee_comment: string;
}

interface AssessmentQuarter {
    quarter: string;
    status: string;
    total_score: number;
    percentage: number;
    entries: AssessmentEntry[];
    exists: boolean;
}

export default function PerformanceManagement() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();

    // Auth Check
    const isAuthorized = user && ['Admin', 'HR', 'Management', 'Employee'].includes(viewingAsRole || '');

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            if (!user) navigate('/');
            else navigate('/dashboard');
        }
    }, [authLoading, isAuthorized, user, navigate]);

    // Menu logic
    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);
    const [activeTab, setActiveTab] = useState<'assessments' | 'increments'>('assessments');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Data State
    const [employees, setEmployees] = useState<Employee[]>([]);

    const fetchInitialData = async () => {
        if (!user) return;
        try {
            const res = await fetch('/api/employees', { credentials: 'include' });
            if (res.ok) setEmployees(await res.json());
        } catch (err) {
            console.error("Failed to load data", err);
        }
    };

    useEffect(() => {
        fetchInitialData();
        if (viewingAsRole === 'Employee') {
            setAssessmentEmployee(user?.employee_code || '');
        }
    }, [user, viewingAsRole]);

    // --- Assessments Logic ---
    const [assessmentYear, setAssessmentYear] = useState(new Date().getFullYear());
    const [assessmentEmployee, setAssessmentEmployee] = useState('');
    const [assessments, setAssessments] = useState<AssessmentQuarter[]>([]);
    const [periodType, setPeriodType] = useState<'Monthly' | 'Quarterly'>('Monthly');
    const [activeQuarter, setActiveQuarter] = useState('Jan');

    const fetchAssessments = async () => {
        if (!assessmentEmployee) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/assessments/${assessmentEmployee}/${assessmentYear}`, { credentials: 'include' });
            if (res.ok) {
                setAssessments(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'assessments' && assessmentEmployee) {
            fetchAssessments();
        }
    }, [activeTab, assessmentEmployee, assessmentYear]);

    const handleSaveAssessment = async (quarterData: AssessmentQuarter, status: string) => {
        if (!assessmentEmployee) return;

        if (status === 'Submitted' && viewingAsRole === 'Employee') {
            if (!confirm("Are you sure you want to finalize your assessment? You will NOT be able to edit it after this.")) return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/assessments/save', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_code: assessmentEmployee,
                    year: assessmentYear,
                    quarter: quarterData.quarter,
                    entries: quarterData.entries,
                    status: status
                })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: status === 'Draft' ? 'Draft saved successfully!' : 'Assessment submitted successfully!' });
                fetchAssessments();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save assessment' });
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleExportExcel = () => {
        if (!assessmentEmployee || assessments.length === 0) return;

        const periods = periodType === 'Monthly'
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            : ['Q1', 'Q2', 'Q3', 'Q4'];

        // Find existing data for this employee
        const exportData: any[] = [];

        // We use the first quarter to get template
        const template = assessments[0]?.entries || [];

        template.forEach(templateEntry => {
            const row: any = {
                Category: templateEntry.category,
                Metric: templateEntry.subcategory,
            };

            periods.forEach(p => {
                const qData = assessments.find(a => a.quarter === p);
                if (qData && qData.exists) {
                    const entry = qData.entries.find(e => e.subcategory === templateEntry.subcategory);
                    row[`${p} (Mgr Score)`] = entry ? entry.manager_score : 0;
                } else {
                    row[`${p} (Mgr Score)`] = '-';
                }
            });
            exportData.push(row);
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Annual Review");
        XLSX.writeFile(wb, `${assessmentEmployee}_Performance_${assessmentYear}.xlsx`);
    };










    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />
            <StaggeredMenu
                position="right"
                isFixed={true}
                items={menuItems}
                displayItemNumbering={true}
                menuButtonColor="#fff"
                openMenuButtonColor="#fff"
                changeMenuColorOnOpen={true}
                colors={['#B19EEF', '#5227FF']}
                logoUrl="/logo.png"
                accentColor="var(--color-brand-purple)"
                menuBackgroundColor="#000000ff"
                itemTextColor="#ffffff"
                smartHeader={true}
                headerColor="#000000ff"
            />

            <main className="relative z-10 max-w-7xl mx-auto p-6 pt-32">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 flex items-center gap-3">
                            <Trophy className="text-brand-purple" size={32} /> Performance Management
                        </h1>
                        <p className="text-gray-400 mt-1">Manage Quarterly Reviews and Assessments.</p>
                    </div>

                    <div className="flex bg-[#222] p-1 rounded-full border border-[#333]">
                        <button
                            onClick={() => setActiveTab('assessments')}
                            className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'assessments'
                                ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <LayoutDashboard size={16} /> {viewingAsRole === 'Employee' ? 'Self Assessment' : 'Reviews'}
                            {viewingAsRole !== 'Employee' && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                            )}
                        </button>
                        {viewingAsRole !== 'Employee' && (
                            <button
                                onClick={() => setActiveTab('increments')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === 'increments'
                                    ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <ClipboardCheck size={16} /> Increments & Reports
                            </button>
                        )}
                    </div>
                </div>

                {
                    message.text && (
                        <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                            {message.type === 'success' ? <CheckCircle size={18} /> : <Trash2 size={18} />}
                            {message.text}
                            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto hover:underline text-xs">Dismiss</button>
                        </div>
                    )
                }



                {/* --- TAB 4: QUARTERLY ASSESSMENTS (Excel-like) --- */}
                {
                    activeTab === 'assessments' && (
                        <div className="animate-fade-in-up space-y-6">
                            {/* 1. Filters */}
                            <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 flex flex-wrap gap-6 items-center">

                                <div>
                                    <label className="text-xs text-gray-500 uppercase block mb-1">Cycle</label>
                                    <select
                                        value={periodType}
                                        onChange={(e) => {
                                            const type = e.target.value as 'Monthly' | 'Quarterly';
                                            setPeriodType(type);
                                            setActiveQuarter(type === 'Monthly' ? 'Jan' : 'Q1');
                                        }}
                                        disabled={viewingAsRole === 'Employee'}
                                        className={`bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple min-w-[120px] ${viewingAsRole === 'Employee' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="Monthly">Monthly</option>
                                        <option value="Quarterly">Quarterly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase block mb-1">Assessment Year</label>
                                    <select
                                        value={assessmentYear}
                                        onChange={(e) => setAssessmentYear(parseInt(e.target.value))}
                                        disabled={viewingAsRole === 'Employee'}
                                        className={`bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple min-w-[120px] ${viewingAsRole === 'Employee' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>

                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 uppercase block mb-1">Employee</label>
                                    <select
                                        value={assessmentEmployee}
                                        onChange={(e) => setAssessmentEmployee(e.target.value)}
                                        disabled={viewingAsRole === 'Employee'}
                                        className={`w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple ${viewingAsRole === 'Employee' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">Select Employee to Assess...</option>
                                        {employees.filter(e => {
                                            if (viewingAsRole === 'Employee') return e.employee_code === user?.employee_code;
                                            if (viewingAsRole === 'Management') {
                                                const me = employees.find(em => em.employee_code === user.employee_code);
                                                const myName = me ? me.name : "";
                                                // Check exact code match or name match for reporting manager
                                                return e.employee_code === user.employee_code ||
                                                    (e.reporting_manager && (e.reporting_manager === user.employee_code || e.reporting_manager === myName));
                                            }
                                            return true;
                                        }).map(e => (
                                            <option key={e.employee_code} value={e.employee_code}>{e.name} ({e.employee_code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 2. Quarter Tabs & Content */}
                            {assessmentEmployee && (
                                <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl overflow-hidden">
                                    {/* Tab Header */}
                                    <div className="flex border-b border-[#222] bg-[#151515]">
                                        {(periodType === 'Monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Q1', 'Q2', 'Q3', 'Q4']).map(q => {
                                            const qData = assessments.find(a => a.quarter === q);
                                            const exists = qData?.exists;
                                            return (
                                                <button
                                                    key={q}
                                                    onClick={() => setActiveQuarter(q)}
                                                    className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex flex-col items-center gap-1 ${activeQuarter === q
                                                        ? 'border-brand-purple text-white bg-[#1a1a1a]'
                                                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]/50'
                                                        }`}
                                                >
                                                    <span>{q}</span>
                                                    {exists && (
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full relative ${qData?.status === 'Submitted' ? 'bg-green-900/40 text-green-400' : (qData?.status === 'Reviewed' ? 'bg-blue-900/40 text-blue-400' : 'bg-yellow-900/40 text-yellow-400')}`}>
                                                            {qData?.status} • {qData?.percentage}%
                                                            {/* Manager needs to review */}
                                                            {qData?.status === 'Submitted' && viewingAsRole !== 'Employee' && (
                                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                                            )}
                                                            {/* Employee seeing finalized review */}
                                                            {qData?.status === 'Reviewed' && viewingAsRole === 'Employee' && (
                                                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                                                            )}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Content Grid */}
                                    <div className="p-6 overflow-x-auto">
                                        {(() => {
                                            const currentData = assessments.find(a => a.quarter === activeQuarter);
                                            if (!currentData) return <div className="p-12 text-center text-gray-500">Loading template...</div>;

                                            return (
                                                <div className="min-w-[1000px]">
                                                    {/* Header Row */}
                                                    <div className="grid grid-cols-12 gap-4 mb-4 text-xs font-bold text-gray-500 uppercase border-b border-[#333] pb-2">
                                                        <div className="col-span-3">Subcategory</div>
                                                        <div className="col-span-1 text-center">Self</div>
                                                        <div className="col-span-3">Employee's Comments</div>
                                                        <div className="col-span-1 text-center">Mgr</div>
                                                        <div className="col-span-4">Manager's Comments</div>
                                                    </div>

                                                    <div className="space-y-8">
                                                        {Object.keys(currentData.entries.reduce((acc, e) => ({ ...acc, [e.category]: true }), {})).map(category => (
                                                            <div key={category}>
                                                                <div className="bg-brand-purple/10 text-brand-purple font-bold px-3 py-1 rounded text-sm mb-2 inline-block">
                                                                    {category}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {currentData.entries.filter(e => e.category === category).map((entry, idx) => {
                                                                        // We need index to update specific entry in the array
                                                                        const realIndex = currentData.entries.findIndex(e => e.category === category && e.subcategory === entry.subcategory);

                                                                        return (
                                                                            <div key={idx} className="grid grid-cols-12 gap-4 items-start p-3 rounded-lg hover:bg-[#1a1a1a] transition-colors border border-transparent hover:border-[#333]">
                                                                                <div className="col-span-3 pt-2">
                                                                                    <div className="text-white font-medium text-sm">{entry.subcategory}</div>
                                                                                </div>

                                                                                {/* SELF SCORE (Employee) */}
                                                                                <div className="col-span-1">
                                                                                    <select
                                                                                        value={entry.self_score}
                                                                                        onChange={(e) => {
                                                                                            const newAssessments = [...assessments];
                                                                                            const qIdx = newAssessments.findIndex(a => a.quarter === activeQuarter);
                                                                                            newAssessments[qIdx] = { ...newAssessments[qIdx], entries: [...newAssessments[qIdx].entries] };
                                                                                            newAssessments[qIdx].entries[realIndex] = { ...newAssessments[qIdx].entries[realIndex], self_score: parseInt(e.target.value) };
                                                                                            setAssessments(newAssessments);
                                                                                        }}
                                                                                        disabled={viewingAsRole !== 'Employee' || currentData.status === 'Submitted'}
                                                                                        className={`w-full bg-[#111] border border-[#333] rounded px-1 py-2 text-center text-white focus:border-brand-purple outline-none ${(viewingAsRole !== 'Employee' || currentData.status === 'Submitted') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    >
                                                                                        <option value="0">-</option>
                                                                                        <option value="1">1</option>
                                                                                        <option value="5">5</option>
                                                                                        <option value="10">10</option>
                                                                                    </select>
                                                                                </div>

                                                                                {/* EMPLOYEE COMMENT */}
                                                                                <div className="col-span-3">
                                                                                    <textarea
                                                                                        value={entry.employee_comment || ''}
                                                                                        onChange={(e) => {
                                                                                            const newAssessments = [...assessments];
                                                                                            const qIdx = newAssessments.findIndex(a => a.quarter === activeQuarter);
                                                                                            newAssessments[qIdx] = { ...newAssessments[qIdx], entries: [...newAssessments[qIdx].entries] };
                                                                                            newAssessments[qIdx].entries[realIndex] = { ...newAssessments[qIdx].entries[realIndex], employee_comment: e.target.value };
                                                                                            setAssessments(newAssessments);
                                                                                        }}
                                                                                        placeholder={viewingAsRole !== 'Employee' ? "No self reflection..." : "Self reflection..."}
                                                                                        disabled={viewingAsRole !== 'Employee' || currentData.status === 'Submitted'}
                                                                                        className={`w-full bg-[#111] border border-[#333] rounded p-2 text-xs text-white focus:border-brand-purple outline-none min-h-[60px] ${(viewingAsRole !== 'Employee' || currentData.status === 'Submitted') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>

                                                                                {/* MGR SCORE */}
                                                                                <div className="col-span-1">
                                                                                    <select
                                                                                        value={entry.manager_score}
                                                                                        onChange={(e) => {
                                                                                            const newAssessments = [...assessments];
                                                                                            const qIdx = newAssessments.findIndex(a => a.quarter === activeQuarter);
                                                                                            newAssessments[qIdx] = { ...newAssessments[qIdx], entries: [...newAssessments[qIdx].entries] };
                                                                                            newAssessments[qIdx].entries[realIndex] = { ...newAssessments[qIdx].entries[realIndex], manager_score: parseInt(e.target.value) };
                                                                                            setAssessments(newAssessments);
                                                                                        }}
                                                                                        disabled={viewingAsRole === 'Employee' || currentData.status === 'Draft'}
                                                                                        className={`w-full bg-[#111] border border-[#333] rounded px-1 py-2 text-center text-white focus:border-brand-purple outline-none ${(viewingAsRole === 'Employee' || currentData.status === 'Draft') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    >
                                                                                        <option value="0">-</option>
                                                                                        <option value="1">1</option>
                                                                                        <option value="5">5</option>
                                                                                        <option value="10">10</option>
                                                                                    </select>
                                                                                </div>

                                                                                {/* MANAGER COMMENT */}
                                                                                <div className="col-span-4">
                                                                                    <textarea
                                                                                        value={entry.manager_comment || ''}
                                                                                        onChange={(e) => {
                                                                                            const newAssessments = [...assessments];
                                                                                            const qIdx = newAssessments.findIndex(a => a.quarter === activeQuarter);
                                                                                            newAssessments[qIdx] = { ...newAssessments[qIdx], entries: [...newAssessments[qIdx].entries] };
                                                                                            newAssessments[qIdx].entries[realIndex] = { ...newAssessments[qIdx].entries[realIndex], manager_comment: e.target.value };
                                                                                            setAssessments(newAssessments);
                                                                                        }}
                                                                                        placeholder={viewingAsRole === 'Employee' ? "Manager feedback..." : (currentData.status === 'Draft' ? "Waiting for employee to submit..." : "Mgr feedback...")}
                                                                                        disabled={viewingAsRole === 'Employee' || currentData.status === 'Draft'}
                                                                                        className={`w-full bg-[#111] border border-[#333] rounded p-2 text-xs text-white focus:border-brand-purple outline-none min-h-[60px] ${(viewingAsRole === 'Employee' || currentData.status === 'Draft') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-8 pt-6 border-t border-[#333] flex flex-col md:flex-row justify-between items-center gap-6">
                                                        <div className="flex items-center gap-8">
                                                            {/* Self Score */}
                                                            <div>
                                                                <div className="text-gray-500 text-xs uppercase mb-1">Self Score</div>
                                                                <span className="text-2xl font-bold text-gray-300">
                                                                    {currentData.entries.reduce((sum, e) => sum + e.self_score, 0)}
                                                                    <span className="text-gray-600 text-sm font-normal"> / 140</span>
                                                                </span>
                                                                <div className="text-sm font-bold text-brand-purple">
                                                                    {((currentData.entries.reduce((sum, e) => sum + e.self_score, 0) / 140) * 100).toFixed(1)}%
                                                                </div>
                                                            </div>

                                                            {/* Vertical Divider */}
                                                            <div className="w-px h-12 bg-[#333]"></div>

                                                            {/* Manager Score */}
                                                            <div>
                                                                <div className="text-gray-500 text-xs uppercase mb-1">Manager Score</div>
                                                                <span className="text-2xl font-bold text-white">
                                                                    {currentData.entries.reduce((sum, e) => sum + e.manager_score, 0)}
                                                                    <span className="text-gray-600 text-sm font-normal"> / 140</span>
                                                                </span>
                                                                <div className="text-sm font-bold text-green-400">
                                                                    {((currentData.entries.reduce((sum, e) => sum + e.manager_score, 0) / 140) * 100).toFixed(1)}%
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {viewingAsRole === 'Employee' ? (
                                                                currentData.status === 'Submitted' ? (
                                                                    <div className="px-6 py-3 bg-[#222] text-green-400 rounded-xl font-medium border border-[#333] flex items-center gap-2">
                                                                        <CheckCircle size={18} /> Submitted
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleSaveAssessment(currentData, 'Draft')}
                                                                            disabled={loading}
                                                                            className="px-6 py-3 border border-[#333] hover:bg-[#222] text-gray-300 rounded-xl font-medium transition-all"
                                                                        >
                                                                            Save Draft
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleSaveAssessment(currentData, 'Submitted')}
                                                                            disabled={loading}
                                                                            className="px-6 py-3 bg-brand-purple hover:bg-opacity-90 text-white rounded-xl font-bold shadow-lg shadow-brand-purple/20 flex items-center gap-2 transition-all"
                                                                        >
                                                                            <Save size={18} />
                                                                            Submit Final
                                                                        </button>
                                                                    </>
                                                                )
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleSaveAssessment(currentData, 'Submitted')}
                                                                    disabled={loading || currentData.status === 'Draft'}
                                                                    className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all ${currentData.status === 'Draft' ? 'bg-[#222] text-gray-500 border border-[#333] cursor-not-allowed' : 'bg-brand-purple hover:bg-opacity-90 text-white shadow-brand-purple/20'}`}
                                                                >
                                                                    <Save size={18} />
                                                                    {loading ? 'Saving Review...' : (currentData.status === 'Draft' ? 'Waiting for Submission' : 'Submit Review')}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {!assessmentEmployee && (
                                <div className="p-12 text-center border border-dashed border-[#333] rounded-3xl text-gray-500 bg-[#111]/50">
                                    Select an employee above to start or view their quarterly assessment.
                                </div>
                            )}
                        </div>
                    )
                }

                {/* --- TAB: INCREMENTS & REPORTS --- */}
                {activeTab === 'increments' && viewingAsRole !== 'Employee' && (
                    <div className="animate-fade-in-up space-y-6">
                        {/* Filters */}
                        <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 flex flex-wrap gap-6 items-center">
                            <div>
                                <label className="text-xs text-gray-500 uppercase block mb-1">Cycle</label>
                                <select
                                    value={periodType}
                                    onChange={(e) => setPeriodType(e.target.value as 'Monthly' | 'Quarterly')}
                                    className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple min-w-[120px]"
                                >
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase block mb-1">Assessment Year</label>
                                <select
                                    value={assessmentYear}
                                    onChange={(e) => setAssessmentYear(parseInt(e.target.value))}
                                    className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple min-w-[120px]"
                                >
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="text-xs text-gray-500 uppercase block mb-1">Employee</label>
                                <select
                                    value={assessmentEmployee}
                                    onChange={(e) => setAssessmentEmployee(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-white outline-none focus:border-brand-purple"
                                >
                                    <option value="">Select Employee...</option>
                                    {employees.filter(e => {
                                        if (viewingAsRole === 'Management') {
                                            const me = employees.find(em => em.employee_code === user?.employee_code);
                                            return e.employee_code === user?.employee_code ||
                                                (e.reporting_manager && (e.reporting_manager === user?.employee_code || e.reporting_manager === me?.name));
                                        }
                                        return true;
                                    }).map(e => (
                                        <option key={e.employee_code} value={e.employee_code}>{e.name} ({e.employee_code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:ml-auto pt-4 md:pt-0">
                                <button
                                    onClick={handleExportExcel}
                                    disabled={!assessmentEmployee || assessments.length === 0}
                                    className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all ${(!assessmentEmployee || assessments.length === 0)
                                            ? 'bg-[#222] text-gray-500 border border-[#333]'
                                            : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                                        }`}
                                >
                                    <Save size={18} /> Export Sheet
                                </button>
                            </div>
                        </div>

                        {/* Display Table Wrapper */}
                        {assessmentEmployee ? (
                            <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 overflow-x-auto custom-scrollbar">
                                <div className="mb-6 flex justify-between items-center">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Target className="text-brand-purple" size={24} /> Increment & Performance Matrix
                                    </h2>
                                </div>

                                <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#333]">
                                            <th className="py-4 pl-4 font-bold text-gray-400 uppercase">Metric</th>
                                            {(periodType === 'Monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Q1', 'Q2', 'Q3', 'Q4']).map(p => (
                                                <th key={p} className="py-4 px-4 text-center border-l border-[#222]">
                                                    <div className="font-bold text-gray-300">{p}</div>
                                                    <button
                                                        onClick={() => {
                                                            setPeriodType(periodType);
                                                            setActiveQuarter(p);
                                                            setActiveTab('assessments');
                                                        }}
                                                        className="text-[10px] text-brand-purple hover:underline mt-1 block w-full text-center"
                                                    >
                                                        Edit
                                                    </button>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#222]">
                                        {/* Categories logic */}
                                        {Object.entries((assessments[0]?.entries || []).reduce((acc: any, cur: any) => {
                                            if (!acc[cur.category]) acc[cur.category] = [];
                                            acc[cur.category].push(cur.subcategory);
                                            return acc;
                                        }, {})).map(([cat, subcats]: [string, any]) => (
                                            <React.Fragment key={cat}>
                                                <tr className="bg-[#0a0a0a]">
                                                    <td colSpan={periodType === 'Monthly' ? 13 : 5} className="py-3 pl-4 font-bold text-brand-purple text-xs uppercase tracking-widest">{cat}</td>
                                                </tr>
                                                {subcats.map((sub: string) => (
                                                    <tr key={sub} className="hover:bg-[#1a1a1a] transition-colors">
                                                        <td className="py-4 pl-8 text-gray-300">{sub}</td>
                                                        {(periodType === 'Monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Q1', 'Q2', 'Q3', 'Q4']).map(p => {
                                                            const qData = assessments.find(a => a.quarter === p);
                                                            const exists = qData?.exists;
                                                            const entry = exists ? qData.entries.find(e => e.subcategory === sub) : null;
                                                            const score = entry ? entry.manager_score : null;

                                                            return (
                                                                <td key={p} className="py-4 px-4 text-center border-l border-[#222]">
                                                                    {exists && score !== null ? (
                                                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${score >= 8 ? 'bg-green-900/30 text-green-400' :
                                                                                score >= 5 ? 'bg-yellow-900/30 text-yellow-400' :
                                                                                    score > 0 ? 'bg-red-900/30 text-red-400' : 'text-gray-600'
                                                                            }`}>
                                                                            {score || '-'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-gray-600">-</span>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}

                                        {/* Totals Row */}
                                        <tr className="bg-[#151515] border-t-2 border-[#333]">
                                            <td className="py-4 pl-4 font-bold text-white uppercase tracking-widest text-xs">Total Percentage</td>
                                            {(periodType === 'Monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Q1', 'Q2', 'Q3', 'Q4']).map(p => {
                                                const qData = assessments.find(a => a.quarter === p);
                                                return (
                                                    <td key={p} className="py-4 px-4 text-center border-l border-[#222] font-bold">
                                                        {qData?.exists ? (
                                                            <span className={qData.percentage >= 80 ? 'text-green-400' : qData.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                                                                {qData.percentage}%
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-12 text-center border border-dashed border-[#333] rounded-3xl text-gray-500 bg-[#111]/50">
                                Select an employee above to view their Increment Compilation Sheet.
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
