'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Trash2, List, Activity, AlertCircle, CheckCircle, Settings, UserPlus, Info } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface SystemUser {
    id: number;
    username: string;
    role: string;
    employee_code?: string | null;
}

interface AuditLog {
    id: number;
    username: string | null;
    action: string;
    details: string | null;
    timestamp: string;
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'permissions'>('users');

    // Auth Check
    const isAuthorized = user && viewingAsRole === 'Admin' && (user.permissions?.includes('can_manage_users') || user.role === 'Admin');
    useEffect(() => {
        if (!authLoading && !isAuthorized) {
            navigate('/dashboard');
        }
    }, [authLoading, isAuthorized, user, viewingAsRole, navigate]);

    // Data State
    const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Permissions State
    const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
    const [selectedUserForPerms, setSelectedUserForPerms] = useState<SystemUser | null>(null);
    const [userOverrides, setUserOverrides] = useState<Record<string, boolean | null>>({});
    const [empCodeInput, setEmpCodeInput] = useState('');
    const AVAILABLE_PERMISSIONS = [
        'can_view_dashboard', 'can_manage_employees', 'can_add_employee',
        'can_view_salaries', 'can_manage_assets', 'can_manage_training',
        'can_view_audit_logs', 'can_manage_users', 'can_approve_leave',
        'can_manage_permissions', 'can_manage_kra'
    ];

    // Menu
    const menuItems = user ? getMenuItems(viewingAsRole || undefined, user?.permissions) : [];

