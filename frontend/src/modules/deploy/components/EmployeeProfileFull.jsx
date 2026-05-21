import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mail, Phone, MapPin, Briefcase, Calendar, 
  ShieldCheck, FileText, User, ChevronRight,
  TrendingUp, Award, Clock, ArrowLeft, Download,
  ExternalLink, Building, Landmark, GraduationCap,
  Save, Edit3, Image, Upload, Trash2, Package, CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import HasPermission from '../../../components/common/HasPermission';

export default function EmployeeProfileFull({ employeeCode: initialCode, onBack }) {
    const [employeeCode, setEmployeeCode] = useState(initialCode);
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({});
    const [assets, setAssets] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputPfp = useRef();
    const fileInputCv = useRef();
    const fileInputId = useRef();

    const fetchDetails = async (code) => {
        try {
            setLoading(true);
            const res = await fetch(`/api/employee/${code}`, { credentials: 'include' });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setDetails(data);
            setFormData({
                ...data,
                primary_skillset: data.skill_matrix?.primary_skillset || '',
                secondary_skillset: data.skill_matrix?.secondary_skillset || '',
                experience_years: data.skill_matrix?.experience_years || '0'
            });
        } catch {
            toast.error('Failed to load personnel dossier');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeCode) {
            fetchDetails(employeeCode);
            fetch(`/api/assets/${employeeCode}`, { credentials: 'include' })
                .then(r => r.json()).then(d => setAssets(d)).catch(() => {});
        }
    }, [employeeCode]);

    if (loading && !details) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Decrypting Neural Dossier...</p>
            </div>
        );
    }

    if (!details) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/employee/${details.employee_code}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.detail || 'Update failed');
            
            toast.success('Dossier updated successfully');
            setEditMode(false);
            if (formData.employee_code !== details.employee_code) {
                setEmployeeCode(formData.employee_code);
            } else {
                fetchDetails(details.employee_code);
            }
        } catch (e) {
            toast.error(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (type, file) => {
        if (!file) return;
        const fd = new FormData();
        if (type === 'pfp') fd.append('photo_file', file);
        if (type === 'cv') fd.append('cv_file', file);
        if (type === 'id') fd.append('id_proof_file', file);

        try {
            toast.loading('Uploading artifact...', { id: 'upload' });
            const res = await fetch(`/api/employee/${details.employee_code}/documents`, {
                method: 'POST',
                credentials: 'include',
                body: fd
            });
            if (!res.ok) throw new Error('Upload failed');
            toast.success('Artifact synchronized', { id: 'upload' });
            fetchDetails(details.employee_code);
        } catch {
            toast.error('Upload failed', { id: 'upload' });
        }
    };

    const handleOffboard = async () => {
        const exitDate = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(`/api/employee/${details.employee_code}/offboard`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exit_date: exitDate, exit_reason: 'Administrative Exit', exit_type: 'Immediate' })
            });
            if (res.ok) {
                toast.success("Personnel decoupled successfully");
                window.location.reload();
            }
        } catch {
            toast.error("Decoupling failed");
        }
    };

    return (
        <div className="w-full space-y-6 animate-fade-in pb-10">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-[#f7f3ff] p-4 rounded-2xl border border-[#ebe7ff]">
                <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-all">
                    <ArrowLeft size={14} /> Back to Nexus
                </button>
                <div className="flex gap-3">
                    {editMode ? (
                        <>
                            <button 
                                onClick={() => setEditMode(false)}
                                className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-black/40 hover:bg-[#f7f3ff] transition-all"
                            >
                                Abort
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-8 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20"
                            >
                                {isSaving ? 'Syncing...' : <><Save size={14} /> Synchronize Profile</>}
                            </button>
                        </>
                    ) : (
                        <HasPermission permission="deploy.employees.edit">
                            <button 
                                onClick={() => setEditMode(true)}
                                className="flex items-center gap-2 px-8 py-2 bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-[#ece4ff] text-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-black transition-all"
                            >
                                <Edit3 size={14} /> Modify Dossier
                            </button>
                        </HasPermission>
                    )}
                </div>
            </div>

            {/* Header / Hero Section */}
            <div
            className="
                bg-white
                border
                border-[#ece4ff]
                rounded-[2rem]
                p-7
                relative
                overflow-hidden
                shadow-[0_10px_40px_rgba(180,140,255,0.08)]
            "
            >
                
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-display font-black text-5xl shrink-0 shadow-2xl shadow-primary/10 overflow-hidden">
                            {details.photo_path ? (
                                <img src={`/${details.photo_path}`} className="w-full h-full object-cover" alt="" />
                            ) : (
                                details.name?.[0]
                            )}
                        </div>
                        {editMode && (
                            <button 
                                onClick={() => fileInputPfp.current.click()}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1 rounded-3xl text-black text-[9px] font-black uppercase tracking-widest"
                            >
                                <Image size={18} /> Update PFP
                            </button>
                        )}
                        <input type="file" ref={fileInputPfp} hidden accept="image/*" onChange={e => handleFileUpload('pfp', e.target.files[0])} />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col gap-2">
                            {editMode ? (
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    className="text-4xl font-display font-black text-black uppercase tracking-tighter italic bg-[#f7f3ff] border border-[#ece4ff] rounded-xl px-4 py-1 focus:outline-none focus:border-primary w-full"
                                />
                            ) : (
                                <div className="flex items-center gap-4">
                                    <h2 className="text-4xl font-display font-black text-black uppercase tracking-tighter italic">{details.name}</h2>
                                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        details.employment_status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {details.employment_status || 'Active'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            {editMode ? (
                                <>
                                    <input 
                                        type="text" 
                                        placeholder="Designation"
                                        value={formData.designation}
                                        onChange={e => setFormData({...formData, designation: e.target.value})}
                                        className="bg-[#f7f3ff] border border-[#ece4ff] rounded-lg px-4 py-1.5 text-xs text-primary font-bold uppercase tracking-widest focus:outline-none"
                                    />
                                    <span className="text-black/20">//</span>
                                    <input 
                                        type="text" 
                                        placeholder="Team"
                                        value={formData.team}
                                        onChange={e => setFormData({...formData, team: e.target.value})}
                                        className="bg-[#f7f3ff] border border-[#ece4ff] rounded-lg px-4 py-1.5 text-xs text-black/50 font-bold uppercase tracking-widest focus:outline-none"
                                    />
                                </>
                            ) : (
                                <p className="text-primary font-black text-sm uppercase tracking-[0.3em] flex items-center gap-2">
                                     {details.designation} <span className="text-black/20">//</span> {details.team}
                                </p>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
                            <EditMetaItem 
                                editMode={editMode} 
                                icon={Mail} 
                                label="Email Access" 
                                value={formData.email_id} 
                                onChange={v => setFormData({...formData, email_id: v})}
                            />
                            <EditMetaItem 
                                editMode={editMode} 
                                icon={Phone} 
                                label="Neural Link" 
                                value={formData.contact_number} 
                                onChange={v => setFormData({...formData, contact_number: v})}
                            />
                            <EditMetaItem 
                                editMode={editMode} 
                                icon={MapPin} 
                                label="Geo Anchor" 
                                value={formData.location} 
                                onChange={v => setFormData({...formData, location: v})}
                            />
                            <EditMetaItem 
                                editMode={editMode} 
                                icon={Briefcase} 
                                label="Operation Code" 
                                value={formData.employee_code} 
                                onChange={v => setFormData({...formData, employee_code: v})}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Core Dossier */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Personnel Statistics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <EditStatCard label="Tenure (DOJ)" value={formData.doj} sub="Joined Date" type="date" editMode={editMode} onChange={v => setFormData({...formData, doj: v})} />
                        <EditStatCard label="Contract" value={formData.employment_type} sub="Engagement Mode" editMode={editMode} onChange={v => setFormData({...formData, employment_type: v})} />
                        <EditStatCard label="Experience" value={formData.experience_years} sub="Neural Depth" type="number" editMode={editMode} onChange={v => setFormData({...formData, experience_years: v})} />
                        <EditStatCard label="Manager" value={formData.reporting_manager} sub="Reporting Hub" editMode={editMode} onChange={v => setFormData({...formData, reporting_manager: v})} />
                    </div>

                    {/* Skill Synergy */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-8 border-[#ebe7ff]">
                        <SectionHeader icon={TrendingUp} title="Neural Skill Matrix" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 italic">Primary Vector Nodes</p>
                                {editMode ? (
                                    <textarea 
                                        value={formData.primary_skillset}
                                        onChange={e => setFormData({...formData, primary_skillset: e.target.value})}
                                        className="w-full bg-[#f7f3ff] border border-[#ece4ff] rounded-xl p-4 text-xs text-black focus:outline-none focus:border-primary"
                                        rows={3}
                                        placeholder="Comma separated skills..."
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(details.skill_matrix?.primary_skillset || '').split(',').map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-bold uppercase rounded-lg border border-primary/10">
                                                {s.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-4 italic">Auxiliary Capability Blocks</p>
                                {editMode ? (
                                    <textarea 
                                        value={formData.secondary_skillset}
                                        onChange={e => setFormData({...formData, secondary_skillset: e.target.value})}
                                        className="w-full bg-[#f7f3ff] border border-[#ece4ff] rounded-xl p-4 text-xs text-black focus:outline-none focus:border-[#d8ccff]"
                                        rows={3}
                                        placeholder="Comma separated skills..."
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(details.skill_matrix?.secondary_skillset || '').split(',').map((s, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-[#f7f3ff] text-black/50 text-[10px] font-bold uppercase rounded-lg border border-[#ebe7ff]">
                                                {s.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Education Logs */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-8 border-[#ebe7ff]">
                        <SectionHeader icon={GraduationCap} title="Academic Foundation Blocks" />
                        <div className="mt-6 space-y-4">
                            {editMode ? (
                                <div className="space-y-4">
                                     <textarea 
                                        value={typeof formData.education_details === 'string' ? formData.education_details : JSON.stringify(formData.education_details, null, 2)}
                                        onChange={e => setFormData({...formData, education_details: e.target.value})}
                                        className="w-full font-mono bg-[#f7f3ff] border border-[#ece4ff] rounded-xl p-6 text-[10px] text-black focus:outline-none"
                                        rows={10}
                                        placeholder="[ { 'degree': '...', 'university': '...', 'year': '...' } ]"
                                    />
                                    <p className="text-[8px] uppercase font-black text-black/20 tracking-tighter">Enter educational history in JSON sequence protocol</p>
                                </div>
                            ) : (
                                (() => {
                                    let edu = details.education_details;
                                    try { if (typeof edu === 'string') edu = JSON.parse(edu); } catch { return null; }
                                    
                                    if (Array.isArray(edu) && edu.length > 0) {
                                        return edu.map((e, i) => (
                                            <div key={i} className="flex gap-6 items-start p-6 bg-[#f7f3ff] rounded-2xl border border-[#ebe7ff] hover:bg-[#faf7ff] transition-all group">
                                                <div className="w-12 h-12 rounded-xl bg-[#f7f3ff] flex items-center justify-center text-black/30 shrink-0 group-hover:text-primary transition-colors">
                                                    <Landmark size={20} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="text-black font-bold text-sm uppercase">{e.degree}</h4>
                                                        <span className="text-xs font-black text-primary font-mono">{e.year}</span>
                                                    </div>
                                                    <p className="text-xs text-black/40 mt-1 uppercase tracking-widest">{e.university}</p>
                                                </div>
                                            </div>
                                        ));
                                    }
                                    return <p className="text-xs text-black/20 italic text-center py-4">No academic history detected.</p>;
                                })()
                            )}
                        </div>
                    </div>

                    {/* Detailed Allocation Protocol List (Relocated) */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] border-primary/10 bg-primary/5 overflow-hidden">
                        <div className="p-6 border-b border-[#ebe7ff] bg-primary/10 flex items-center justify-between">
                            <SectionHeader icon={Package} title="Allocation & Lifecycle Matrix" />
                        </div>
                        
                        <div className="p-2 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {/* Onboarding Section */}
                            <div className="space-y-1">
                                <div className="px-4 py-2 bg-[#f7f3ff] rounded-lg mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 italic">I. Onboarding Protocol</p>
                                </div>
                                {[
                                    { key: 'ob_laptop', label: 'Laptop Unit' },
                                    { key: 'ob_laptop_bag', label: 'Laptop Bag' },
                                    { key: 'ob_headphones', label: 'Headphones' },
                                    { key: 'ob_mouse', label: 'External Mouse' },
                                    { key: 'ob_id_card', label: 'Identity Card' },
                                    { key: 'ob_email_access', label: 'Email Node' },
                                    { key: 'ob_groups', label: 'Group Access' },
                                    { key: 'ob_mediclaim', label: 'Mediclaim' },
                                    { key: 'ob_pf', label: 'Provident Fund' }
                                ].map(a => (
                                    <div key={a.key} className="flex items-center justify-between p-3 px-6 hover:bg-[#f7f3ff] transition-colors border-b border-[#ebe7ff] last:border-0 group">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">{a.label}</span>
                                        {assets?.[a.key] ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[8px] font-black uppercase border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                <CheckCircle size={8} /> Allocated
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-[#f7f3ff] text-black/20 rounded-full text-[8px] font-black uppercase border border-[#ebe7ff]">
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Clearance Section */}
                            <div className="space-y-1 pt-4">
                                <div className="px-4 py-2 bg-[#f7f3ff] rounded-lg mb-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 italic">II. Clearance Protocol</p>
                                </div>
                                {[
                                    { key: 'cl_laptop', label: 'Laptop Returned' },
                                    { key: 'cl_laptop_bag', label: 'Bag Returned' },
                                    { key: 'cl_assets_verified', label: 'Assets Verified' },
                                    { key: 'cl_id_card', label: 'ID Surrendered' },
                                    { key: 'cl_email_disabled', label: 'Email Disabled' },
                                    { key: 'cl_groups_removed', label: 'Access Purged' },
                                    { key: 'cl_accounts_clearance', label: 'Finance Cleared' }
                                ].map(a => (
                                    <div key={a.key} className="flex items-center justify-between p-3 px-6 hover:bg-[#f7f3ff] transition-colors border-b border-[#ebe7ff] last:border-0 group">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">{a.label}</span>
                                        {assets?.[a.key] ? (
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                                <CheckCircle size={8} /> Cleared
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-[#f7f3ff] text-black/20 rounded-full text-[8px] font-black uppercase border border-[#ebe7ff]">
                                                In Use
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 bg-black/20">
                            <button 
                                onClick={() => window.location.href = `/deploy?tab=allocations&code=${details.employee_code}`}
                                className="w-full py-3 px-4 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-[0.2em] hover:bg-primary hover:text-black hover:scale-[1.02] transition-all"
                            >
                                Open Deployment Command
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Physical Mapping */}
                <div className="space-y-8">
                    {/* Geographic Anchors */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-8 border-[#ebe7ff]">
                        <SectionHeader icon={Landmark} title="Geographic Anchor Points" />
                        <div className="mt-6 space-y-6">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 mb-2">Primary Operation Base</p>
                                {editMode ? (
                                    <textarea 
                                        value={formData.current_address}
                                        onChange={e => setFormData({...formData, current_address: e.target.value})}
                                        className="w-full bg-[#f7f3ff] border border-[#ece4ff] rounded-xl p-4 text-xs text-black focus:outline-none"
                                        rows={2}
                                    />
                                ) : (
                                    <p className="text-xs text-black leading-relaxed bg-[#f7f3ff] p-4 rounded-xl border border-[#ebe7ff]">{details.current_address || 'Unregistered'}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-black/30 mb-2">Permanent Identity Anchor</p>
                                {editMode ? (
                                    <textarea 
                                        value={formData.permanent_address}
                                        onChange={e => setFormData({...formData, permanent_address: e.target.value})}
                                        className="w-full bg-[#f7f3ff] border border-[#ece4ff] rounded-xl p-4 text-xs text-black focus:outline-none"
                                        rows={2}
                                    />
                                ) : (
                                    <p className="text-xs text-black leading-relaxed bg-[#f7f3ff] p-4 rounded-xl border border-[#ebe7ff]">{details.permanent_address || 'Matches Primary'}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Identity Artifacts (Files) */}
                    <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-8 border-[#ebe7ff]">
                        <SectionHeader icon={FileText} title="Identity Artifacts" />
                        <div className="mt-6 space-y-3">
                            <FileCard editMode={editMode} label="Neural Dossier (CV)" path={details.cv_path} onUpload={() => fileInputCv.current.click()} />
                            <FileCard editMode={editMode} label="Identity Visual (Photo)" path={details.photo_path} onUpload={() => fileInputPfp.current.click()} />
                            <FileCard editMode={editMode} label="Compliance ID Proof" path={details.id_proofs} onUpload={() => fileInputId.current.click()} />
                        </div>
                        <input type="file" ref={fileInputCv} hidden accept=".pdf,.doc,.docx" onChange={e => handleFileUpload('cv', e.target.files[0])} />
                        <input type="file" ref={fileInputId} hidden accept="image/*,.pdf" onChange={e => handleFileUpload('id', e.target.files[0])} />
                    </div>

                    {/* Management Access (Dangerous Area) */}
                    {!editMode && (
                        <HasPermission permission="deploy.employees.offboard">
                            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-8 border-red-500/10 bg-red-500/5">
                                <SectionHeader icon={ShieldCheck} title="Dossier Termination" />
                                <div className="mt-6">
                                    {details.employment_status === 'Active' ? (
                                        <button 
                                            onClick={() => {
                                                if (window.confirm("ARE YOU SURE? This initiates the neural decoupling sequence for this personnel.")) {
                                                    handleOffboard();
                                                }
                                            }}
                                            className="w-full py-4 rounded-2xl bg-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] border border-red-500/30 hover:bg-red-500 hover:text-black transition-all shadow-xl shadow-red-500/10"
                                        >
                                            Initiate Offboarding
                                        </button>
                                    ) : (
                                        <div className="text-center p-4 border border-red-500/30 rounded-2xl">
                                            <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">Personnel Status: Decoupled</p>
                                            <p className="text-[8px] text-red-400/40 uppercase tracking-widest mt-1">Exit Date: {details.exit_date || 'N/A'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </HasPermission>
                    )}
                </div>
            </div>
        </div>
    );
}

function EditMetaItem({ editMode, icon: Icon, label, value, onChange }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-black/30 flex items-center gap-2">
                <Icon size={10} /> {label}
            </p>
            {editMode ? (
                <input 
                    type="text" 
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-[#f7f3ff] border border-[#ece4ff] rounded-lg px-3 py-1 text-xs text-black focus:outline-none focus:border-primary"
                />
            ) : (
                <p className="text-xs text-black font-bold truncate">{value || 'Unknown'}</p>
            )}
        </div>
    );
}

function EditStatCard({ label, value, sub, editMode, onChange, type = "text" }) {
    return (
        <div className={`bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgba(180,140,255,0.08)] p-6 border-[#ebe7ff] ${editMode ? 'ring-1 ring-primary/20' : ''}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-black/30 mb-1">{label}</p>
            {editMode ? (
                <input 
                    type={type}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-[#f3f0ff] border border-[#ece4ff] rounded-lg px-2 py-1 text-xs text-black font-black uppercase"
                />
            ) : (
                <p className="text-lg font-display font-black text-black uppercase truncate">{value || '—'}</p>
            )}
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/40 mt-1">{sub}</p>
        </div>
    );
}

function SectionHeader({ icon: Icon, title }) {
    return (
        <div className="flex items-center gap-3 border-b border-[#ebe7ff] pb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Icon size={14} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black">{title}</h3>
        </div>
    );
}

function FileCard({ label, path, editMode, onUpload }) {
    return (
        <div className="flex items-center justify-between p-4 bg-[#f7f3ff] rounded-xl border border-[#ebe7ff] group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
                <FileText size={16} className="text-black/20 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black/40 group-hover:text-black transition-colors">{label}</span>
            </div>
            <div className="flex gap-2">
                {path && (
                    <a href={`/${path}`} target="_blank" rel="noreferrer" className="p-2 bg-[#f7f3ff] rounded-lg text-primary hover:bg-primary hover:text-black transition-all">
                        <ExternalLink size={12} />
                    </a>
                )}
                {editMode && (
                    <button onClick={onUpload} className="p-2 bg-[#f7f3ff] rounded-lg text-black/40 hover:bg-[#f3f0ff] hover:text-black transition-all">
                        <Upload size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}

function ComplianceRow({ label, active, editMode, onToggle }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#6b7280]">{label}</span>
            <button 
                disabled={!editMode}
                onClick={onToggle}
                className={`w-8 h-4 rounded-full relative transition-all ${active ? 'bg-primary' : 'bg-[#f3f0ff]'} ${!editMode ? 'opacity-50' : 'cursor-pointer'}`}
            >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${active ? 'right-0.5' : 'left-0.5'}`} />
            </button>
        </div>
    );
}
