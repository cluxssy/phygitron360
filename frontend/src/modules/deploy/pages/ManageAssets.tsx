'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, CheckCircle, Save, AlertCircle } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface Employee {
    employee_code: string;
    name: string;
    designation?: string;
}

interface AssetChecklist {
    // Onboarding
    ob_laptop: number;
    ob_laptop_bag: number;
    ob_headphones: number;
    ob_mouse: number;
    ob_extra_hardware: number;
    ob_client_assets: number;

    ob_id_card: number;
    ob_email_access: number;
    ob_groups: number;
    ob_mediclaim: number;
    ob_pf: number;

    ob_remarks: string;

    // Clearance
    cl_laptop: number;
    cl_laptop_bag: number;
    cl_headphones: number;
    cl_mouse: number;
    cl_extra_hardware: number;
    cl_client_assets: number;

    cl_id_card: number;
    cl_email_access: number;
    cl_groups: number;
    cl_relieving_letter: number;

    cl_remarks: string;
}

const DEFAULT_CHECKLIST: AssetChecklist = {
    ob_laptop: 0, ob_laptop_bag: 0, ob_headphones: 0, ob_mouse: 0, ob_extra_hardware: 0, ob_client_assets: 0,
    ob_id_card: 0, ob_email_access: 0, ob_groups: 0, ob_mediclaim: 0, ob_pf: 0, ob_remarks: '',

    cl_laptop: 0, cl_laptop_bag: 0, cl_headphones: 0, cl_mouse: 0, cl_extra_hardware: 0, cl_client_assets: 0,
    cl_id_card: 0, cl_email_access: 0, cl_groups: 0, cl_relieving_letter: 0, cl_remarks: ''
};