    // Fetch Data
    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users', { credentials: 'include' });
            if (res.ok) setSystemUsers(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/admin/logs', { credentials: 'include' });
            if (res.ok) setLogs(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchRolePermissions = async () => {
        try {
            const res = await fetch('/api/admin/permissions/roles', { credentials: 'include' });
            if (res.ok) setRolePermissions(await res.json());
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (isAuthorized) {
            if (activeTab === 'users') fetchUsers();
            else if (activeTab === 'logs') fetchLogs();
            else if (activeTab === 'permissions') fetchRolePermissions();
        }
    }, [isAuthorized, activeTab]);

    // Handlers
    const handleDeleteUser = async (id: number, username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"? This cannot be undone.`)) return;
        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
                setMessage({ type: 'success', text: 'User deleted successfully' });
                fetchUsers();
                if (selectedUserForPerms?.id === id) setSelectedUserForPerms(null);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.detail || 'Failed to delete' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Delete failed' });
        }
    };

    const handleRoleChange = async (userId: number, username: string, newRole: string) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `Role for ${username} updated to ${newRole}` });
                fetchUsers();
            } else {
                const d = await res.json();
                setMessage({ type: 'error', text: d.detail || 'Failed to update role' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error updating role' });
        }
    };

    const handleSelectUserForPerms = async (u: SystemUser) => {
        setSelectedUserForPerms(u);
        setEmpCodeInput(u.employee_code || '');
        try {
            const res = await fetch(`/api/admin/permissions/users/${u.id}`, { credentials: 'include' });
            if (res.ok) setUserOverrides(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleUpdateEmployeeCode = async () => {
        if (!selectedUserForPerms) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users/${selectedUserForPerms.id}/employee-code`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ employee_code: empCodeInput.trim() || null })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `Employee profile linked for ${selectedUserForPerms.username}` });
                fetchUsers();
                setSelectedUserForPerms(prev => prev ? { ...prev, employee_code: empCodeInput.trim() || null } : null);
            } else {
                const d = await res.json();
                setMessage({ type: 'error', text: d.detail || 'Failed to update employee code' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUserOverrides = async () => {
        if (!selectedUserForPerms) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/permissions/users/${selectedUserForPerms.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ overrides: userOverrides })
            });
            if (res.ok) {
                setMessage({ type: 'success', text: `Overrides saved for ${selectedUserForPerms.username}` });
                setSelectedUserForPerms(null);
            } else {
                setMessage({ type: 'error', text: 'Failed to update overrides' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRolePermissionChange = async (role: string, permission: string, checked: boolean) => {
        setRolePermissions(prev => {
            const newPerms = prev[role] ? [...prev[role]] : [];
            if (checked && !newPerms.includes(permission)) newPerms.push(permission);
            else if (!checked) { const idx = newPerms.indexOf(permission); if (idx > -1) newPerms.splice(idx, 1); }
            return { ...prev, [role]: newPerms };
        });

        const updatedArray = rolePermissions[role] ? [...rolePermissions[role]] : [];
        if (checked && !updatedArray.includes(permission)) updatedArray.push(permission);
        else if (!checked) { const idx = updatedArray.indexOf(permission); if (idx > -1) updatedArray.splice(idx, 1); }

        try {
            const res = await fetch('/api/admin/permissions/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role, permissions: updatedArray })
            });
            if (!res.ok) { setMessage({ type: 'error', text: 'Failed to update permission' }); fetchRolePermissions(); }
            else setMessage({ type: 'success', text: 'Permission updated. Users may need to re-login to see changes.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
            fetchRolePermissions();
        }
    };

    const roleColor = (role: string) => {
        if (role === 'Admin') return 'bg-red-900/30 text-red-400 border border-red-900/50';
        if (role === 'HR') return 'bg-purple-900/30 text-purple-400 border border-purple-900/50';
        if (role === 'Management') return 'bg-blue-900/30 text-blue-400 border border-blue-900/50';
        return 'bg-gray-900/30 text-gray-400 border border-gray-800';
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

            <main className="relative z-10 max-w-6xl mx-auto p-6 pt-32 animate-fade-in-up">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400 flex items-center gap-3">
                            <Shield className="text-red-500" size={32} /> Admin Panel
                        </h1>
                        <p className="text-gray-400 mt-1">Manage roles, permissions and audit logs.</p>
                    </div>

                    <div className="flex bg-[#222] p-1 rounded-full border border-[#333]">
                        {(['users', 'permissions', 'logs'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            >
                                {tab === 'users' && <List size={16} />}
                                {tab === 'permissions' && <Shield size={16} />}
                                {tab === 'logs' && <Activity size={16} />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                        <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto hover:underline text-xs">Dismiss</button>
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* User List */}
                        <div className="lg:col-span-8 bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <List size={20} className="text-red-400" /> System Users
                                </h2>
                                <button
                                    onClick={() => navigate('/add-employee')}
                                    className="flex items-center gap-2 text-xs bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple border border-brand-purple/30 px-3 py-2 rounded-lg transition font-bold"
                                >
                                    <UserPlus size={14} /> Add Employee
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#333] text-gray-500 text-xs uppercase">
                                            <th className="pb-3 pl-4">Username</th>
                                            <th className="pb-3">System Role</th>
                                            <th className="pb-3">Employee Profile</th>
                                            <th className="pb-3 text-right pr-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {systemUsers.map(u => (
                                            <tr key={u.id} className={`border-b border-[#222] hover:bg-[#1a1a1a] ${selectedUserForPerms?.id === u.id ? 'bg-[#1a1a2e]' : ''}`}>
                                                <td className="py-4 pl-4 font-bold text-white">{u.username}</td>
                                                <td className="py-4">
                                                    {/* Inline role dropdown */}
                                                    {u.username === user?.username ? (
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${roleColor(u.role)}`}>{u.role}</span>
                                                    ) : (
                                                        <select
                                                            value={u.role}
                                                            onChange={e => handleRoleChange(u.id, u.username, e.target.value)}
                                                            className={`text-xs font-bold rounded px-2 py-1 bg-transparent border cursor-pointer outline-none ${roleColor(u.role)}`}
                                                        >
                                                            {['Employee', 'Management', 'HR', 'Admin'].map(r => (
                                                                <option key={r} value={r} className="bg-[#111] text-white">{r}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="py-4 text-xs text-gray-500 font-mono">
                                                    {u.employee_code
                                                        ? <span className="text-green-400">{u.employee_code}</span>
                                                        : <span className="text-gray-600 italic">not linked</span>}
                                                </td>
                                                <td className="py-4 text-right pr-4 flex justify-end gap-2">
                                                    <button
                                                        onClick={() => selectedUserForPerms?.id === u.id ? setSelectedUserForPerms(null) : handleSelectUserForPerms(u)}
                                                        className={`transition-colors p-2 rounded ${selectedUserForPerms?.id === u.id ? 'text-purple-400 bg-purple-900/20' : 'text-gray-500 hover:text-purple-400'}`}
                                                        title="Settings"
                                                    >
                                                        <Settings size={16} />
                                                    </button>
                                                    {u.username !== user?.username && (
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.username)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors p-2"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {systemUsers.length === 0 && (
                                            <tr><td colSpan={4} className="py-10 text-center text-gray-600 italic">No users found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Panel */}
                        <div className="lg:col-span-4 bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6 h-fit sticky top-32">
                            {selectedUserForPerms ? (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            <Settings size={20} className="text-purple-400" /> Settings
                                        </h2>
                                        <button onClick={() => setSelectedUserForPerms(null)} className="text-gray-500 hover:text-white text-xs">✕ Close</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-5 font-mono bg-[#1a1a1a] px-3 py-2 rounded-lg">{selectedUserForPerms.username}</p>

                                    {/* Employee Code Linking */}
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] mb-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Link Employee Profile</p>
                                        <p className="text-xs text-gray-600 mb-3">Enter the employee code from the employee directory to link this account so the user can clock in and do self-assessments.</p>
                                        <input
                                            type="text"
                                            placeholder="e.g. EMP001"
                                            value={empCodeInput}
                                            onChange={e => setEmpCodeInput(e.target.value)}
                                            className="w-full bg-[#111] border border-[#444] rounded-lg p-2 text-sm text-white font-mono focus:border-purple-500 outline-none mb-3"
                                        />
                                        <button
                                            onClick={handleUpdateEmployeeCode}
                                            disabled={loading}
                                            className="w-full py-2 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-sm font-bold transition"
                                        >
                                            {loading ? 'Saving...' : empCodeInput.trim() ? 'Link Profile' : 'Unlink Profile'}
                                        </button>
                                    </div>

                                    {/* Permission Overrides */}
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Permission Overrides</p>
                                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                        {AVAILABLE_PERMISSIONS.map(perm => {
                                            const val = userOverrides[perm] === undefined ? null : userOverrides[perm];
                                            return (
                                                <div key={perm} className="flex flex-col bg-[#1a1a1a] p-3 rounded-lg border border-[#333]">
                                                    <span className="text-xs font-mono text-gray-300 mb-2">{perm}</span>
                                                    <div className="flex gap-2 text-xs">
                                                        <button onClick={() => setUserOverrides({ ...userOverrides, [perm]: null })} className={`flex-1 py-1 rounded ${val === null ? 'bg-gray-700 text-white border border-gray-600' : 'bg-[#222] text-gray-500 hover:bg-[#333]'}`}>Inherit</button>
                                                        <button onClick={() => setUserOverrides({ ...userOverrides, [perm]: true })} className={`flex-1 py-1 rounded ${val === true ? 'bg-green-700 text-white border border-green-600' : 'bg-[#222] text-gray-500 hover:bg-[#333]'}`}>Allow</button>
                                                        <button onClick={() => setUserOverrides({ ...userOverrides, [perm]: false })} className={`flex-1 py-1 rounded ${val === false ? 'bg-red-700 text-white border border-red-600' : 'bg-[#222] text-gray-500 hover:bg-[#333]'}`}>Deny</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={handleSaveUserOverrides}
                                        disabled={loading}
                                        className="w-full mt-4 py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-opacity-90 transition shadow-lg"
                                    >
                                        {loading ? 'Saving...' : 'Save Overrides'}
                                    </button>
                                </div>
                            ) : (
                                /* Default state — no user selected */
                                <div className="flex flex-col items-center text-center py-6 gap-4">
                                    <div className="p-4 bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a]">
                                        <Info size={28} className="text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-400">Select a user</p>
                                        <p className="text-xs text-gray-600 mt-1">Click the settings icon next to any user to manage their employee profile link and permission overrides.</p>
                                    </div>
                                    <div className="w-full border-t border-[#222] pt-4 mt-2">
                                        <p className="text-xs text-gray-600 mb-3">To add a new employee to the system:</p>
                                        <button
                                            onClick={() => navigate('/add-employee')}
                                            className="w-full py-2 rounded-xl bg-brand-purple/10 hover:bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-sm font-bold transition flex items-center justify-center gap-2"
                                        >
                                            <UserPlus size={16} /> Go to Add Employee
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- PERMISSIONS TAB --- */}
                {activeTab === 'permissions' && (
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Shield size={20} className="text-red-400" /> Role Permissions
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#333] text-gray-400 text-xs uppercase">
                                        <th className="pb-3 pl-4">Permission Name</th>
                                        <th className="pb-3 text-center">Admin</th>
                                        <th className="pb-3 text-center">HR</th>
                                        <th className="pb-3 text-center">Management</th>
                                        <th className="pb-3 text-center">Employee</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {AVAILABLE_PERMISSIONS.map(perm => (
                                        <tr key={perm} className="border-b border-[#222] hover:bg-[#1a1a1a]">
                                            <td className="py-4 pl-4 font-mono text-gray-300">{perm}</td>
                                            {['Admin', 'HR', 'Management', 'Employee'].map(role => (
                                                <td key={role} className="py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={rolePermissions[role]?.includes(perm) || false}
                                                        onChange={(e) => handleRolePermissionChange(role, perm, e.target.checked)}
                                                        className="w-4 h-4 bg-[#1a1a1a] border-[#333] rounded focus:ring-red-500 accent-red-500"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- LOGS TAB --- */}
                {activeTab === 'logs' && (
                    <div className="bg-[#111]/80 backdrop-blur-md border border-[#222] rounded-3xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-red-400" /> System Audit Logs
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#333] text-gray-500 text-xs uppercase">
                                        <th className="pb-3 pl-4">Time</th>
                                        <th className="pb-3">User</th>
                                        <th className="pb-3">Action</th>
                                        <th className="pb-3">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-mono text-gray-400">
                                    {logs.map((log: AuditLog) => (
                                        <tr key={log.id} className="border-b border-[#222] hover:bg-[#1a1a1a]">
                                            <td className="py-3 pl-4 text-xs">{new Date(log.timestamp + 'Z').toLocaleString()}</td>
                                            <td className="py-3 font-bold text-white">{log.username || 'System'}</td>
                                            <td className="py-3 text-red-300">{log.action}</td>
                                            <td className="py-3">{log.details}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={4} className="py-8 text-center italic text-gray-600">No logs found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
