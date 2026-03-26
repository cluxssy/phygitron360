'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, BookOpen, User, Calendar, CheckCircle, Clock, Plus, Save, Search
} from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface Program {
    id: number;
    program_name: string;
    description?: string;
    default_duration?: string;
}

interface Assignment {
    id: number;
    employee_code: string;
    employee_name: string;
    program_name: string;
    training_date: string;
    training_status: string;
    training_duration: string;
}

interface Employee {
    employee_code: string;
    name: string;
    team: string;
}

export default function TrainingManagement() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();

    // Auth Check
    const isAuthorized = user && viewingAsRole !== 'Employee' && (user.permissions?.includes('can_manage_training') || ['Admin', 'HR'].includes(user.role));

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            if (!user) navigate('/');
            else navigate('/dashboard');
        }
    }, [authLoading, isAuthorized, user, viewingAsRole, navigate]);

    const [activeTab, setActiveTab] = useState<'assignments' | 'library' | 'assign'>('assignments');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Data
    const [programs, setPrograms] = useState<Program[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Forms
    const [newProgram, setNewProgram] = useState({ program_name: '', description: '', default_duration: '' });
    const [newAssignment, setNewAssignment] = useState({
        program_id: '',
        date: '',
        duration: '',
        employee_codes: [] as string[]
    });

    // Filters
    const [searchAssignment, setSearchAssignment] = useState('');
    const [searchTrainingEmployees, setSearchTrainingEmployees] = useState('');

    // Menu Items
    const menuItems = user ? getMenuItems(viewingAsRole || undefined, user?.permissions) : [];

    // Protected Content




    const fetchData = async () => {
        try {
            const [pRes, aRes, eRes] = await Promise.all([
                fetch('/api/training/programs', { credentials: 'include' }),
                fetch('/api/training/assignments', { credentials: 'include' }),
                fetch('/api/employees', { credentials: 'include' })
            ]);

            if (pRes.ok) setPrograms(await pRes.json());
            if (aRes.ok) setAssignments(await aRes.json());
            if (eRes.ok) setEmployees(await eRes.json());

        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/training/programs', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProgram)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Program created!' });
                setNewProgram({ program_name: '', description: '', default_duration: '' });
                fetchData();
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleAssign = async () => {
        if (!newAssignment.program_id || newAssignment.employee_codes.length === 0) {
            alert('Please select a program and at least one employee.');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/training/assign', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAssignment)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'Training Assigned Successfully!' });
                setNewAssignment({ program_id: '', date: '', duration: '', employee_codes: [] });
                fetchData();
                setActiveTab('assignments');
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            const res = await fetch(`/api/training/assignment/${id}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchData();
        } catch (err) { console.error(err); }
    };

    const toggleEmployeeSelection = (code: string) => {
        setNewAssignment(prev => {
            const exists = prev.employee_codes.includes(code);
            return {
                ...prev,
                employee_codes: exists
                    ? prev.employee_codes.filter(c => c !== code)
                    : [...prev.employee_codes, code]
            };
        });
    };

    // Derived State
    const filteredAssignments = assignments.filter(a =>
        a.employee_name?.toLowerCase().includes(searchAssignment.toLowerCase()) ||
        a.program_name?.toLowerCase().includes(searchAssignment.toLowerCase())
    );

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
                            <GraduationCap className="text-pink-500" size={32} /> Training Management
                        </h1>
                        <p className="text-gray-400 mt-1">Assign, track, and manage employee training programs.</p>
                    </div>

                    <div className="flex bg-[#222] p-1 rounded-full border border-[#333]">
                        {[
                            { id: 'assignments', label: 'Overview', icon: BookOpen },
                            { id: 'library', label: 'Library', icon: GraduationCap },
                            { id: 'assign', label: 'Assign Training', icon: Calendar }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <tab.icon size={16} /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                        <CheckCircle size={18} /> {message.text}
                    </div>
                )}

                {/* --- TAB 1: ASSIGNMENTS OVERVIEW --- */}
                {activeTab === 'assignments' && (
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 animate-fade-in-up">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Training Records</h2>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-3 text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="Search employee or course..."
                                    value={searchAssignment}
                                    onChange={e => setSearchAssignment(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#333] rounded-full text-sm focus:border-brand-purple outline-none w-64"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#333] text-gray-500 text-xs uppercase tracking-wider">
                                        <th className="pb-3 pl-4">Employee</th>
                                        <th className="pb-3">Program</th>
                                        <th className="pb-3">Date</th>
                                        <th className="pb-3">Duration</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {filteredAssignments.map(a => (
                                        <tr key={a.id} className="border-b border-[#222] hover:bg-[#1a1a1a]">
                                            <td className="py-4 pl-4 font-bold">{a.employee_name} <span className="text-gray-500 font-normal">({a.employee_code})</span></td>
                                            <td className="py-4 text-pink-400">{a.program_name}</td>
                                            <td className="py-4 text-gray-400">{a.training_date || 'TBD'}</td>
                                            <td className="py-4 text-gray-400">{a.training_duration}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${a.training_status === 'Completed' ? 'bg-green-900/30 text-green-400' :
                                                    a.training_status === 'Pending' ? 'bg-yellow-900/30 text-yellow-500' : 'bg-blue-900/30 text-blue-400'
                                                    }`}>
                                                    {a.training_status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                {a.training_status !== 'Completed' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(a.id, 'Completed')}
                                                        className="text-xs bg-green-900/20 text-green-500 px-3 py-1 rounded hover:bg-green-900/40 border border-green-900/50"
                                                    >
                                                        Mark Done
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAssignments.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-500 italic">No assignments found matching your search.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- TAB 2: PROGRAM LIBRARY --- */}
                {activeTab === 'library' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up">
                        {/* List */}
                        <div className="lg:col-span-8 bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                            <h2 className="text-xl font-bold mb-4">Training Programs</h2>
                            <div className="space-y-4">
                                {programs.map(prog => (
                                    <div key={prog.id} className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] hover:border-pink-500/50 transition-all group">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-white text-lg group-hover:text-pink-400 transition-colors">{prog.program_name}</h3>
                                            <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                                                <Clock size={12} /> {prog.default_duration || 'N/A'}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-sm mt-2">{prog.description || 'No description provided.'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Form */}
                        <div className="lg:col-span-4 bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 h-fit sticky top-32">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-pink-500" /> New Program
                            </h2>
                            <form onSubmit={handleCreateProgram} className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Program Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Fire Safety 101"
                                        value={newProgram.program_name}
                                        onChange={e => setNewProgram({ ...newProgram, program_name: e.target.value })}
                                        required
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Default Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2 Hours"
                                        value={newProgram.default_duration}
                                        onChange={e => setNewProgram({ ...newProgram, default_duration: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Description</label>
                                    <textarea
                                        placeholder="What is this training about?"
                                        value={newProgram.description}
                                        onChange={e => setNewProgram({ ...newProgram, description: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none h-24 resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 rounded-xl bg-pink-600 text-white font-bold hover:bg-opacity-90 transition shadow-lg shadow-pink-600/20 flex items-center justify-center gap-2"
                                >
                                    <Save size={18} /> {loading ? 'Saving...' : 'Create Program'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- TAB 3: ASSIGN TRAINING --- */}
                {activeTab === 'assign' && (
                    <div className="max-w-4xl mx-auto bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8 animate-fade-in-up">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <Calendar size={24} className="text-pink-500" /> Assign Training
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Program Details */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Select Program</label>
                                    <select
                                        value={newAssignment.program_id}
                                        onChange={e => {
                                            const id = e.target.value;
                                            const prog = programs.find(p => p.id.toString() === id);
                                            setNewAssignment({
                                                ...newAssignment,
                                                program_id: id,
                                                duration: prog?.default_duration || ''
                                            });
                                        }}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none"
                                    >
                                        <option value="">-- Choose Course --</option>
                                        {programs.map(p => (
                                            <option key={p.id} value={p.id}>{p.program_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Training Date</label>
                                    <input
                                        type="date"
                                        value={newAssignment.date}
                                        onChange={e => setNewAssignment({ ...newAssignment, date: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase">Duration</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2 Days"
                                        value={newAssignment.duration}
                                        onChange={e => setNewAssignment({ ...newAssignment, duration: e.target.value })}
                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-3 mt-1 text-white focus:border-pink-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Right: Select People */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase mb-2 block">Select Employees ({newAssignment.employee_codes.length})</label>
                                <input
                                    type="text"
                                    placeholder="Search employees..."
                                    value={searchTrainingEmployees}
                                    onChange={e => setSearchTrainingEmployees(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg p-2 mb-2 text-white text-sm focus:border-pink-500 outline-none"
                                />
                                <div className="h-64 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-xl p-2 space-y-1">
                                    {employees
                                        .filter(emp =>
                                            emp.name.toLowerCase().includes(searchTrainingEmployees.toLowerCase()) ||
                                            emp.employee_code.toLowerCase().includes(searchTrainingEmployees.toLowerCase())
                                        )
                                        .map(emp => (
                                            <div
                                                key={emp.employee_code}
                                                onClick={() => toggleEmployeeSelection(emp.employee_code)}
                                                className={`p-2 rounded cursor-pointer text-sm flex justify-between items-center transition-all ${newAssignment.employee_codes.includes(emp.employee_code)
                                                    ? 'bg-pink-900/30 text-pink-300 border border-pink-900/50'
                                                    : 'hover:bg-[#222] text-gray-300'
                                                    }`}
                                            >
                                                <span>{emp.name}</span>
                                                {newAssignment.employee_codes.includes(emp.employee_code) && <CheckCircle size={14} />}
                                            </div>
                                        ))}
                                </div>
                                <div className="flex justify-end mt-4">
                                    <button
                                        onClick={handleAssign}
                                        disabled={loading}
                                        className="px-8 py-3 rounded-xl bg-pink-600 text-white font-bold shadow-lg shadow-pink-600/20 hover:bg-opacity-90 transition-all flex items-center gap-2"
                                    >
                                        <Save size={18} /> {loading ? 'Assigning...' : 'Assign Training'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