export default function ManageAssets() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();

    // Auth Check
    const isAuthorized = user && viewingAsRole !== 'Employee' && (user.permissions?.includes('can_manage_assets') || ['Admin', 'HR'].includes(user.role));

    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            if (!user) navigate('/');
            else navigate('/dashboard');
        }
    }, [authLoading, isAuthorized, user, viewingAsRole, navigate]);

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [checklist, setChecklist] = useState<AssetChecklist>(DEFAULT_CHECKLIST);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchChecklist = async (code: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/assets/${code}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                // Merge with default to ensure all fields exist
                setChecklist({ ...DEFAULT_CHECKLIST, ...data });
            } else {
                setChecklist(DEFAULT_CHECKLIST);
            }
        } catch (err) {
            console.error(err);
            setChecklist(DEFAULT_CHECKLIST);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectEmployee = (emp: Employee) => {
        setSelectedEmployee(emp);
        setSearchTerm(emp.name);
        fetchChecklist(emp.employee_code);
    };

    const handleSave = async () => {
        if (!selectedEmployee) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/assets/${selectedEmployee.employee_code}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checklist)
            });
            if (res.ok) {
                alert('Checklists saved successfully');
            } else {
                alert('Failed to save checklists');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving checklists');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: keyof AssetChecklist, value: any) => {
        setChecklist(prev => ({ ...prev, [field]: value }));
    };

    // Filter employees for autocomplete
    const filteredEmployees = searchTerm
        ? employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.employee_code.toLowerCase().includes(searchTerm.toLowerCase()))
        : [];

    if (!isAuthorized) return null;

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves lineColor="#230a46ff" backgroundColor="rgba(0,0,0,0.2)" className="fixed inset-0 pointer-events-none z-0" />
            <StaggeredMenu
                position="right"
                isFixed={true}
                items={menuItems}
                displayItemNumbering={true}
                colors={['#B19EEF', '#5227FF']}
                logoUrl="/logo.png"
                accentColor="var(--color-brand-purple)"
                menuBackgroundColor="#000000ff"
                itemTextColor="#ffffff"
                smartHeader={true}
                headerColor="#000000ff"
            />

            <main className="relative z-10 max-w-6xl mx-auto p-6 pt-32">

                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Allocation Management
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Selection */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 relative">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Search size={18} className="text-brand-purple" /> Find Employee
                            </h2>
                            <input
                                type="text"
                                placeholder="Search by Name or ID..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    if (e.target.value === '') setSelectedEmployee(null);
                                }}
                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-3 text-white focus:border-brand-purple outline-none"
                            />
                            {/* Autocomplete Dropdown */}
                            {searchTerm && !selectedEmployee && filteredEmployees.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl max-h-60 overflow-y-auto z-20">
                                    {filteredEmployees.map(emp => (
                                        <div
                                            key={emp.employee_code}
                                            onClick={() => handleSelectEmployee(emp)}
                                            className="p-3 hover:bg-[#222] cursor-pointer border-b border-[#333] last:border-0"
                                        >
                                            <p className="font-bold text-white">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.employee_code} • {emp.designation}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedEmployee && (
                            <div className="animate-fade-in-up">
                                <div className="bg-[#111]/80 border border-[#222] rounded-3xl p-6 mb-4">
                                    <h3 className="text-lg font-bold text-white mb-2">{selectedEmployee.name}</h3>
                                    <span className="text-sm bg-brand-purple/20 text-brand-purple px-3 py-1 rounded-full">
                                        {selectedEmployee.designation}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-4 rounded-xl bg-brand-purple text-white font-bold hover:bg-opacity-90 transition shadow-lg shadow-brand-purple/20 flex items-center justify-center gap-2"
                                >
                                    {saving ? 'Saving...' : (
                                        <>
                                            <Save size={20} /> Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Checklists */}
                    <div className="lg:col-span-8">
                        {selectedEmployee ? (
                            loading ? (
                                <div className="text-center py-20 text-gray-500">Loading checklists...</div>
                            ) : (
                                <div className="space-y-8 animate-fade-in-up">

                                    {/* Onboarding Checklist */}
                                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8">
                                        <h2 className="text-2xl font-bold mb-6 text-green-400 flex items-center gap-3">
                                            <CheckCircle className="fill-green-900/30 text-green-500" /> Onboarding Checklist
                                        </h2>

                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">IT & Hardware</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ChecklistItem label="Laptop" checked={!!checklist.ob_laptop} onChange={(v) => updateField('ob_laptop', v ? 1 : 0)} />
                                                <ChecklistItem label="Laptop Bag" checked={!!checklist.ob_laptop_bag} onChange={(v) => updateField('ob_laptop_bag', v ? 1 : 0)} />
                                                <ChecklistItem label="Headphones" checked={!!checklist.ob_headphones} onChange={(v) => updateField('ob_headphones', v ? 1 : 0)} />
                                                <ChecklistItem label="Mouse" checked={!!checklist.ob_mouse} onChange={(v) => updateField('ob_mouse', v ? 1 : 0)} />
                                                <ChecklistItem label="Any extra hardware" checked={!!checklist.ob_extra_hardware} onChange={(v) => updateField('ob_extra_hardware', v ? 1 : 0)} />
                                                <ChecklistItem label="Client provided assets" checked={!!checklist.ob_client_assets} onChange={(v) => updateField('ob_client_assets', v ? 1 : 0)} />
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Admin & Access</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ChecklistItem label="ID Card" checked={!!checklist.ob_id_card} onChange={(v) => updateField('ob_id_card', v ? 1 : 0)} />
                                                <ChecklistItem label="Email Access" checked={!!checklist.ob_email_access} onChange={(v) => updateField('ob_email_access', v ? 1 : 0)} />
                                                <ChecklistItem label="Added to Groups" checked={!!checklist.ob_groups} onChange={(v) => updateField('ob_groups', v ? 1 : 0)} />
                                                <ChecklistItem label="Mediclaim Included" checked={!!checklist.ob_mediclaim} onChange={(v) => updateField('ob_mediclaim', v ? 1 : 0)} />
                                                <ChecklistItem label="PF Included" checked={!!checklist.ob_pf} onChange={(v) => updateField('ob_pf', v ? 1 : 0)} />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Remarks</label>
                                            <textarea
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-gray-300 focus:border-green-500 outline-none transition-colors min-h-[100px]"
                                                placeholder="Add remarks for onboarding..."
                                                value={checklist.ob_remarks || ''}
                                                onChange={(e) => updateField('ob_remarks', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Clearance Checklist */}
                                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-8">
                                        <h2 className="text-2xl font-bold mb-6 text-red-400 flex items-center gap-3">
                                            <AlertCircle className="fill-red-900/30 text-red-500" /> Clearance Checklist
                                        </h2>

                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Return Hardware</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ChecklistItem label="Laptop" checked={!!checklist.cl_laptop} onChange={(v) => updateField('cl_laptop', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Laptop Bag" checked={!!checklist.cl_laptop_bag} onChange={(v) => updateField('cl_laptop_bag', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Headphones" checked={!!checklist.cl_headphones} onChange={(v) => updateField('cl_headphones', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Mouse" checked={!!checklist.cl_mouse} onChange={(v) => updateField('cl_mouse', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Any extra hardware" checked={!!checklist.cl_extra_hardware} onChange={(v) => updateField('cl_extra_hardware', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Client provided assets" checked={!!checklist.cl_client_assets} onChange={(v) => updateField('cl_client_assets', v ? 1 : 0)} variant="destructive" />
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Revoke Access & Admin</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <ChecklistItem label="ID Card Returned" checked={!!checklist.cl_id_card} onChange={(v) => updateField('cl_id_card', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Email Access Revoked" checked={!!checklist.cl_email_access} onChange={(v) => updateField('cl_email_access', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Removed from Groups" checked={!!checklist.cl_groups} onChange={(v) => updateField('cl_groups', v ? 1 : 0)} variant="destructive" />
                                                <ChecklistItem label="Relieving Letter Issued" checked={!!checklist.cl_relieving_letter} onChange={(v) => updateField('cl_relieving_letter', v ? 1 : 0)} variant="destructive" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Remarks</label>
                                            <textarea
                                                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl p-4 text-gray-300 focus:border-red-500 outline-none transition-colors min-h-[100px]"
                                                placeholder="Add remarks for clearance..."
                                                value={checklist.cl_remarks || ''}
                                                onChange={(e) => updateField('cl_remarks', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                </div>
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500 bg-[#111]/50 border border-[#222] rounded-3xl min-h-[400px]">
                                Select an employee to view and manage their asset checklists.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function ChecklistItem({ label, checked, onChange, variant = 'default' }: { label: string, checked: boolean, onChange: (val: boolean) => void, variant?: 'default' | 'destructive' }) {
    const activeColor = variant === 'destructive' ? 'bg-red-500 border-red-500' : 'bg-green-500 border-green-500';
    const activeText = variant === 'destructive' ? 'text-white' : 'text-black';

    return (
        <div
            onClick={() => onChange(!checked)}
            className={`cursor-pointer group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${checked
                ? `${activeColor} ${activeText} shadow-lg shadow-${variant === 'destructive' ? 'red' : 'green'}-500/20`
                : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:border-gray-500'
                }`}
        >
            <span className="font-medium">{label}</span>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${checked ? 'border-white bg-white/20' : 'border-gray-600 group-hover:border-gray-400'
                }`}>
                {checked && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
            </div>
        </div>
    );
}


