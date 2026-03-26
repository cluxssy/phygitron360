'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, FileText, Upload, Save, MapPin, Send, List, UserPlus, Copy, Clock, CheckCircle, XCircle, Trash2, Mail } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

// Types
interface Invite {
    id: number;
    token: string;
    email: string;
    name: string;
    role: string;
    department: string;
    status: string;
    created_at: string;
}

export default function AddEmployee() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const isAuthorized = user && viewingAsRole !== 'Employee' && (user.permissions?.includes('can_add_employee') || fallbackAuth(user.role));

    function fallbackAuth(role: string) {
        return ['Admin', 'HR'].includes(role);
    }

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            if (!user) navigate('/');
            else navigate('/dashboard');
        }
    }, [authLoading, isAuthorized, user, viewingAsRole, navigate]);

    const [activeTab, setActiveTab] = useState<'invite' | 'status' | 'approvals' | 'manual'>('invite');
    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);

    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves
                lineColor="#230a46ff"
                backgroundColor="rgba(0, 0, 0, 0.2)"
                waveSpeedX={0.02}
                waveSpeedY={0.01}
                waveAmpX={40}
                waveAmpY={20}
                className="fixed top-0 left-0 w-full h-screen z-0 pointer-events-none"
            />

            <StaggeredMenu
                position="right"
                isFixed={true}
                items={menuItems}
                logoUrl="/logo.png"
                accentColor="var(--color-brand-purple)"
                menuBackgroundColor="#000000ff"
                itemTextColor="#ffffff"
            />

            <main className="mx-auto max-w-5xl p-6 pt-32 relative z-10 animate-fade-in-up">

                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} /> Back
                    </button>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                        Add New Employee
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-[#333] pb-1">
                    <TabButton
                        active={activeTab === 'invite'}
                        onClick={() => setActiveTab('invite')}
                        icon={<Send size={18} />}
                        label="Send Invitation"
                    />
                    <TabButton
                        active={activeTab === 'status'}
                        onClick={() => setActiveTab('status')}
                        icon={<List size={18} />}
                        label="Invitation Status"
                    />
                    <TabButton
                        active={activeTab === 'approvals'}
                        onClick={() => setActiveTab('approvals')}
                        icon={
                            <div className="relative">
                                <CheckCircle size={18} />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                            </div>
                        }
                        label="Pending Approvals"
                    />
                    <TabButton
                        active={activeTab === 'manual'}
                        onClick={() => setActiveTab('manual')}
                        icon={<UserPlus size={18} />}
                        label="Manual Entry (Legacy)"
                    />
                </div>

                {/* Content */}
                <div className="min-h-[500px]">
                    {activeTab === 'invite' && <InviteForm />}
                    {activeTab === 'status' && <InviteStatusList />}
                    {activeTab === 'approvals' && <PendingApprovalsList />}
                    {activeTab === 'manual' && <ManualEntryForm navigate={navigate} />}
                </div>

            </main>
        </div>
    );
}

