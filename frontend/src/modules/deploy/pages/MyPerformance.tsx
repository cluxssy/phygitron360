'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface AssessmentEntry {
    category: string;
    subcategory: string;
    self_score: number;
    manager_score: number;
    score: number;
    manager_comment: string;
    employee_comment: string;
}

interface AssessmentData {
    quarter: string;
    status: string;
    total_score: number;
    percentage: number;
    entries: AssessmentEntry[];
    exists: boolean;
}

export default function MyPerformance() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const [assessments, setAssessments] = useState<AssessmentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeQuarter, setActiveQuarter] = useState<string>('Jan');
    const [periodType, setPeriodType] = useState<'Monthly' | 'Quarterly'>('Monthly');
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<AssessmentEntry[]>([]);

    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
            return;
        }
        // Show employee UI if linked to an employee profile, OR if explicitly viewing as Employee
        if (user && (user.employee_code || viewingAsRole === 'Employee')) fetchAssessments();
        else if (user) setLoading(false); // admin without employee profile in non-employee view
    }, [user, authLoading, viewingAsRole, navigate]);

    const fetchAssessments = async () => {
        if (!user?.employee_code) {
            // Admin in employee view but not linked — show empty state, backend will handle the error
            setLoading(false);
            return;
        }
        try {
            const year = new Date().getFullYear();
            // TODO: Ensure employee_code is available in user context
            const res = await fetch(`/api/assessments/${user?.employee_code}/${year}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setAssessments(data);

                // Set default form data for active quarter
                const currentData = data.find((d: AssessmentData) => d.quarter === activeQuarter);
                setFormData(currentData ? currentData.entries : []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // When active quarter changes, update form data
    useEffect(() => {
        const currentData = assessments.find((d) => d.quarter === activeQuarter);
        if (currentData) {
            setFormData(currentData.entries);
        }
    }, [activeQuarter, assessments]);

    const handleScoreChange = (index: number, score: number) => {
        const newEntries = [...formData];
        newEntries[index].self_score = score;
        setFormData(newEntries);
    };

    const handleCommentChange = (index: number, comment: string) => {
        const newEntries = [...formData];
        newEntries[index].employee_comment = comment;
        setFormData(newEntries);
    };

    const handleSubmit = async (submitStatus: 'Draft' | 'Submitted') => {
        setSaving(true);
        try {
            const year = new Date().getFullYear();
            const res = await fetch('/api/assessments/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_code: user?.employee_code,
                    year: year,
                    quarter: activeQuarter,
                    entries: formData,
                    status: submitStatus
                }),
                credentials: 'include'
            });

            if (res.ok) {
                // Refresh data
                await fetchAssessments();
                alert(submitStatus === 'Draft' ? 'Saved as Draft' : 'Submitted successfully');
            } else {
                alert('Failed to save');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving assessment');
        } finally {
            setSaving(false);
        }
    };

    const currentStatus = assessments.find(a => a.quarter === activeQuarter)?.status || 'Not Started';
    const isLocked = currentStatus === 'Submitted' || currentStatus === 'Reviewed' || currentStatus === 'Finalized';

    if (loading) return <div className="min-h-screen bg-brand-black flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2" /> Loading...</div>;

    // Only show "no profile" screen if not in employee view — in employee view, allow the form to attempt to load
    if (!user?.employee_code && viewingAsRole !== 'Employee') {
        return (
            <div className="min-h-screen bg-brand-black text-white relative">
                <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />
                <StaggeredMenu position="right" isFixed={true} items={menuItems} displayItemNumbering={true} smartHeader={true} logoUrl="/logo.png" menuBackgroundColor="#000000ff" />
                <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10 animate-fade-in-up">
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 mb-6">
                            <Target size={48} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-300 mb-3">No Performance Data Available</h1>
                        <p className="text-gray-500 max-w-md">This account is not linked to an employee profile. Contact your administrator to link an employee code.</p>
                    </div>
                </main>
            </div>
        );
    }

    // In employee view with no employee_code: show a clear message
    if (!user?.employee_code && viewingAsRole === 'Employee') {
        return (
            <div className="min-h-screen bg-brand-black text-white relative">
                <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />
                <StaggeredMenu position="right" isFixed={true} items={menuItems} displayItemNumbering={true} smartHeader={true} logoUrl="/logo.png" menuBackgroundColor="#000000ff" />
                <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10 animate-fade-in-up">
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400 mb-6">
                            <Target size={48} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-300 mb-3">Employee Profile Not Linked</h1>
                        <p className="text-gray-500 max-w-md">Your admin account is not linked to an employee profile. Ask another admin to link your employee code from the Admin panel so you can access attendance and performance features as an employee.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />
            <StaggeredMenu position="right" isFixed={true} items={menuItems} displayItemNumbering={true} smartHeader={true} logoUrl="/logo.png" menuBackgroundColor="#000000ff" />

            <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10 animate-fade-in-up">

                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400"><Target size={32} /></div>
                            Quarterly Assessment
                        </h1>
                        <p className="text-gray-400">Manage your performance self-evaluations.</p>
                    </div>

                    <div className="flex flex-col gap-4 items-end">
                        <select
                            value={periodType}
                            onChange={(e) => {
                                const val = e.target.value as 'Monthly' | 'Quarterly';
                                setPeriodType(val);
                                setActiveQuarter(val === 'Monthly' ? 'Jan' : 'Q1');
                            }}
                            className="bg-[#1a1a1a] border border-[#333] rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-brand-purple"
                        >
                            <option value="Monthly">Monthly Reviews</option>
                            <option value="Quarterly">Quarterly Reviews</option>
                        </select>
                        <div className="flex gap-2 flex-wrap justify-end max-w-md">
                            {(periodType === 'Monthly' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Q1', 'Q2', 'Q3', 'Q4']).map(q => (
                                <button
                                    key={q}
                                    onClick={() => setActiveQuarter(q)}
                                    className={`px-4 py-2 rounded-lg font-bold transition-all ${activeQuarter === q ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'bg-[#222] text-gray-400 hover:bg-[#333]'
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Bar */}
                <div className="bg-[#111]/80 backdrop-blur border border-[#333] rounded-2xl p-4 mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isLocked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                        <span className="font-bold text-gray-300">Status: <span className="text-white">{currentStatus}</span></span>
                    </div>

                    {!isLocked && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleSubmit('Draft')}
                                disabled={saving}
                                className="px-4 py-2 bg-[#222] hover:bg-[#333] rounded-lg text-sm font-bold text-gray-300 transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Draft'}
                            </button>
                            <button
                                onClick={() => handleSubmit('Submitted')}
                                disabled={saving}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2"
                            >
                                <CheckCircle size={16} /> Submit Assessment
                            </button>
                        </div>
                    )}
                    {isLocked && <div className="text-sm text-green-400 flex items-center gap-2"><CheckCircle size={16} /> Assessment Submitted</div>}
                </div>

                {/* Form */}
                <div className="space-y-6">
                    {/* Group by Category */}
                    {Object.entries(formData.reduce((acc, item) => {
                        if (!acc[item.category]) acc[item.category] = [];
                        acc[item.category].push(item);
                        return acc;
                    }, {} as Record<string, AssessmentEntry[]>)).map(([category, items], catIndex) => (
                        <div key={category} className="bg-[#111]/80 backdrop-blur border border-[#222] rounded-2xl overflow-hidden p-6">
                            <h2 className="text-xl font-bold text-purple-400 mb-6 uppercase tracking-wider">{category}</h2>

                            <div className="space-y-6">
                                {items.map((item, index) => {
                                    // Calculate actual index in formData to update correctly
                                    const realIndex = formData.findIndex(f => f.category === item.category && f.subcategory === item.subcategory);

                                    return (
                                        <div key={item.subcategory} className="pb-6 border-b border-[#222] last:border-0 last:pb-0">
                                            <div className="flex justify-between md:items-center flex-col md:flex-row gap-4 mb-4">
                                                <div className="w-full md:w-1/3">
                                                    <h3 className="font-bold text-white text-lg">{item.subcategory}</h3>
                                                    <p className="text-xs text-gray-500 mt-1">Rate yourself on a scale of 1-10.</p>
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                                                        <button
                                                            key={score}
                                                            disabled={isLocked}
                                                            onClick={() => handleScoreChange(realIndex, score)}
                                                            className={`w-8 h-8 rounded-lg font-bold text-sm transition-all ${item.self_score === score
                                                                ? 'bg-purple-600 text-white shadow-lg scale-110'
                                                                : 'bg-[#222] text-gray-500 hover:bg-[#333]'
                                                                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {score}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Your Comments</label>
                                                    <textarea
                                                        value={item.employee_comment}
                                                        onChange={(e) => handleCommentChange(realIndex, e.target.value)}
                                                        disabled={isLocked}
                                                        placeholder="Provide examples..."
                                                        className="w-full bg-[#151515] border border-[#333] rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-purple-500 transition-colors h-24 resize-none disabled:opacity-50"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Manager Comments</label>
                                                    <div className="w-full bg-[#151515] border border-[#333] rounded-xl p-3 text-sm text-gray-400 h-24 overflow-y-auto italic">
                                                        {item.manager_comment || "No comments yet."}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}
