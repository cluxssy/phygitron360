'use client';

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Briefcase, MapPin, Award, BookOpen, User, Monitor, FileText, TrendingUp, ClipboardCheck, Trash2, Target, Edit2, Save, ArrowRight, Settings, AlertCircle, Clock, Calendar, Camera, Key, Copy, CheckCircle, X } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface SkillMatrix {
    primary_skillset?: string;
    secondary_skillset?: string;
    experience_years?: string;
    last_contact_date?: string;
}

interface Asset {
    asset_id: string;
    issued_to?: string;
    issue_date?: string;
    return_date?: string;
    laptop_returned?: string;
    advance_salary_adjustment?: string;
    leave_adjustment?: string;
}

interface Performance {
    monthly_check_in_notes?: string;
    manager_feedback?: string;
    improvement_areas?: string;
    recognition_rewards?: string;
}

interface HRActivity {
    training_assigned?: string;
    training_date?: string;
    training_duration?: string;
    training_status?: string;
    status?: string;
    last_follow_up?: string;
}

interface Employee {
    employee_code: string;
    name: string;
    designation: string;
    team: string;
    email_id: string;
    role?: string;
    photo_path: string | null;
    phone?: string;
    location?: string;
    join_date?: string;

    // Detailed Fields
    dob?: string;
    contact_number?: string;
    emergency_contact?: string;
    current_address?: string;
    permanent_address?: string;
    doj?: string; // Date of Joining
    employment_type?: string;
    reporting_manager?: string;
    employment_status?: string;
    exit_date?: string;
    cv_path?: string;
    pf_included?: string;
    mediclaim_included?: string;

    // Additional DB Fields
    id_proofs?: string;
    notes?: string;
    exit_reason?: string;
    clearance_status?: string;

    // Master Checklist
    checklist_bag?: string | number;
    checklist_mediclaim?: string | number;
    checklist_pf?: string | number;
    checklist_email_access?: string | number;
    checklist_groups?: string | number;
    checklist_relieving_letter?: string | number;

    // Nested Data
    skill_matrix?: SkillMatrix;
    assets?: Asset[];
    performance?: Performance[];
    hr_activity?: HRActivity[]; // Legacy
    training?: HRActivity[];
    assessments?: Assessment[];
    average_score?: number;
}

interface Assessment {
    id: number;
    year: number;
    quarter: string;
    status: string;
    total_score: number;
    percentage: number;
    updated_at: string;
}

