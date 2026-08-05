import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Edit2, CheckCircle, XCircle, Clock, Calendar, Search, AlertCircle, RefreshCcw, ChevronRight } from 'lucide-react';
import useEscapeClose from '../../../core/hooks/useEscapeClose';

export default function CorrectionSystem({ isManager }) {
    const [windowData, setWindowData] = useState(null);
    const [history, setHistory] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(isManager ? 'queue' : 'window');
    
    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [form, setForm] = useState({ clock_in: '', clock_out: '', reason: '' });
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEscapeClose(() => setDrawerOpen(false), drawerOpen);
    useEscapeClose(() => setSelectedRequest(null), !!selectedRequest);

    const loadData = async () => {
        setLoading(true);
        // Send the browser's local date so the server knows the employee's "today"
        const clientDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        try {
            if (!isManager) {
                const [wRes, hRes] = await Promise.all([
                    fetch(`/api/attendance/correction/window?client_date=${clientDate}`, { credentials: 'include' }),
                    fetch('/api/attendance/correction/my-history', { credentials: 'include' })
                ]);
                if (wRes.ok) setWindowData(await wRes.json());
                if (hRes.ok) setHistory(await hRes.json());
            } else {
                const reqs = await fetch('/api/attendance/correction/pending-requests', { credentials: 'include' });
                if (reqs.ok) setPendingRequests(await reqs.json());
            }
        } catch (e) {
            toast.error("Failed to load correction data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [isManager]);

    const openDrawer = (day) => {
        if (day.track === 'future' || day.track === 'before_join') return;
        if (day.pending_correction) {
            toast.error("You already have a pending request for this date.");
            return;
        }
        setSelectedDay(day);
        setForm({
            clock_in: day.clock_in && day.clock_in !== 'None' ? day.clock_in.substring(0, 5) : '',
            clock_out: day.clock_out && day.clock_out !== 'None' ? day.clock_out.substring(0, 5) : '',
            reason: day.work_log || ''
        });
        setDrawerOpen(true);
    };

    const submitCorrection = async (e) => {
        e.preventDefault();
        const endpoint = selectedDay.track === 'self_service' 
            ? '/api/attendance/correction/self-service'
            : '/api/attendance/correction/request';
            
        const formatTime = (t) => t ? (t.length === 5 ? `${t}:00` : t) : null;
            
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDay.date,
                    clock_in: formatTime(form.clock_in),
                    clock_out: formatTime(form.clock_out),
                    reason: form.reason || 'Daily Attendance Log',
                    client_date: new Date().toLocaleDateString('en-CA')
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Submission failed");
            
            toast.success(data.message);
            setDrawerOpen(false);
            loadData();
        } catch (e) {
            toast.error(e.message);
        }
    };

    const actionRequest = async (id, action) => {
        try {
            const res = await fetch(`/api/attendance/correction/request/${id}/action`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, rejection_reason: rejectionReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Action failed");
            
            toast.success(data.message);
            setSelectedRequest(null);
            setRejectionReason('');
            loadData();
        } catch (e) {
            toast.error(e.message);
        }
    };

    if (loading) return <div className="p-8 text-center text-[#8b8ba3] text-[10px] uppercase font-black tracking-widest animate-pulse">Loading Attendance Data...</div>;

    const renderGrid = () => {
        if (!windowData) return null;
        
        // Group days by week (7 days each)
        const weeks = [];
        for (let i = 0; i < windowData.days.length; i += 7) {
            weeks.push(windowData.days.slice(i, i + 7));
        }
        
        // Reverse so the current week is at the top
        const reversedWeeks = [...weeks].reverse();

        const getStatusColor = (status, track, pending, isToday) => {
            if (pending) return 'bg-amber-100 border-amber-300 text-amber-700';
            if (track === 'future' || track === 'before_join') return 'bg-gray-50 border-gray-200 text-gray-400 opacity-60';
            if (status === 'Present') return 'bg-emerald-50 border-emerald-200 text-emerald-700';
            if (status === 'Absent' || status === 'Missing Clock-Out') return 'bg-red-50 border-red-200 text-red-700';
            if (status.includes('Half Day')) return 'bg-orange-50 border-orange-200 text-orange-700';
            if (isToday && (status === 'Active' || status === 'No Record')) return 'bg-purple-50/50 border-purple-200 text-purple-900';
            return 'bg-white border-gray-200 text-gray-700';
        };

        const renderWeek = (title, days) => (
            <div className="mb-8" key={title}>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b8ba3] mb-4 pl-2">{title}</h4>
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    {days.map(d => {
                        if (d.track === 'before_join') return <div key={d.date} className="p-3"></div>;
                        const isToday = d.date === windowData.today;
                        return (
                        <div 
                            key={d.date} 
                            onClick={() => {
                                if (d.track !== 'future' && d.track !== 'before_join') openDrawer(d);
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${getStatusColor(d.status, d.track, !!d.pending_correction, isToday)} ${d.track !== 'future' && d.track !== 'before_join' && !d.pending_correction ? 'hover:shadow-md hover:scale-105' : 'cursor-not-allowed'} ${isToday ? 'ring-2 ring-[#8b5cf6] shadow-md' : ''}`}
                        >
                            {d.track === 'self_service' && !d.pending_correction && (
                                <div className="absolute -top-2 -right-2 bg-[#8b5cf6] text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    <Edit2 size={10} />
                                </div>
                            )}
                            {d.track === 'requested' && !d.pending_correction && (
                                <div className="absolute -top-2 -right-2 bg-gray-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                    <AlertCircle size={10} />
                                </div>
                            )}
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1 flex justify-between items-center">
                                <span>{d.weekday.substring(0,3)}</span>
                                {isToday && <span className="text-[#8b5cf6] font-extrabold not-italic">(TODAY)</span>}
                            </p>
                            <p className="text-xs font-bold mb-2">{d.date.split('-')[2]}</p>
                            
                            <div className="text-[9px] font-mono leading-tight opacity-80 h-6">
                                {d.clock_in && d.clock_in !== 'None' ? <span>In: {d.clock_in.substring(0,5)}</span> : <span>--:--</span>}<br/>
                                {d.clock_out && d.clock_out !== 'None' ? <span>Out: {d.clock_out.substring(0,5)}</span> : <span>--:--</span>}
                            </div>
                            
                            <div className="mt-3 text-[8px] font-black uppercase tracking-widest text-center py-1 rounded bg-black/5">
                                {d.pending_correction ? 'Pending' : d.status}
                            </div>
                        </div>
                        );
                    })}
                </div>
            </div>
        );

        return (
            <div className="bg-white border border-[#ebe4ff] rounded-[2rem] p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">Daily Attendance Grid</h3>
                        <p className="text-[10px] text-[#8b8ba3] uppercase font-bold mt-1">Click any active day to log attendance or update record</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#6b7280]">
                            <div className="w-2 h-2 rounded-full bg-[#8b5cf6]"></div> Self-Service Window (Current & Previous Week)
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#6b7280]">
                            <div className="w-2 h-2 rounded-full bg-gray-600"></div> Manager Approval
                        </div>
                    </div>
                </div>
                <div className="max-h-[600px] overflow-y-auto pr-2 pb-4">
                    {reversedWeeks.map((weekDays, index) => {
                        // If every day in this week is before joining, do not render the week at all
                        if (weekDays.every(d => d.track === 'before_join')) return null;

                        let title = "Week of " + weekDays[0].date;
                        if (index === 0) title = "Current Week (Self-Service)";
                        else if (index === 1) title = "Previous Week (Self-Service)";
                        
                        return renderWeek(title, weekDays);
                    })}
                </div>
            </div>
        );
    };

    const renderHistory = () => (
        <div className="bg-white border border-[#ebe4ff] rounded-[2rem] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#ece2ff] bg-[#f5efff]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7280]">My Attendance & Correction History</h3>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-[#ece2ff]">
                {history.length === 0 ? (
                    <p className="p-10 text-center text-[9px] uppercase font-black text-[#b6b6c7]">No history</p>
                ) : history.map(h => (
                    <div key={h.id} className="p-5 flex justify-between items-center hover:bg-[#faf7ff]">
                        <div>
                            <p className="text-xs font-bold text-black">{h.date} <span className="text-[9px] text-[#8b8ba3] font-mono tracking-widest uppercase ml-2">({(h.correction_track || 'requested').replace('_', ' ')})</span></p>
                            <p className="text-[10px] text-[#6b7280] mt-1">{h.reason}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                             <span className={`px-3 py-1 rounded text-[8px] font-black uppercase ${
                                h.status === 'Applied' || h.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                h.status === 'Rejected' || h.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                             }`}>{h.status}</span>
                             <span className="text-[9px] font-mono text-[#8b8ba3]">{h.clock_in || '--'} → {h.clock_out || '--'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderManagerQueue = () => (
        <div className="bg-white border border-[#ebe4ff] rounded-[2rem] overflow-hidden">
             <div className="px-6 py-5 border-b border-[#ece2ff] bg-[#f5efff]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b7280]">Requested Corrections Queue</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[720px]">
                    <thead className="border-b border-[#ece2ff]">
                        <tr>
                            {['Employee', 'Manager', 'Date', 'Requested Times', 'Reason', 'Action'].map(h => (
                                <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-[#8b8ba3]">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ece2ff]">
                        {pendingRequests.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-[9px] uppercase font-black text-[#b6b6c7]">Queue is empty</td></tr>
                        ) : pendingRequests.map(req => (
                            <tr key={req.id} className="hover:bg-[#faf7ff]">
                                <td className="px-6 py-4 font-bold text-xs uppercase italic">{req.employee_name} <br/><span className="text-[9px] font-mono text-[#8b8ba3] not-italic">{req.employee_code}</span></td>
                                <td className="px-6 py-4 text-xs font-bold text-[#8b8ba3] uppercase italic">{req.manager_name || 'N/A'}</td>
                                <td className="px-6 py-4 text-xs font-mono">{req.date}</td>
                                <td className="px-6 py-4 text-xs font-mono">{req.clock_in || '--'} → {req.clock_out || '--'}</td>
                                <td className="px-6 py-4 text-[10px] text-[#6b7280] max-w-[200px] truncate">{req.reason}</td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => actionRequest(req.id, 'Approved')} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><CheckCircle size={14}/></button>
                                        <button onClick={() => setSelectedRequest(req)} className="p-2 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all"><XCircle size={14}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {!isManager && (
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setActiveTab('window')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'window' ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg shadow-transparent' : 'bg-[#f5efff] text-[#6b7280] border border-[#ece2ff]'}`}>Attendance Grid</button>
                    <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white shadow-lg shadow-transparent' : 'bg-[#f5efff] text-[#6b7280] border border-[#ece2ff]'}`}>Log History</button>
                </div>
            )}

            {!isManager && activeTab === 'window' && renderGrid()}
            {!isManager && activeTab === 'history' && renderHistory()}
            {isManager && renderManagerQueue()}

            {/* Slide-in Drawer */}
            <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                <div className={`absolute top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl transition-transform duration-300 transform ${drawerOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                    <div className="p-6 border-b border-[#ece2ff] bg-[#faf7ff] flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black">{selectedDay?.date === windowData?.today ? 'Log Today\'s Attendance' : 'Update Attendance'}</h3>
                            <p className="text-[10px] text-[#8b8ba3] font-mono tracking-widest uppercase mt-1">{selectedDay?.date}</p>
                        </div>
                        <button onClick={() => setDrawerOpen(false)} className="p-2 text-[#8b8ba3] hover:text-black bg-white rounded-full border border-[#ece2ff]"><ChevronRight size={16} /></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                        {selectedDay && (
                            <div className={`p-4 rounded-xl mb-6 border flex items-start gap-3 ${selectedDay.track === 'self_service' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                                {selectedDay.track === 'self_service' ? <RefreshCcw size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">{selectedDay.track === 'self_service' ? 'Self-Service Window Active' : 'Manager Approval Required'}</p>
                                    <p className="text-xs opacity-80">
                                        {selectedDay.track === 'self_service' 
                                            ? "You are within the self-service period (Current & Previous Week). Your attendance will be logged immediately without manager approval." 
                                            : "This date is outside the self-service window. Your correction will be routed to your manager for approval."}
                                    </p>
                                </div>
                            </div>
                        )}

                        <form onSubmit={submitCorrection} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Time In</label>
                                    <input 
                                        type="time" 
                                        value={form.clock_in}
                                        onChange={e => setForm({...form, clock_in: e.target.value})}
                                        className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Time Out</label>
                                    <input 
                                        type="time" 
                                        value={form.clock_out}
                                        onChange={e => setForm({...form, clock_out: e.target.value})}
                                        className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] font-mono"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[#8b5cf6] mb-2 block ml-1">Work Log / Reason <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows="4"
                                    placeholder="Describe your daily work summary or reason for updating..."
                                    value={form.reason}
                                    onChange={e => setForm({...form, reason: e.target.value})}
                                    className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none focus:border-[#d4b5fd] resize-none"
                                />
                            </div>

                            <button type="submit" className="w-full py-4 mt-4 rounded-2xl bg-gradient-to-r from-[#c084fc] to-[#8b5cf6] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:opacity-90">
                                {selectedDay?.date === windowData?.today ? 'Save Today\'s Attendance' : (selectedDay?.track === 'self_service' ? 'Save Attendance Log' : 'Submit Approval Request')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Rejection Modal for Manager */}
            {selectedRequest && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                 <div className="absolute inset-0 bg-[#060b19]/80 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
                 <div className="bg-white border border-[#ebe4ff] rounded-[2rem] shadow-2xl w-full max-w-md relative z-10 p-8 space-y-6">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-500">Reject Correction</h3>
                    <textarea 
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (optional)"
                        className="w-full bg-[#faf7ff] border border-[#ebe4ff] text-black text-xs px-4 py-4 rounded-xl focus:outline-none h-24 resize-none"
                    />
                    <button onClick={() => actionRequest(selectedRequest.id, 'Rejected')} className="w-full py-4 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600">
                        Confirm Rejection
                    </button>
                 </div>
             </div>
            )}
        </div>
    );
}
