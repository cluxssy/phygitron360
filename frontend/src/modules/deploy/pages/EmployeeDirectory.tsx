'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, UserPlus, Filter, Monitor, User, LogOut } from 'lucide-react';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';

interface Employee {
    employee_code: string;
    name: string;
    designation: string;
    team: string;
    email_id: string;
    photo_path: string | null;
    employment_status?: string;
}

export default function EmployeeDirectory() {
    const navigate = useNavigate();
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Exited'>('All');

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (!authLoading) {
            if (!user) {
                // Not logged in
                navigate('/');
            } else if (!['Admin', 'HR', 'Management'].includes(viewingAsRole || '')) {
                // Unauthorized
                navigate('/deploy/dashboard');
            } else {
                fetchEmployees();
            }
        }
    }, [user, viewingAsRole, authLoading, navigate]);

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
            e.employee_code.toLowerCase().includes(search.toLowerCase()) ||
            (e.team || '').toLowerCase().includes(search.toLowerCase());

        if (filterStatus === 'All') return matchesSearch;

        // Normalize status check (DB default is 'Active')
        const status = e.employment_status || 'Active';
        // Check for exact match or if simple 'Exited' vs 'Active' logic applies
        const matchesStatus = status === filterStatus;

        return matchesSearch && matchesStatus;
    });

    if (authLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    if (!user) return null;

    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);
    const canManage = ['Admin', 'HR'].includes(viewingAsRole || '');

    return (
        <div className="min-h-screen bg-brand-black text-white relative">
            <Waves
                lineColor={"#230a46ff"}
                backgroundColor="rgba(0, 0, 0, 0.2)"
                waveSpeedX={0.02}
                waveSpeedY={0.01}
                waveAmpX={40}
                waveAmpY={20}
                friction={0.9}
                tension={0.01}
                maxCursorMove={120}
                xGap={12}
                yGap={36}
                className="fixed top-0 left-0 w-full h-screen z-0 pointer-events-none"
            />

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
                onMenuOpen={() => console.log('Menu opened')}
                onMenuClose={() => console.log('Menu closed')}
                menuBackgroundColor="#000000ff"
                itemTextColor="#ffffff"
                smartHeader={true}
                headerColor="#000000ff"
            />

            <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10 w-full">
                {/* Header Controls */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Employee Directory
                    </h1>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, ID or team..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#111] border border-[#333] rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
                            />
                        </div>



                        <div className="flex bg-[#111] rounded-lg p-1 border border-[#333] gap-2 items-center">

                            {canManage && (
                                <>

                                    <button
                                        onClick={() => navigate('/deploy/add-employee')}
                                        className="bg-brand-purple text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 mr-2"
                                    >
                                        <UserPlus size={16} /> Add
                                    </button>
                                </>
                            )}

                            {/* Filter Dropdown */}
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="bg-transparent text-gray-300 text-sm font-medium px-2 py-1 outline-none border-none cursor-pointer hover:text-white"
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Exited">Exited</option>
                            </select>

                            <div className="w-px h-6 bg-[#333]"></div>

                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                aria-label="Grid view"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-brand-purple text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                aria-label="List view"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Loading directory data...</div>
                ) : (
                    <div className={viewMode === 'grid'
                        ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "flex flex-col gap-3"
                    }>
                        {filtered.map((emp) => (
                            viewMode === 'grid' ? (
                                // GRID CARD DESIGN
                                <div key={emp.employee_code} className="group relative bg-[#121212] rounded-2xl overflow-hidden border border-[#222] hover:border-brand-purple/50 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-purple/10 flex flex-col">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-purple to-blue-600 opacity-70 group-hover:opacity-100 transition-opacity"></div>

                                    <div className="p-6 flex flex-col items-center text-center flex-grow">
                                        <div className="relative mb-4">
                                            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-[#333] to-[#111] group-hover:from-brand-purple group-hover:to-blue-600 transition-all duration-500">
                                                <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1a1a] relative">
                                                    {emp.photo_path ? (
                                                        <img
                                                            src={`/static/${emp.photo_path}`}
                                                            alt={emp.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                            <User size={32} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-6 h-6 border-4 border-[#121212] rounded-full ${(!emp.employment_status || emp.employment_status === 'Active') ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        </div>

                                        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-purple transition-colors">{emp.name}</h3>
                                        <p className="text-sm text-gray-400 mb-4">{emp.designation}</p>

                                        <div className="w-full mt-auto space-y-2">
                                            <div className="bg-[#1a1a1a] rounded-lg py-2 px-3 text-xs text-gray-400 flex justify-between items-center group-hover:bg-[#222] transition-colors">
                                                <span>ID</span>
                                                <span className="font-mono text-gray-200">{emp.employee_code}</span>
                                            </div>
                                            <div className="bg-[#1a1a1a] rounded-lg py-2 px-3 text-xs text-gray-400 flex justify-between items-center group-hover:bg-[#222] transition-colors">
                                                <span>Team</span>
                                                <span className="text-gray-200">{emp.team}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 pb-6 pt-0">
                                        <button
                                            onClick={() => navigate(`/deploy/employee-profile/${emp.employee_code}`)}
                                            className="w-full py-2.5 rounded-xl border border-[#333] bg-transparent text-sm font-medium hover:bg-brand-purple hover:border-brand-purple hover:text-white transition-all"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // LIST ROW DESIGN
                                <div key={emp.employee_code} className="group flex items-center gap-4 bg-[#121212] p-4 rounded-xl border border-[#222] hover:border-brand-purple/40 hover:bg-[#1a1a1a] transition-all">
                                    <div className="w-12 h-12 rounded-full overflow-hidden bg-[#222] flex-shrink-0">
                                        {emp.photo_path ? (
                                            <img src={`/static/${emp.photo_path}`} alt={emp.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-500"><User size={20} /></div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                        <div className="md:col-span-1">
                                            <h3 className="font-bold text-white truncate group-hover:text-brand-purple transition-colors">{emp.name}</h3>
                                            <p className="text-xs text-gray-500 truncate">{emp.employee_code}</p>
                                        </div>
                                        <div className="hidden md:block md:col-span-1 text-sm text-gray-300 truncate">
                                            {emp.designation}
                                        </div>
                                        <div className="hidden md:block md:col-span-1">
                                            <span className="inline-block px-2 py-1 rounded-md bg-[#222] text-xs text-gray-300 border border-[#333]">
                                                {emp.team}
                                            </span>
                                        </div>
                                        <div className="flex justify-end md:col-span-1">
                                            <button
                                                onClick={() => navigate(`/deploy/employee-profile/${emp.employee_code}`)}
                                                className="p-2 text-gray-400 hover:text-white hover:bg-[#333] rounded-full transition-all"
                                                aria-label="View Profile"
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}

            </main >
        </div >
    );
}
