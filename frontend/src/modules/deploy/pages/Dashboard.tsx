'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Building2, ArrowRight, Laptop, TrendingUp, Award, UserCheck, MapPin, Clock, GraduationCap, Calendar, Bell } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, LineChart, Line
} from 'recharts';
import StaggeredMenu from '../../../components/navBar';
import Waves from '../../../components/Background/Waves';
import { useIdleTimer } from '../../../core/hooks/useIdleTimer';
import { useAuth } from '../../../core/auth/AuthContext';
import { getMenuItems } from '../utils/menu';
import EmployeeDashboard from '../components/EmployeeDashboard';

export default function DashboardPage() {
    const { user, viewingAsRole, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    useIdleTimer(15 * 60 * 1000); // 15 min idle timeout

    const [statsLoading, setStatsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
            return;
        }

        if (viewingAsRole && viewingAsRole !== 'Employee') {
            fetchStats();
        }
    }, [viewingAsRole, user, authLoading, navigate]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (err) { console.error(err); }
        finally { setStatsLoading(false); }
    };

    if (authLoading || !viewingAsRole) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
    if (!user) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Access Denied. Redirecting...</div>;

    const menuItems = getMenuItems(viewingAsRole || undefined, user?.permissions);

    // --- EMPLOYEE VIEW ---
    if (viewingAsRole === 'Employee') {
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
                <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10">
                    <EmployeeDashboard user={user} />
                </main>
            </div>
        );
    }

    // --- ADMIN / HR VIEW ---
    const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8', '#82ca9d'];
    const STATUS_COLORS = { 'Active': '#00C49F', 'Exited': '#FF8042' };

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

            <main className="mx-auto max-w-7xl p-6 pt-32 relative z-10">
                {/* Header */}
                <div className="mb-12 animate-fade-in-up">
                    <h1 className="text-4xl font-bold mb-2">
                        Welcome back, <span className="text-brand-purple">{user?.name || user?.username || 'Guest'}</span>
                    </h1>
                    <p className="text-gray-400">Here's what's happening in your organization today.</p>
                </div>

                {/* --- 1. KEY METRICS --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-fade-in-up delay-100">
                    <StatCard
                        icon={<Users size={24} />}
                        label="Total Employees"
                        value={statsLoading ? '-' : data?.counts?.total}
                        colorClass="bg-blue-500/10 text-blue-400"
                    />
                    <StatCard
                        icon={<Building2 size={24} />}
                        label="Active Teams"
                        value={statsLoading ? '-' : data?.counts?.teams}
                        colorClass="bg-purple-500/10 text-purple-400"
                    />
                    <StatCard
                        icon={<UserCheck size={24} />}
                        label="Active Count"
                        value={statsLoading ? '-' : data?.counts?.active}
                        colorClass="bg-green-500/10 text-green-400"
                    />
                    <StatCard
                        icon={<Briefcase size={24} />}
                        label="Designations"
                        value={statsLoading ? '-' : data?.counts?.designations}
                        colorClass="bg-orange-500/10 text-orange-400"
                    />
                </div>

                {/* --- 2. ROW 1 CHARTS: Dept & Status --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-in-up delay-200">

                    {/* Department Distribution */}
                    <ChartCard title="Team Distribution" icon={<Users size={18} />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts?.department || []} layout="vertical" margin={{ left: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#999" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20}>
                                    {(data?.charts?.department || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Employment Status */}
                    <ChartCard title="Employment Status" icon={<UserCheck size={18} />}>
                        <div className="flex items-center justify-center h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.charts?.status || []}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(data?.charts?.status || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>

                {/* --- 3. ROW 2 CHARTS: Trends & Skills --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-fade-in-up delay-300">

                    {/* Hiring Trend */}
                    <div className="lg:col-span-2">
                        <ChartCard title="Hiring Trend (Yearly)" icon={<TrendingUp size={18} />}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.charts?.hiring_trend || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="Year" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                    <Line type="monotone" dataKey="Hires" stroke="#8884d8" strokeWidth={3} dot={{ r: 4, fill: '#8884d8' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Top Skills */}
                    <ChartCard title="Top Skills" icon={<Award size={18} />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts?.skills || []} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" stroke="#999" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={15}>
                                    {(data?.charts?.skills || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={'#82ca9d'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* --- 4. ROW 3: Assets & Links --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-fade-in-up delay-400">
                    {/* Asset Status */}
                    <ChartCard title="Asset Inventory" icon={<Laptop size={18} />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.charts?.assets || []}
                                    cx="50%" cy="50%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {(data?.charts?.assets || []).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Returned' ? '#00C49F' : '#FF8042'} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute bottom-4 left-0 w-full text-center text-xs text-gray-500">
                            Assigned vs Returned
                        </div>
                    </ChartCard>

                    {/* Quick Access Link */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-black border border-[#222] rounded-3xl p-8 relative overflow-hidden group flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-purple/10 transition-all duration-500"></div>
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            <h3 className="text-2xl font-bold">Manage Workforce</h3>
                            <p className="text-gray-400 max-w-lg">
                                Jump straight to the employee directory to view profiles, manage teams, or update records.
                            </p>
                            <button
                                onClick={() => navigate('/deploy/employee-directory')}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors transform hover:translate-x-1"
                            >
                                Open Directory <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- 5. ROW 4: Talent Analytics --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 animate-fade-in-up delay-500">
                    {/* Experience Distribution */}
                    <ChartCard title="Experience Distribution" icon={<GraduationCap size={18} />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts?.experience || []} margin={{ bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="range" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="count" fill="#AB63FA" radius={[4, 4, 0, 0]} barSize={40}>
                                    {(data?.charts?.experience || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill="#AB63FA" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Tenure Distribution */}
                    <ChartCard title="Tenure Distribution" icon={<Clock size={18} />}>
                        <div className="mb-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-purple/10 rounded-lg border border-brand-purple/30">
                                <Clock size={16} className="text-brand-purple" />
                                <span className="text-sm text-gray-400">Avg Tenure:</span>
                                <span className="text-lg font-bold text-brand-purple">{data?.counts?.avg_tenure || 0} years</span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={data?.charts?.tenure || []} margin={{ bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="range" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="count" fill="#00C49F" radius={[4, 4, 0, 0]} barSize={40}>
                                    {(data?.charts?.tenure || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill="#00C49F" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>

                {/* --- 6. ROW 5: Location & Recent Hires --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 animate-fade-in-up delay-600">
                    {/* Location Distribution */}
                    <ChartCard title="Location Distribution" icon={<MapPin size={18} />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.charts?.location || []} layout="vertical" margin={{ left: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" stroke="#999" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                                <Bar dataKey="value" fill="#FFBB28" radius={[0, 4, 4, 0]} barSize={20}>
                                    {(data?.charts?.location || []).map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Recent Hires */}
                    <div className="bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl">
                        <h3 className="text-md font-bold mb-4 text-gray-300 flex items-center gap-2">
                            <span className="text-brand-purple"><Calendar size={18} /></span>
                            Recent Hires
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        <th className="text-left py-2 px-2 text-gray-400 font-medium">Name</th>
                                        <th className="text-left py-2 px-2 text-gray-400 font-medium">Team</th>
                                        <th className="text-left py-2 px-2 text-gray-400 font-medium">Role</th>
                                        <th className="text-left py-2 px-2 text-gray-400 font-medium">DOJ</th>
                                        <th className="text-left py-2 px-2 text-gray-400 font-medium">Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data?.recent_hires || []).map((hire: any, idx: number) => (
                                        <tr key={idx} className="border-b border-[#222] hover:bg-[#1a1a1a] transition-colors">
                                            <td className="py-3 px-2 text-white font-medium">{hire.name}</td>
                                            <td className="py-3 px-2 text-gray-400">{hire.team}</td>
                                            <td className="py-3 px-2 text-gray-400">{hire.designation}</td>
                                            <td className="py-3 px-2 text-gray-400">{hire.doj_str}</td>
                                            <td className="py-3 px-2 text-gray-400">{hire.location}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!data?.recent_hires || data.recent_hires.length === 0) && (
                                <div className="text-center py-8 text-gray-500">No recent hires</div>
                            )}
                        </div>
                    </div>
                </div>



            </main>
        </div>
    );
}

// Sub-components for cleaner code
function StatCard({ icon, label, value, colorClass }: any) {
    return (
        <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex items-center gap-4 hover:border-brand-purple/50 transition-colors">
            <div className={`p-3 rounded-lg ${colorClass}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <h3 className="text-2xl font-bold">{value}</h3>
            </div>
        </div>
    );
}

function ChartCard({ title, icon, children }: any) {
    return (
        <div className="bg-[#111] border border-[#222] rounded-3xl p-6 shadow-2xl flex flex-col h-[300px] relative">
            <h3 className="text-md font-bold mb-4 text-gray-300 flex items-center gap-2">
                <span className="text-brand-purple">{icon}</span>
                {title}
            </h3>
            <div className="flex-1 w-full min-h-0">
                {children}
            </div>
        </div>
    );
}