// --- Tab Button ---
function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all ${active
                ? 'bg-[#1a1a1a] border border-[#333] border-b-brand-black text-brand-purple translate-y-[1px]'
                : 'text-gray-500 hover:text-white hover:bg-[#111]'
                }`}
        >
            {icon} {label}
        </button>
    );
}

// --- 1. Invite Form ---
function InviteForm() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '', link: '', emailSent: false });
    const [form, setForm] = useState({ name: '', email: '', role: 'Employee', department: '', designation: '' });
    const [options, setOptions] = useState<{ teams: string[], designations: string[] }>({ teams: [], designations: [] });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/options', { credentials: 'include' });
                if (res.ok) setOptions(await res.json());
            } catch (e) { console.error("Failed to load options"); }
        };
        fetchOptions();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '', link: '', emailSent: false });

        try {
            const res = await fetch('/api/onboarding/invite', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();

            if (res.ok) {
                const fullLink = `${window.location.origin}${data.link}`;
                const emailSent = data.email_sent || false;

                setMessage({
                    type: 'success',
                    text: data.message,
                    link: emailSent ? '' : fullLink,  // Only show link if email wasn't sent
                    emailSent: emailSent
                });
                setForm({ name: '', email: '', role: 'Employee', department: '', designation: '' });
            } else {
                setMessage({ type: 'error', text: data.detail || 'Failed to send invite', link: '', emailSent: false });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error', link: '', emailSent: false });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6 border-b border-[#222] pb-4">
                <div className="p-3 rounded-full bg-brand-purple/20 text-brand-purple">
                    <Send size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Send Onboarding Invitation</h2>
                    <p className="text-sm text-gray-500">Employee will receive a link to set up their account.</p>
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl mb-6 border ${message.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-red-900/20 border-red-800 text-red-300'}`}>
                    <div className="flex items-center gap-2 font-bold mb-1">
                        {message.type === 'success' && message.emailSent && <Mail size={18} className="text-green-400" />}
                        {message.text}
                    </div>
                    {message.emailSent && (
                        <div className="text-sm mt-2 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Email sent successfully to {form.email || 'the employee'}
                        </div>
                    )}
                    {message.link && (
                        <div className="mt-3">
                            <p className="text-xs mb-2 opacity-80">📋 Share this link manually:</p>
                            <div className="flex items-center gap-2 bg-black/50 p-3 rounded-lg text-sm font-mono text-gray-300 break-all">
                                {message.link}
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(message.link);
                                        // Optional: Show a quick "Copied!" feedback
                                    }}
                                    className="p-2 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                                    title="Copy to clipboard"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <InputField label="Full Name" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} required />
                <InputField label="Email Address" type="email" value={form.email} onChange={(e: any) => setForm({ ...form, email: e.target.value })} required />

                <div className="grid grid-cols-2 gap-4">
                    <ListSelectField
                        label="Department / Team"
                        value={form.department}
                        onChange={(e: any) => setForm({ ...form, department: e.target.value })}
                        options={options.teams}
                    />
                    <ListSelectField
                        label="Designation"
                        value={form.designation}
                        onChange={(e: any) => setForm({ ...form, designation: e.target.value })}
                        options={options.designations}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">System Role</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Employee', 'HR', 'Admin', 'Management'].map(role => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => setForm({ ...form, role })}
                                className={`py-2 px-4 rounded-lg border text-sm transition-all ${form.role === role
                                    ? 'bg-brand-purple text-white border-brand-purple'
                                    : 'border-[#333] text-gray-400 hover:border-gray-500'
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 text-white font-bold shadow-lg shadow-brand-purple/20 hover:shadow-brand-purple/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                >
                    {loading ? 'Processing...' : <><Send size={18} /> Send Invitation</>}
                </button>
            </form>
        </div>
    );
}

// --- 2. Invite Status List ---
function InviteStatusList() {
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvites = async () => {
        try {
            const res = await fetch('/api/onboarding/invites', { credentials: 'include' });
            if (res.ok) setInvites(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchInvites(); }, []);

    const handleRevoke = async (id: number) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`/api/onboarding/invite/${id}`, { method: 'DELETE', credentials: 'include' });
        fetchInvites();
    };

    if (loading) return <div className="text-gray-500 text-center py-10">Loading invites...</div>;

    return (
        <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl overflow-hidden p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-[#222] pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="text-blue-500" /> Pending Invitations</h2>
            </div>

            {invites.length === 0 ? (
                <div className="text-center py-10 text-gray-500">No pending invitations found.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-xs text-gray-500 uppercase border-b border-[#333]">
                                <th className="p-4">Name / Email</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Sent At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invites.map(invite => (
                                <tr key={invite.id} className="border-b border-[#222]/50 hover:bg-[#1a1a1a]">
                                    <td className="p-4">
                                        <div className="font-bold text-white">{invite.name}</div>
                                        <div className="text-sm text-gray-500">{invite.email}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-300">{invite.role}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs border ${invite.status === 'Completed' ? 'bg-green-900/20 text-green-400 border-green-900' :
                                            invite.status === 'Revoked' ? 'bg-red-900/20 text-red-400 border-red-900' :
                                                'bg-yellow-900/20 text-yellow-400 border-yellow-900'
                                            }`}>
                                            {invite.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 border-gray-700">
                                        {new Date(invite.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        {invite.status === 'Pending' && (
                                            <button
                                                onClick={() => handleRevoke(invite.id)}
                                                className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/20 rounded"
                                                title="Revoke"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --- 3. Pending Approvals List ---
function PendingApprovalsList() {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmp, setSelectedEmp] = useState<any>(null);

    const fetchApprovals = async () => {
        try {
            const res = await fetch('/api/onboarding/approvals', { credentials: 'include' });
            if (res.ok) setApprovals(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchApprovals(); }, []);

    const handleApprovalSuccess = (code: string) => {
        setApprovals(prev => prev.filter(a => a.employee_code !== code));
        setSelectedEmp(null);
    };

    if (loading) return <div className="text-gray-500 text-center py-10">Loading pending approvals...</div>;

    return (
        <>
            <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl overflow-hidden p-6 relative">
                <div className="flex items-center gap-3 mb-6 border-b border-[#222] pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CheckCircle className="text-green-500" /> Pending Approvals
                    </h2>
                </div>

                {approvals.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No employees waiting for approval.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase border-b border-[#333]">
                                    <th className="p-4">Employee</th>
                                    <th className="p-4">Role / Team</th>
                                    <th className="p-4">Submission Date</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {approvals.map(emp => (
                                    <tr key={emp.employee_code} className="border-b border-[#222]/50 hover:bg-[#1a1a1a] group relative">
                                        <td className="p-4 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-white">{emp.name}</div>
                                                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                            </div>
                                            <div className="text-xs text-brand-purple font-mono">{emp.employee_code}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-gray-300">{emp.designation}</div>
                                            <div className="text-xs text-gray-500">{emp.team}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {emp.doj}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setSelectedEmp(emp)}
                                                className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-800 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ml-auto"
                                            >
                                                Review & Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                )}
            </div >

            {/* Approval Modal - Moved outside to prevent overflow clipping caused by backdrop-blur parent */}
            {
                selectedEmp && (
                    <ApprovalModal
                        employee={selectedEmp}
                        onClose={() => setSelectedEmp(null)}
                        onSuccess={() => handleApprovalSuccess(selectedEmp.employee_code)}
                    />
                )
            }
        </>
    );
}

function ApprovalModal({ employee, onClose, onSuccess }: any) {
    const [form, setForm] = useState({
        reporting_manager: '',
        employment_type: 'Full Time',
        pf_included: 'No',
        mediclaim_included: 'No',
        notes: ''
    });
    const [managers, setManagers] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchManagers = async () => {
            try {
                const res = await fetch('/api/employees', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    // Filter for Management/Admin roles
                    const validManagers = data.filter((emp: any) => ['Management', 'Admin', 'HR'].includes(emp.role));
                    setManagers(validManagers);
                }
            } catch (error) {
                console.error("Failed to fetch managers", error);
            }
        };
        fetchManagers();
    }, []);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('reporting_manager', form.reporting_manager);
            formData.append('employment_type', form.employment_type);
            formData.append('pf_included', form.pf_included);
            formData.append('mediclaim_included', form.mediclaim_included);
            formData.append('notes', form.notes);

            const res = await fetch(`/api/onboarding/approve/${employee.employee_code}`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (res.ok) {
                onSuccess();
            } else {
                alert("Failed to approve employee");
            }
        } catch (e) {
            console.error(e);
            alert("Error submitting approval");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#333] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
                <div className="flex justify-between items-center p-6 border-b border-[#222]">
                    <div>
                        <h3 className="text-2xl font-bold text-white">Approve {employee.name}</h3>
                        <p className="text-sm text-gray-500">Review details and add employment information to activate.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 hover:bg-[#222] rounded-full transition-colors"><XCircle size={28} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Read Only Info */}
                    <div className="grid grid-cols-2 gap-4 bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                        <div><span className="text-xs text-gray-500 block">Department</span><span className="text-white">{employee.team}</span></div>
                        <div><span className="text-xs text-gray-500 block">Designation</span><span className="text-white">{employee.designation}</span></div>
                        <div><span className="text-xs text-gray-500 block">Email</span><span className="text-white">{employee.email_id}</span></div>
                        <div><span className="text-xs text-gray-500 block">DOJ</span><span className="text-white">{employee.doj}</span></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2 relative">
                            <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">Reporting Manager <User size={12} /></label>
                            <select
                                value={form.reporting_manager}
                                onChange={(e) => setForm({ ...form, reporting_manager: e.target.value })}
                                className="appearance-none w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 pr-10 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all cursor-pointer hover:border-gray-500"
                                required
                            >
                                <option value="" className="text-gray-500">Select Reporting Manager</option>
                                {managers.map(m => (
                                    <option key={m.employee_code} value={m.name} className="py-2">
                                        {m.name}  —  [{m.role}]
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-[34px] pointer-events-none text-gray-500">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <SelectField label="Employment Type" name="employment_type" value={form.employment_type} onChange={(e: any) => setForm({ ...form, employment_type: e.target.value })} options={['Full Time', 'Part Time', 'Contractual', 'Internship']} />

                        <SelectField label="PF Included?" name="pf" value={form.pf_included} onChange={(e: any) => setForm({ ...form, pf_included: e.target.value })} options={['Yes', 'No']} />
                        <SelectField label="Mediclaim Included?" name="mediclaim" value={form.mediclaim_included} onChange={(e: any) => setForm({ ...form, mediclaim_included: e.target.value })} options={['Yes', 'No']} />
                    </div>

                    <TextAreaField label="HR Notes / Comments" name="notes" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e.target.value })} />

                    <div className="pt-4 flex gap-4 justify-end border-t border-[#222]">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg hover:bg-[#222] text-gray-400">Cancel</button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-brand-purple hover:bg-brand-purple/80 text-white font-bold px-8 py-3 rounded-lg shadow-lg shadow-brand-purple/20 flex items-center gap-2"
                        >
                            {submitting ? 'Activating...' : <><CheckCircle size={18} /> Approve & Activate</>}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

// --- 3. Manual Entry Form (Legacy) ---
function ManualEntryForm({ navigate }: any) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [createdCredentials, setCreatedCredentials] = useState<{ username: string; temporary_password: string } | null>(null);
    const [emailSent, setEmailSent] = useState(false);
    const [options, setOptions] = useState<{ teams: string[], designations: string[], managers: { name: string, code: string, role: string }[] }>({ teams: [], designations: [], managers: [] });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await fetch('/api/options', { credentials: 'include' });
                if (res.ok) setOptions(await res.json());
            } catch (e) { console.error("Failed to load options"); }
        };
        fetchOptions();
    }, []);

    const [formData, setFormData] = useState({
        code: '', name: '', dob: '', phone: '', emergency: '', email: '',
        current_address: '', permanent_address: '', location: '',
        doj: '', team: '', role: '', type: 'Full Time', manager: '',
        pf: 'No', mediclaim: 'No', notes: '',
        primary_skillset: '', secondary_skillset: '', experience_years: ''
    });

    const [files, setFiles] = useState<{
        photo: File | null;
        cv: File | null;
        id_proof: File | null;
    }>({
        photo: null, cv: null, id_proof: null
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'cv' | 'id_proof') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });
        setCreatedCredentials(null);
        setEmailSent(false);

        if (!formData.code.startsWith('EMP')) {
            setMessage({ type: 'error', text: 'Employee Code must start with "EMP".' });
            setLoading(false);
            return;
        }

        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'experience_years') {
                    if (value) data.append(key, value.toString());
                } else {
                    data.append(key, value);
                }
            });

            if (files.photo) data.append('photo_file', files.photo);
            if (files.cv) data.append('cv_file', files.cv);
            if (files.id_proof) data.append('id_proof_file', files.id_proof);

            const res = await fetch('/api/employee', {
                method: 'POST',
                credentials: 'include',
                body: data
            });

            const result = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: result.message || 'Employee added successfully!' });
                // Show credentials or email-sent notice
                if (result.login_credentials) {
                    setCreatedCredentials(result.login_credentials);
                    setEmailSent(false);
                } else if (result.email_sent) {
                    setEmailSent(true);
                }
                // Don't auto-redirect — let HR see the credentials first
            } else {
                const errorText = typeof result.detail === 'string'
                    ? result.detail
                    : Array.isArray(result.detail)
                        ? result.detail.map((err: any) => err.msg).join(', ')
                        : 'Failed to add employee';
                setMessage({ type: 'error', text: errorText });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in-up">
            {message.text && (
                <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                    {message.text}
                </div>
            )}

            {/* Email sent confirmation */}
            {emailSent && (
                <div className="bg-green-900/20 border border-green-700 rounded-2xl p-6 mb-6 flex items-start gap-4">
                    <div className="text-green-400 text-2xl">✅</div>
                    <div>
                        <p className="font-bold text-green-300 text-lg">Login credentials emailed!</p>
                        <p className="text-green-500 text-sm mt-1">A welcome email with their username and temporary password was sent to the employee's email address.</p>
                        <button onClick={() => navigate('/employee-directory')} className="mt-4 px-6 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition">
                            Go to Employee Directory →
                        </button>
                    </div>
                </div>
            )}

            {/* Fallback: show credentials manually when email isn't configured */}
            {createdCredentials && (
                <div className="bg-[#1a1a2e] border border-brand-purple/40 rounded-2xl p-6 mb-6">
                    <p className="text-xs text-yellow-500 uppercase tracking-widest mb-1">⚠️ Email not configured — share manually</p>
                    <p className="font-bold text-white text-lg mb-4">Share these login credentials with the employee</p>
                    <div className="space-y-3">
                        {[
                            { label: 'Username (Login)', value: createdCredentials.username },
                            { label: 'Temporary Password', value: createdCredentials.temporary_password },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-center justify-between bg-[#111] rounded-xl px-4 py-3 border border-[#333]">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
                                    <p className="font-mono text-brand-purple font-bold text-lg">{value}</p>
                                </div>
                                <button
                                    onClick={() => navigator.clipboard.writeText(value)}
                                    title="Copy to clipboard"
                                    className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-4">The employee must change this password after first login.</p>
                    <button onClick={() => navigate('/employee-directory')} className="mt-4 px-6 py-2 bg-brand-purple hover:bg-brand-purple/80 text-white rounded-lg text-sm font-bold transition">
                        Go to Employee Directory →
                    </button>
                </div>
            )}

            {/* Only show form if not yet successfully submitted */}
            {!createdCredentials && !emailSent && (
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Section 1: Personal Details */}
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-[#222] pb-4">
                            <User className="text-brand-purple" size={20} /> Personal Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <InputField label="Employee Code (e.g. EMP001)" name="code" value={formData.code} onChange={handleChange} required placeholder="EMP..." />
                            <InputField label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
                            <InputField label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} required />
                            <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
                            <InputField label="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required placeholder="9876543210" />
                            <InputField label="Emergency Contact" name="emergency" value={formData.emergency} onChange={handleChange} required placeholder="9876543210" />

                            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <TextAreaField label="Current Address" name="current_address" value={formData.current_address} onChange={handleChange} />
                                <TextAreaField label="Permanent Address" name="permanent_address" value={formData.permanent_address} onChange={handleChange} />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Employment Details */}
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-[#222] pb-4">
                            <Briefcase className="text-blue-500" size={20} /> Employment Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <ListSelectField label="Team / Dept" value={formData.team} onChange={(e: any) => setFormData({ ...formData, team: e.target.value })} options={options.teams} />
                            <ListSelectField label="Designation" value={formData.role} onChange={(e: any) => setFormData({ ...formData, role: e.target.value })} options={options.designations} />

                            <div className="flex flex-col gap-2 relative">
                                <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">Reporting Manager <User size={12} /></label>
                                <select
                                    name="manager"
                                    value={formData.manager}
                                    onChange={handleChange}
                                    className="appearance-none w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 pr-10 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all cursor-pointer hover:border-gray-500"
                                >
                                    <option value="" className="text-gray-500">Select Reporting Manager</option>
                                    {options.managers.map((m) => (
                                        <option key={m.code} value={m.name}>{m.name} ({m.role})</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-[34px] pointer-events-none text-gray-500">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>

                            <InputField label="Date of Joining" name="doj" type="date" value={formData.doj} onChange={handleChange} required />
                            <InputField label="Office Location" name="location" value={formData.location} onChange={handleChange} />

                            <SelectField label="Employment Type" name="type" value={formData.type} onChange={handleChange} options={['Full Time', 'Part Time', 'Contractual', 'Internship']} />

                            <SelectField label="PF Included?" name="pf" value={formData.pf} onChange={handleChange} options={['Yes', 'No']} />
                            <SelectField label="Mediclaim Included?" name="mediclaim" value={formData.mediclaim} onChange={handleChange} options={['Yes', 'No']} />
                        </div>
                        <div className="mt-6">
                            <TextAreaField label="Notes" name="notes" value={formData.notes} onChange={handleChange} />
                        </div>
                    </div>

                    {/* Section 3: Skills & Documents */}
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white border-b border-[#222] pb-4">
                            <FileText className="text-yellow-500" size={20} /> Skills & Documents
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputField label="Primary Skills" name="primary_skillset" value={formData.primary_skillset} onChange={handleChange} />
                            <InputField label="Secondary Skills" name="secondary_skillset" value={formData.secondary_skillset} onChange={handleChange} />
                            <InputField label="Years Experience" name="experience_years" type="number" step="0.1" value={formData.experience_years} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FileUpload label="Profile Photo" file={files.photo} onChange={(e) => handleFileChange(e, 'photo')} />
                            <FileUpload label="Resume / CV" file={files.cv} onChange={(e) => handleFileChange(e, 'cv')} />
                            <FileUpload label="ID Proofs" file={files.id_proof} onChange={(e) => handleFileChange(e, 'id_proof')} />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex justify-end gap-4 pt-4 pb-20">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-3 rounded-xl bg-brand-purple text-white font-bold shadow-lg shadow-brand-purple/20 hover:bg-opacity-90 transition-all flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Save size={18} />
                            {loading ? 'Saving...' : 'Save Employee'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// Helpers
const InputField = ({ label, name, type = 'text', value, onChange, placeholder, step, required }: { label: string, name?: string, type?: string, value: string | number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder?: string, step?: string, required?: boolean }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">{label} {required && <span className="text-red-500">*</span>}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            step={step}
            required={required}
            className="w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 focus:outline-none focus:border-brand-purple transition-colors placeholder-gray-700"
        />
    </div>
);

const TextAreaField = ({ label, name, value, onChange }: { label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
        <textarea
            name={name}
            value={value}
            onChange={onChange}
            className="w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 focus:outline-none focus:border-brand-purple transition-colors h-24 resize-none"
        />
    </div>
);

const SelectField = ({ label, name, value, onChange, options }: { label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[] }) => (
    <div className="flex flex-col gap-2 relative">
        <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="appearance-none w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 pr-10 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all cursor-pointer hover:border-gray-500"
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt} className="bg-[#1a1a1a] text-gray-200">{opt}</option>
            ))}
        </select>
        <div className="absolute right-3 top-[34px] pointer-events-none text-gray-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </div>
    </div>
);

const FileUpload = ({ label, onChange, file }: { label: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, file: File | null }) => (
    <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
        <div className="relative group">
            <input
                type="file"
                onChange={onChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={`bg-[#1a1a1a] border border-[#333] border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 group-hover:border-brand-purple transition-colors ${file ? 'text-brand-purple border-brand-purple/50' : 'text-gray-400 group-hover:text-brand-purple'}`}>
                {file ? <FileText size={20} /> : <Upload size={20} />}
                <span className="text-xs text-center truncate w-full px-2">{file ? file.name : 'Click to upload'}</span>
            </div>
        </div>
    </div>
);

const ListSelectField = ({ label, value, onChange, options }: { label: string, value: string, onChange: (e: any) => void, options: string[] }) => {
    const listId = `list-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (
        <div className="flex flex-col gap-2 relative">
            <label className="text-xs text-gray-500 uppercase tracking-wider">{label}</label>
            <input
                list={listId}
                value={value}
                onChange={onChange}
                placeholder={`Select or type ${label}`}
                className="w-full bg-[#1a1a1a] border border-[#333] text-gray-200 rounded-lg p-3 pr-10 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all placeholder-gray-600"
            />
            <datalist id={listId}>
                {options.map((opt, i) => (
                    <option key={i} value={opt} />
                ))}
            </datalist>
            <div className="absolute right-3 top-[34px] pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </div>
        </div>
    );
};