export default function EmployeeProfile() {
    const params = useParams();
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'allocations' | 'performance' | 'training'>('overview');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showOffboardModal, setShowOffboardModal] = useState(false);
    const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

    // Options for Dropdowns
    const [options, setOptions] = useState<{ teams: string[], designations: string[], managers: { name: string, code: string }[] }>({ teams: [], designations: [], managers: [] });

    useEffect(() => {
        // Fetch dropdown options
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/options', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setOptions(data);
                }
            } catch (error) {
                console.error("Failed to fetch options", error);
            }
        };
        fetchOptions();
    }, []);


    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Employee>>({});
    const [selectedFiles, setSelectedFiles] = useState<{ pfp?: File, cv?: File, id?: File }>({});

    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);
    // PERMISSIONS LOGIC
    // 1. Employees: Can ONLY edit their own contact info (Phone, Emergency, Address) - NOT Name, Team, Role, etc.
    // 2. Admins/HR: Can edit EVERYTHING including Name, Team, DOJ, Exit Date, etc.
    const isOwner = user?.employee_code === params.id;
    const isAdminOrHR = user && ['Admin', 'HR'].includes(viewingAsRole || '');

    // "Can Edit" means different things for different users
    const canEdit = isAdminOrHR || isOwner;
    const canDelete = isAdminOrHR;

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
            return;
        }
        if (params.id) fetchEmployeeDetails(params.id as string);
    }, [params.id, navigate, user, authLoading]);

    const fetchEmployeeDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/employee/${id}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployee(data);
                setEditForm(data); // Initialize edit form
            } else {
                console.error('Employee not found');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditChange = (field: keyof Employee, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSkillChange = (field: 'primary_skillset' | 'secondary_skillset', value: string) => {
        setEditForm(prev => ({
            ...prev,
            skill_matrix: {
                ...prev.skill_matrix,
                [field]: value
            }
        }));
    };

    const handleFileChange = (type: 'pfp' | 'cv' | 'id', file: File | undefined) => {
        if (file) {
            setSelectedFiles(prev => ({ ...prev, [type]: file }));
        }
    };

    const saveChanges = async () => {
        if (!employee) return;
        try {
            // 1. Upload Files if any
            if (Object.keys(selectedFiles).length > 0) {
                const formData = new FormData();
                if (selectedFiles.pfp) formData.append('photo_file', selectedFiles.pfp);
                if (selectedFiles.cv) formData.append('cv_file', selectedFiles.cv);
                if (selectedFiles.id) formData.append('id_proof_file', selectedFiles.id);

                const uploadRes = await fetch(`/api/employee/${employee.employee_code}/documents`, {
                    method: 'POST',
                    body: formData, // Browser sets Content-Type to multipart/form-data automatically
                    credentials: 'include'
                });

                if (!uploadRes.ok) throw new Error('Failed to upload documents');
            }

            // 2. Update Text Data
            const payload = { ...editForm };
            delete payload.photo_path;
            delete payload.cv_path;
            delete payload.id_proofs;

            const res = await fetch(`/api/employee/${employee.employee_code}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'include'
            });

            if (res.ok) {
                // Refresh full details to get new file paths
                await fetchEmployeeDetails(employee.employee_code);
                setIsEditing(false);
                setSelectedFiles({});
                alert('Profile updated successfully!');
            } else {
                alert('Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving changes');
        }
    };

    const handleDeleteEmployee = async () => {
        if (!employee) return;
        try {
            const res = await fetch(`/api/employee/${employee.employee_code}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                navigate('/employee-directory');
            } else {
                const error = await res.json();
                alert(`Failed to delete: ${error.detail}`);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-brand-black flex items-center justify-center text-white">
            <div className="animate-pulse">Loading profile...</div>
        </div>
    );
    if (!employee) return (
        <div className="min-h-screen bg-brand-black flex flex-col items-center justify-center text-white gap-4">
            <div className="text-xl">Employee not found</div>
            <button onClick={() => navigate(-1)} className="text-brand-purple hover:underline">
                Go Back
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />

            <StaggeredMenu
                position="right"
                isFixed={true}
                items={menuItems}
                displayItemNumbering={true}
                smartHeader={true}
                logoUrl="/logo.png"
                menuBackgroundColor="#000000ff"
            />

            <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10 animate-fade-in-up">

                {/* 1. Header Card (Glassmorphism) */}
                <div className="relative rounded-[3rem] overflow-hidden bg-[#111]/80 backdrop-blur-xl border border-[#222] shadow-2xl mb-8">
                    {/* Cover Background */}
                    <div className="h-48 bg-gradient-to-r from-brand-purple/20 via-blue-900/20 to-brand-purple/20"></div>

                    <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-20">
                        {/* Profile Pic */}
                        <div className="relative flex-shrink-0">
                            <div className="w-40 h-40 rounded-full p-1 bg-[#111] overflow-hidden shadow-2xl">
                                <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden relative group">
                                    {employee.photo_path ? (
                                        <img src={`/static/${employee.photo_path}?t=${new Date().getTime()}`} alt={employee.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={64} /></div>
                                    )}

                                    {isEditing && (
                                        <>
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white z-10">
                                                <Camera size={24} className="mb-1" />
                                                <span className="text-[10px] uppercase font-bold tracking-wider">
                                                    {selectedFiles.pfp ? 'Selected' : 'Change'}
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                accept="image/*"
                                                onChange={(e) => handleFileChange('pfp', e.target.files?.[0])}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={`absolute bottom-4 right-4 w-6 h-6 rounded-full border-4 border-[#111] ${(!employee.employment_status || employee.employment_status === 'Active') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 mb-2 text-center md:text-left">
                            {isEditing && isAdminOrHR ? (
                                <div className="space-y-2 mb-4">
                                    <input
                                        value={editForm.name || ''}
                                        onChange={(e) => handleEditChange('name', e.target.value)}
                                        className="text-4xl font-bold text-white bg-transparent border-b border-white/20 outline-none w-full"
                                        placeholder="Full Name"
                                    />
                                    <input
                                        value={editForm.designation || ''}
                                        onChange={(e) => handleEditChange('designation', e.target.value)}
                                        className="text-xl text-brand-purple font-medium bg-transparent border-b border-white/20 outline-none w-full"
                                        placeholder="Designation"
                                    />
                                    <div className="flex gap-2">
                                        <div className="w-1/3">
                                            <select
                                                value={editForm.team || ''}
                                                onChange={(e) => handleEditChange('team', e.target.value)}
                                                className="text-sm text-gray-400 bg-transparent border-b border-white/20 outline-none w-full appearance-none"
                                            >
                                                <option value="" className="bg-black">Select Team</option>
                                                {/* We need options here. Let's use a datalist or select if we have options state in this component */}
                                                {options.teams.map(t => <option key={t} value={t} className="bg-black">{t}</option>)}
                                            </select>
                                        </div>

                                        <input
                                            value={editForm.location || ''}
                                            onChange={(e) => handleEditChange('location', e.target.value)}
                                            className="text-sm text-gray-400 bg-transparent border-b border-white/20 outline-none w-1/3"
                                            placeholder="Location"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-4xl font-bold text-white mb-1">{employee.name}</h1>
                                    <p className="text-xl text-brand-purple font-medium">{employee.designation}</p>
                                    <div className="flex flex-wrap gap-4 mt-4 justify-center md:justify-start text-sm text-gray-400">
                                        <span className="flex items-center gap-1"><Briefcase size={14} /> {employee.team}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} /> {employee.location || 'Remote'}</span>
                                        <span className="flex items-center gap-1"><Mail size={14} /> {employee.email_id}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mb-4">
                            {canEdit && !isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-6 py-2 bg-brand-purple hover:bg-brand-purple/80 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-brand-purple/25 flex items-center gap-2"
                                >
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            )}
                            {isEditing && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-full font-medium transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveChanges}
                                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition-all flex items-center gap-2"
                                    >
                                        <Save size={16} /> Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Panel: Personal Details */}
                    <div className="lg:col-span-1 space-y-6">
                        <section className="bg-[#111]/60 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <User size={18} className="text-brand-purple" /> Personal Details
                            </h3>
                            <div className="space-y-4">
                                <InfoField label="Employee ID" value={employee.employee_code} />
                                <InfoField label="Date of Joining" value={employee.doj} />

                                {isEditing ? (
                                    <>
                                        {/* Fields editable by EVERYONE (Owner + Admin) */}
                                        <div className="p-3 bg-[#1a1a1a] rounded-xl border border-[#333] space-y-3">
                                            <p className="text-xs text-gray-500 uppercase font-bold">Contact Info (Editable)</p>
                                            <EditField label="Phone" value={editForm.contact_number} onChange={(v) => handleEditChange('contact_number', v)} />
                                            <EditField label="Emergency Contact" value={editForm.emergency_contact} onChange={(v) => handleEditChange('emergency_contact', v)} />
                                            <EditField label="Current Address" value={editForm.current_address} onChange={(v) => handleEditChange('current_address', v)} />
                                            <EditField label="Permanent Address" value={editForm.permanent_address} onChange={(v) => handleEditChange('permanent_address', v)} />
                                        </div>

                                        {/* Fields editable ONLY by Admin/HR */}
                                        {isAdminOrHR && (
                                            <div className="p-3 bg-red-900/10 rounded-xl border border-red-900/30 space-y-3 mt-4">
                                                <p className="text-xs text-red-400 uppercase font-bold flex items-center gap-2"><Settings size={12} /> Admin Only</p>
                                                <EditField label="Date of Joining" value={editForm.doj} onChange={(v) => handleEditChange('doj', v)} />
                                                <EditField label="Employment Status" value={editForm.employment_status} onChange={(v) => handleEditChange('employment_status', v)} />
                                                <EditField label="Exit Date" value={editForm.exit_date} onChange={(v) => handleEditChange('exit_date', v)} />
                                                <EditField label="Email" value={editForm.email_id} onChange={(v) => handleEditChange('email_id', v)} />

                                                <div className="space-y-1 py-1">
                                                    <label className="text-xs text-brand-purple font-bold uppercase">Reporting Manager</label>
                                                    <select
                                                        value={editForm.reporting_manager || ''}
                                                        onChange={(e) => handleEditChange('reporting_manager', e.target.value)}
                                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none transition-colors"
                                                    >
                                                        <option value="">Select Manager</option>
                                                        {options.managers.map(m => (
                                                            <option key={m.code} value={m.name}>{m.name} ({m.code})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1 py-1">
                                                    <label className="text-xs text-brand-purple font-bold uppercase">System Role</label>
                                                    <select
                                                        value={editForm.role || ''}
                                                        onChange={(e) => handleEditChange('role', e.target.value)}
                                                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none transition-colors"
                                                    >
                                                        <option value="">Select Role</option>
                                                        <option value="Employee">Employee</option>
                                                        <option value="Management">Management</option>
                                                        <option value="HR">HR</option>
                                                        <option value="Admin">Admin</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {/* Read-only for Employee */}
                                        {!isAdminOrHR && (
                                            <InfoField label="Date of Joining" value={employee.doj} />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <InfoField label="Phone" value={employee.contact_number} />
                                        <InfoField label="Emergency" value={employee.emergency_contact} />
                                        <InfoField label="Location" value={employee.location} />
                                        <InfoField label="Reporting Manager" value={employee.reporting_manager} />

                                        <div className="pt-2 border-t border-[#222]">
                                            <p className="text-xs text-gray-500 uppercase mb-2">Address Details</p>
                                            <div className="mb-3">
                                                <span className="text-xs text-brand-purple font-medium">Current Address</span>
                                                <p className="text-sm text-gray-300">{employee.current_address || 'Not Updated'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs text-brand-purple font-medium">Permanent Address</span>
                                                <p className="text-sm text-gray-300">{employee.permanent_address || 'Not Updated'}</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </section>

                        <section className="bg-[#111]/60 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-blue-400" /> Documents
                            </h3>
                            <div className="space-y-4">
                                {/* Resume / CV */}
                                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-brand-purple font-bold uppercase">Resume / CV</p>
                                        {employee.cv_path && (
                                            <a href={`/static/${employee.cv_path}?t=${new Date().getTime()}`} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                <FileText size={12} /> View Current
                                            </a>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-2">
                                            <input
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                onChange={(e) => handleFileChange('cv', e.target.files?.[0])}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-purple file:text-white hover:file:bg-brand-purple/80 cursor-pointer"
                                            />
                                            {selectedFiles.cv && <p className="text-xs text-green-500 mt-1">Selected: {selectedFiles.cv.name}</p>}
                                        </div>
                                    ) : (
                                        !employee.cv_path && <p className="text-sm text-gray-500">No document uploaded.</p>
                                    )}
                                </div>

                                {/* ID Proof */}
                                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-brand-purple font-bold uppercase">ID Proof</p>
                                        {employee.id_proofs && (
                                            <a href={`/static/${employee.id_proofs}?t=${new Date().getTime()}`} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                                <FileText size={12} /> View Current
                                            </a>
                                        )}
                                    </div>

                                    {isEditing ? (
                                        <div className="mt-2">
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleFileChange('id', e.target.files?.[0])}
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-purple file:text-white hover:file:bg-brand-purple/80 cursor-pointer"
                                            />
                                            {selectedFiles.id && <p className="text-xs text-green-500 mt-1">Selected: {selectedFiles.id.name}</p>}
                                        </div>
                                    ) : (
                                        !employee.id_proofs && <p className="text-sm text-gray-500">No document uploaded.</p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Panel: Tabs System (Overview, Performance, Assets) */}
                    <div className="lg:col-span-2">
                        <div className="flex gap-2 mb-6 bg-[#111]/60 p-1.5 rounded-2xl w-fit border border-[#222]">
                            {['overview', 'performance', 'allocations', 'training'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20'
                                        : 'text-gray-400 hover:text-white hover:bg-[#222]'
                                        }`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="animate-fade-in-up">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {/* Skill Matrix */}
                                    <div className="bg-[#111]/60 border border-[#222] rounded-3xl p-8">
                                        <h3 className="text-xl font-bold mb-6">Skills & Expertise</h3>
                                        {employee.skill_matrix ? (
                                            <div className="space-y-6">
                                                <div>
                                                    <span className="text-xs text-brand-purple uppercase font-bold tracking-wider mb-2 block">Primary Skills</span>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editForm.skill_matrix?.primary_skillset || ''}
                                                            onChange={(e) => handleSkillChange('primary_skillset', e.target.value)}
                                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none"
                                                            placeholder="React, Node.js, Python..."
                                                        />
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {employee.skill_matrix.primary_skillset?.split(',').map((s: string, i: number) => (
                                                                <span key={i} className="px-3 py-1 bg-brand-purple/10 border border-brand-purple/30 text-brand-purple rounded-lg text-sm">{s.trim()}</span>
                                                            ))}
                                                            {!employee.skill_matrix.primary_skillset && <span className="text-gray-500 text-sm">No primary skills added.</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Secondary Skills</span>
                                                    {isEditing ? (
                                                        <input
                                                            type="text"
                                                            value={editForm.skill_matrix?.secondary_skillset || ''}
                                                            onChange={(e) => handleSkillChange('secondary_skillset', e.target.value)}
                                                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none"
                                                            placeholder="AWS, Docker, Figma..."
                                                        />
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {employee.skill_matrix.secondary_skillset?.split(',').map((s: string, i: number) => (
                                                                <span key={i} className="px-3 py-1 bg-[#222] border border-[#333] text-gray-300 rounded-lg text-sm">{s.trim()}</span>
                                                            ))}
                                                            {!employee.skill_matrix.secondary_skillset && <span className="text-gray-500 text-sm">No secondary skills added.</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500">No skills recorded.</p>
                                        )}
                                    </div>

                                    {/* About / Notes */}
                                    <div className="bg-[#111]/60 border border-[#222] rounded-3xl p-8">
                                        <h3 className="text-xl font-bold mb-4">Additional Notes</h3>
                                        {isEditing ? (
                                            <textarea
                                                value={editForm.notes || ''}
                                                onChange={(e) => handleEditChange('notes', e.target.value)}
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none h-32 resize-none"
                                                placeholder="Add notes about the employee..."
                                            />
                                        ) : (
                                            <p className="text-gray-400 leading-relaxed">
                                                {employee.notes || "No additional notes available for this employee."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'performance' && (
                                <div className="space-y-6">
                                    {/* Stats Row */}
                                    {employee.average_score ? (
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-[#1a1a1a] p-4 rounded-2xl border border-[#333]">
                                                <p className="text-xs text-gray-500 uppercase font-bold">Average Score</p>
                                                <p className="text-2xl font-bold text-white mt-1">{employee.average_score} <span className="text-sm text-gray-500 font-normal">/ 100</span></p>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="bg-[#111]/60 border border-[#222] rounded-3xl p-8">
                                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                            <Target className="text-brand-purple" /> Assessment History
                                        </h3>

                                        {(employee.assessments && employee.assessments.length > 0) ? (
                                            <div className="grid gap-4">
                                                {employee.assessments.map((assessment: any, i: number) => (
                                                    <div key={i} className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] hover:border-brand-purple/40 transition-colors flex justify-between items-center group cursor-pointer" onClick={() => navigate(`/performance`)}>
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <h4 className="font-bold text-lg text-white">{assessment.quarter} {assessment.year}</h4>
                                                                <span className={`px-2 py-0.5 text-xs rounded font-bold uppercase ${assessment.status === 'Finalized' ? 'bg-green-500/10 text-green-400' :
                                                                    assessment.status === 'Submitted' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-400'
                                                                    }`}>
                                                                    {assessment.status}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-500">Last updated: {new Date(assessment.updated_at).toLocaleDateString()}</p>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-3xl font-bold text-white mb-1 group-hover:text-brand-purple transition-colors">
                                                                {assessment.percentage}%
                                                            </div>
                                                            <p className="text-xs text-gray-500 uppercase font-bold">Total Score</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <Target size={40} className="mx-auto mb-4 opacity-20" />
                                                <p>No assessment records found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'allocations' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111]/60 border border-[#222] rounded-3xl p-8">
                                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                            <Monitor className="text-brand-purple" /> Allocations
                                        </h3>
                                        {(() => {
                                            const assetData = (employee.assets?.[0] || {}) as any;
                                            const allocationItems = [
                                                { key: 'ob_laptop', label: 'Laptop', icon: Monitor },
                                                { key: 'ob_laptop_bag', label: 'Laptop Bag', icon: Briefcase },
                                                { key: 'ob_mouse', label: 'Mouse', icon: Monitor },
                                                { key: 'ob_headphones', label: 'Headphones', icon: Monitor },
                                                { key: 'ob_id_card', label: 'ID Card', icon: User },
                                                { key: 'ob_email_access', label: 'Email Access', icon: Mail },
                                                { key: 'ob_groups', label: 'Team Groups', icon: User },
                                                { key: 'ob_mediclaim', label: 'Mediclaim', icon: TrendingUp },
                                                { key: 'ob_pf', label: 'Provident Fund', icon: TrendingUp },
                                            ];

                                            // Check for 1 (int) or '1' (string) or true
                                            const activeAllocations = allocationItems.filter(item => {
                                                let val = assetData[item.key];

                                                // Fallback: Check root employee record for PF/Mediclaim if missing in assets
                                                if (item.key === 'ob_pf' && !val) {
                                                    const pf = employee.pf_included ? String(employee.pf_included).toLowerCase() : '';
                                                    if (['yes', 'true', '1'].includes(pf)) val = 1;
                                                }
                                                if (item.key === 'ob_mediclaim' && !val) {
                                                    const med = employee.mediclaim_included ? String(employee.mediclaim_included).toLowerCase() : '';
                                                    if (['yes', 'true', '1'].includes(med)) val = 1;
                                                }

                                                return val === 1 || val === '1' || val === true;
                                            });

                                            const clearanceItems = [
                                                { key: 'cl_laptop', label: 'Laptop', icon: Monitor },
                                                { key: 'cl_laptop_bag', label: 'Laptop Bag', icon: Briefcase },
                                                { key: 'cl_mouse', label: 'Mouse', icon: Monitor },
                                                { key: 'cl_headphones', label: 'Headphones', icon: Monitor },
                                                { key: 'cl_id_card', label: 'ID Card', icon: User },
                                                { key: 'cl_email_access', label: 'Email Access', icon: Mail },
                                                { key: 'cl_groups', label: 'Team Groups', icon: User },
                                                { key: 'cl_resignation_letter', label: 'Resignation Letter', icon: FileText },
                                                { key: 'cl_relieving_letter', label: 'Relieving Letter', icon: FileText },
                                                { key: 'cl_fnf', label: 'Full & Final (FnF)', icon: TrendingUp },
                                            ];

                                            const activeClearance = clearanceItems.filter(item => {
                                                let val = assetData[item.key];
                                                return val === 1 || val === '1' || val === true;
                                            });

                                            return (
                                                <div className="space-y-8">
                                                    {/* Allocations Section */}
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Onboarding Checklist (Allocated)</h4>
                                                        {activeAllocations.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {activeAllocations.map((item) => (
                                                                    <div key={item.key} className="flex items-center gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-[#333] hover:border-brand-purple/40 transition-colors animate-fade-in-up">
                                                                        <div className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center text-brand-purple">
                                                                            <item.icon size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-white line-clamp-1">{item.label}</p>
                                                                            <p className="text-xs text-green-500 font-medium">Allocated</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 text-sm">No items allocated.</p>
                                                        )}
                                                    </div>

                                                    {/* Clearance Section */}
                                                    {activeClearance.length > 0 && (
                                                        <div>
                                                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Clearance Checklist (Returned/Completed)</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {activeClearance.map((item) => (
                                                                    <div key={item.key} className="flex items-center gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-red-900/30 hover:border-red-500/50 transition-colors animate-fade-in-up">
                                                                        <div className="w-10 h-10 rounded-lg bg-red-900/20 flex items-center justify-center text-red-500">
                                                                            <item.icon size={20} />
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-bold text-white line-clamp-1">{item.label}</p>
                                                                            <p className="text-xs text-red-500 font-medium">Clearance Done</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}



                            {activeTab === 'training' && (
                                <div className="space-y-6">
                                    <div className="bg-[#111]/60 border border-[#222] rounded-3xl p-8">
                                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                            <BookOpen className="text-brand-purple" /> Training History
                                        </h3>
                                        {employee.training && employee.training.length > 0 ? (
                                            <div className="grid gap-4">
                                                {employee.training.map((t: any, i: number) => (
                                                    <div key={i} className="bg-[#1a1a1a] p-6 rounded-2xl border border-[#333] flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-bold text-lg text-white mb-1">{t.training_assigned}</h4>
                                                            <div className="flex gap-4 text-sm text-gray-500">
                                                                <span className="flex items-center gap-1"><Clock size={14} /> {t.training_duration}</span>
                                                                <span className="flex items-center gap-1"><Calendar size={14} /> {t.training_date}</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase ${t.training_status === 'Completed' ? 'bg-green-500/10 text-green-400' :
                                                                t.training_status === 'In Progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-500'
                                                                }`}>
                                                                {t.training_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <BookOpen size={40} className="mx-auto mb-4 opacity-20" />
                                                <p>No training records found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Admin Zone - Offboarding & Deletion */}
                {
                    canDelete && (
                        <div className="mt-20 pt-10 border-t border-[#222]">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Admin Actions</p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowPasswordResetModal(true)}
                                        className="bg-orange-600/20 hover:bg-orange-600/40 text-orange-500 border border-orange-800 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <Key size={16} /> Reset Password
                                    </button>

                                    <button
                                        onClick={() => setShowOffboardModal(true)}
                                        className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-800 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                                    >
                                        <AlertCircle size={16} /> Offboard Employee
                                    </button>

                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-red-500 hover:bg-red-500/10 px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                                    >
                                        <Trash2 size={16} /> Delete Permanent
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Offboard Confirmation Modal */}
                {
                    showOffboardModal && (
                        <OffboardModal
                            employee={employee}
                            onClose={() => setShowOffboardModal(false)}
                            onSuccess={() => {
                                setShowOffboardModal(false);
                                fetchEmployeeDetails(employee.employee_code); // Refresh data
                            }}
                        />
                    )
                }

                {/* Password Reset Modal */}
                {
                    showPasswordResetModal && employee && (
                        <PasswordResetModal
                            employee={employee}
                            onClose={() => setShowPasswordResetModal(false)}
                        />
                    )
                }

                {/* Delete Confirmation Modal */}
                {
                    showDeleteConfirm && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-[#111] border border-red-900/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
                                <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
                                <p className="text-gray-300 mb-6">This will permanently remove {employee.name}. This action cannot be undone.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-3 bg-[#222] hover:bg-[#333] text-white rounded-lg transition-colors font-medium">Cancel</button>
                                    <button onClick={handleDeleteEmployee} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-bold">Delete</button>
                                </div>
                            </div>
                        </div>
                    )
                }

            </main >
        </div >
    );
}

// Helpers
function InfoField({ label, value }: { label: string, value?: string | null }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-[#222] last:border-0">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm text-gray-200 font-medium truncate max-w-[60%]">{value || '-'}</span>
        </div>
    );
}

function EditField({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1 py-1">
            <label className="text-xs text-brand-purple font-bold uppercase">{label}</label>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-brand-purple outline-none transition-colors"
            />
        </div>
    );
}

function OffboardModal({ employee, onClose, onSuccess }: any) {
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        exit_date: new Date().toISOString().split('T')[0],
        exit_reason: 'Resignation',
        exit_type: 'Notice Period',
        remarks: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/employee/${employee.employee_code}/offboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form)
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert("Failed to offboard employee");
            }
        } catch (e) {
            console.error(e);
            alert("Error offboarding employee");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-yellow-800/50 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up">
                <div className="p-6 border-b border-yellow-900/30">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <AlertCircle className="text-yellow-500" /> Offboard Employee
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Initiate exit process for <span className="text-white font-medium">{employee.name}</span>.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Exit Type Selection */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-[#1a1a1a] rounded-lg border border-[#333]">
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, exit_type: 'Notice Period' })}
                            className={`py-2 text-sm font-bold rounded-md transition-all ${form.exit_type === 'Notice Period' ? 'bg-yellow-600/20 text-yellow-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Notice Period
                        </button>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, exit_type: 'Immediate' })}
                            className={`py-2 text-sm font-bold rounded-md transition-all ${form.exit_type === 'Immediate' ? 'bg-red-500/20 text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Immediate Exit
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">{form.exit_type === 'Notice Period' ? 'Last Working Day' : 'Exit Date'}</label>
                            <input
                                type="date"
                                value={form.exit_date}
                                onChange={e => setForm({ ...form, exit_date: e.target.value })}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-yellow-600 outline-none"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 uppercase font-bold">Reason</label>
                            <select
                                value={form.exit_reason}
                                onChange={e => setForm({ ...form, exit_reason: e.target.value })}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-yellow-600 outline-none"
                            >
                                <option>Resignation</option>
                                <option>Termination</option>
                                <option>Absconding</option>
                                <option>Contract End</option>
                                <option>By Management</option>
                                <option>Retirement</option>
                                <option>Death</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase font-bold">Remarks / Notes</label>
                        <textarea
                            value={form.remarks}
                            onChange={e => setForm({ ...form, remarks: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white focus:border-yellow-600 outline-none resize-none h-24"
                            placeholder="Add generic remarks, handover notes status, etc..."
                        />
                    </div>

                    {form.exit_type === 'Notice Period' ? (
                        <div className="p-3 bg-blue-900/10 border border-blue-900/30 rounded-lg text-xs text-blue-300 flex items-start gap-2">
                            <Clock size={14} className="mt-0.5 flex-shrink-0" />
                            <p>Employee status will be set to <b>Notice Period</b>. User access will remain active until the final exit date.</p>
                        </div>
                    ) : (
                        <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg text-xs text-red-400 flex items-start gap-2">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                            <p>Employee status will be set to <b>Exited</b>. User access will be <b>revoked immediately</b>.</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-[#222] hover:bg-[#333] text-white rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`flex-1 px-4 py-3 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${form.exit_type === 'Immediate' ? 'bg-red-600 hover:bg-red-700 shadow-red-900/20' : 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-900/20'}`}
                        >
                            {submitting ? 'Processing...' : form.exit_type === 'Immediate' ? 'Confirm Immediate Exit' : 'Initiate Offboarding'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Password Reset Modal Component
function PasswordResetModal({ employee, onClose }: { employee: Employee, onClose: () => void }) {
    const [resetType, setResetType] = useState<'temp_password' | 'reset_link' | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleResetPassword = async (type: 'temp_password' | 'reset_link') => {
        setLoading(true);
        setError('');
        setResetType(type);

        try {
            const res = await fetch('/api/auth/admin-reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    employee_code: employee.employee_code,
                    reset_type: type,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                if (type === 'temp_password') {
                    setTempPassword(data.temp_password);
                    setEmailSent(data.email_sent || false);
                } else {
                    setEmailSent(data.email_sent || false);
                }
            } else {
                setError(data.detail || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-xl bg-card-bg border border-border-color p-6 shadow-2xl mx-4">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {!success ? (
                    <>
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-full bg-orange-600/20">
                                    <Key size={24} className="text-orange-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                                    <p className="text-sm text-gray-400">{employee.name}</p>
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 mt-2">
                                Choose how to reset the employee's password:
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800">
                                {error}
                            </div>
                        )}

                        {/* Options */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handleResetPassword('temp_password')}
                                disabled={loading}
                                className="w-full p-4 rounded-lg border-2 border-border-color bg-input-bg hover:border-orange-500 hover:bg-orange-500/10 transition-all text-left disabled:opacity-50"
                            >
                                <div className="flex items-start gap-3">
                                    <Key size={20} className="text-orange-500 flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-bold text-white mb-1">Generate Temporary Password</h3>
                                        <p className="text-sm text-gray-400">
                                            Create a temporary password and share it manually. Employee must change it on first login.
                                        </p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleResetPassword('reset_link')}
                                disabled={loading}
                                className="w-full p-4 rounded-lg border-2 border-border-color bg-input-bg hover:border-brand-purple hover:bg-brand-purple/10 transition-all text-left disabled:opacity-50"
                            >
                                <div className="flex items-start gap-3">
                                    <Mail size={20} className="text-brand-purple flex-shrink-0 mt-1" />
                                    <div>
                                        <h3 className="font-bold text-white mb-1">Send Reset Link via Email</h3>
                                        <p className="text-sm text-gray-400">
                                            Send a secure reset link to {employee.email_id}. Employee sets their own password.
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {loading && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-purple"></div>
                                <span>Processing...</span>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        {/* Success State */}
                        <div className="text-center py-4">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 rounded-full bg-green-900/20">
                                    <CheckCircle size={48} className="text-green-500" />
                                </div>
                            </div>

                            {resetType === 'temp_password' ? (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-2">Temporary Password Generated</h3>

                                    {/* Password Display */}
                                    <div className="bg-input-bg border-2 border-dashed border-orange-500 rounded-lg p-4 my-4">
                                        <p className="text-xs text-gray-400 mb-2">Temporary Password:</p>
                                        <div className="flex items-center justify-center gap-2">
                                            <code className="text-2xl font-mono font-bold text-orange-500 tracking-wider">
                                                {tempPassword}
                                            </code>
                                            <button
                                                onClick={copyToClipboard}
                                                className="p-2 hover:bg-white/10 rounded transition-colors"
                                                title="Copy to clipboard"
                                            >
                                                {copied ? (
                                                    <CheckCircle size={20} className="text-green-500" />
                                                ) : (
                                                    <Copy size={20} className="text-gray-400" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4 text-left">
                                        <p className="text-sm text-yellow-200 font-medium mb-2">⚠️ Important:</p>
                                        <ul className="text-xs text-yellow-200/80 space-y-1 list-disc list-inside">
                                            <li>Share this password securely with the employee</li>
                                            <li>Employee must change it on first login</li>
                                            <li>Password expires in 24 hours</li>
                                        </ul>
                                    </div>

                                    {emailSent && (
                                        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 mb-4 text-sm text-green-200">
                                            ✅ Password also sent via email to {employee.email_id}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-white mb-2">Reset Link Sent!</h3>
                                    <p className="text-gray-400 mb-4">
                                        {emailSent ? (
                                            <>A password reset link has been sent to <strong className="text-white">{employee.email_id}</strong></>
                                        ) : (
                                            <>Failed to send email. Please share the reset link manually.</>
                                        )}
                                    </p>
                                </>
                            )}

                            <button
                                onClick={onClose}
                                className="w-full rounded-lg bg-brand-purple py-2 font-medium text-white hover:bg-purple-600 transition-colors mt-4"
                            >
                                Done
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
