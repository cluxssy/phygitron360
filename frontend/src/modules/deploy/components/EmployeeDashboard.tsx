import { useState, useEffect } from 'react';
import { Target, BookOpen, Laptop, Bell, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard({ user }: { user: any }) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard/employee-stats', { credentials: 'include' });
            if (res.ok) {
                const json = await res.json();
                setStats(json);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;
    if (loading) return <div className="text-center text-gray-500 py-12">Loading dashboard...</div>;

    const kras = stats?.kras || { total: 0, completed: 0 };
    const training = stats?.training || { total: 0, completed: 0 };
    const assets = stats?.assets || { total: 0 };
    const notifications = stats?.notifications || [];

    // Calculate completion percentages
    const kraPercent = kras.total > 0 ? Math.round((kras.completed / kras.total) * 100) : 0;
    const trainingPercent = training.total > 0 ? Math.round((training.completed / training.total) * 100) : 0;

    return (
        <div className="animate-fade-in-up space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2">
                        Hello, <span className="text-brand-purple">{user.name || user.username}</span>
                    </h1>
                    <p className="text-gray-400">
                        {stats?.employee?.designation ? `${stats.employee.designation} • ` : ''}
                        {stats?.employee?.team || 'Team Member'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link to={`/deploy/employee-profile/${user.employee_code}`} className="px-4 py-2 bg-[#222] hover:bg-[#333] border border-[#333] rounded-lg text-white font-medium transition-colors">
                        View Profile
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* 1. Attendance Today */}
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl relative overflow-hidden group hover:border-brand-purple/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${stats?.attendance?.status === 'Present' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                <Clock size={24} />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-1">Today's Status</h3>
                        <p className={`text-2xl font-bold ${stats?.attendance?.status === 'Present' ? 'text-green-400' : 'text-gray-400'}`}>
                            {stats?.attendance?.status || 'Absent'}
                        </p>
                        <Link to="/deploy/attendance" className="mt-4 inline-flex items-center text-sm text-gray-500 hover:text-white transition-colors">
                            Manage Attendance <ArrowRight size={14} className="ml-1" />
                        </Link>
                    </div>
                </div>

                {/* 2. Performance / KRAs */}
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Target size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <Target size={24} />
                            </div>
                            <span className="text-2xl font-bold">{kraPercent}%</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">Performance</h3>
                        <div className="w-full bg-[#222] rounded-full h-1.5 mt-2 mb-2">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${kraPercent}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{kras.completed}/{kras.total} KRAs Completed</p>
                    </div>
                </div>

                {/* 3. Training */}
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BookOpen size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                <BookOpen size={24} />
                            </div>
                            <span className="text-2xl font-bold">{trainingPercent}%</span>
                        </div>
                        <h3 className="text-lg font-bold mb-1">Training</h3>
                        <div className="w-full bg-[#222] rounded-full h-1.5 mt-2 mb-2">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${trainingPercent}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-500">{training.completed}/{training.total} Modules Done</p>
                    </div>
                </div>

                {/* 4. Leave Balance (Sick/Casual) */}
                <div className="bg-[#111] border border-[#222] p-6 rounded-3xl relative overflow-hidden group hover:border-orange-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle size={80} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400">
                                <CheckCircle size={24} />
                            </div>
                        </div>
                        <h3 className="text-lg font-bold mb-2">Leave Balance</h3>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Sick</span>
                            <span className="text-white font-bold">{stats?.leaves?.sick_total - stats?.leaves?.sick_used}/{stats?.leaves?.sick_total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Casual</span>
                            <span className="text-white font-bold">{stats?.leaves?.casual_total - stats?.leaves?.casual_used}/{stats?.leaves?.casual_total}</span>
                        </div>
                        <Link to="/deploy/attendance" className="mt-4 block text-xs text-orange-400 hover:text-orange-300">
                            Apply for Leave →
                        </Link>
                    </div>
                </div>

            </div>

            {/* Help & Support Section */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-black border border-[#222] rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="max-w-xl">
                    <h3 className="text-2xl font-bold mb-4">Need Help?</h3>
                    <p className="text-gray-400">
                        Contact HR for any queries regarding your employment, leaves, or assets. 
                        We're here to support your growth in the organization.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button className="py-3 px-6 bg-[#222] hover:bg-[#333] border border-[#333] rounded-xl flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple">?</div>
                        <span className="font-medium">Raise a Ticket</span>
                    </button>
                    <button className="py-3 px-6 bg-[#222] hover:bg-[#333] border border-[#333] rounded-xl flex items-center gap-3 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-brand-purple/20 flex items-center justify-center text-brand-purple">@</div>
                        <span className="font-medium">Support</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
