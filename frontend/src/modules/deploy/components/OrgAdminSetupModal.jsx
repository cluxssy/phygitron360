import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Shield, MapPin, Phone, Calendar, ArrowRight, 
  Upload, CheckCircle, GraduationCap, Plus, Trash2, 
  UserPlus, Info, Zap, Command, ShieldCheck 
} from 'lucide-react';

export default function OrgAdminSetupModal({ user, onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    
    // Form states (Mirroring OnboardPage.jsx)
    const [form, setForm] = useState({
        dob: '',
        contact_number: '',
        emergency_contact: '',
        current_address: '',
        permanent_address: '',
        location: '',
        primary_skills: 'System Administration, Strategic Planning',
        secondary_skills: 'Enterprise Orchestration'
    });

    const [educationList, setEducationList] = useState([
        { degree: '', university: '', year: '', percentage: '' }
    ]);
    
    const [files, setFiles] = useState({ photo_file: null, cv_file: null, id_proof_file: null });
    const [sameAsCurrent, setSameAsCurrent] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'current_address' && sameAsCurrent) {
                updated.permanent_address = value;
            }
            return updated;
        });
    };

    const handleSameAsCurrent = (checked) => {
        setSameAsCurrent(checked);
        if (checked) {
            setForm(prev => ({ ...prev, permanent_address: prev.current_address }));
        }
    };

    const addEducation = () => setEducationList([...educationList, { degree: '', university: '', year: '', percentage: '' }]);
    const removeEducation = (index) => educationList.length > 1 && setEducationList(educationList.filter((_, i) => i !== index));
    const updateEducation = (index, field, value) => {
        const newList = [...educationList];
        newList[index][field] = value;
        setEducationList(newList);
    };

    const handleFileChange = (e) => {
        const { name, files: fList } = e.target;
        setFiles(prev => ({ ...prev, [name]: fList[0] }));
    };

    const validateStep = (s) => {
        if (s === 1) {
            if (!form.dob || !form.contact_number || !form.emergency_contact) {
                toast.error("Identity vectors required.");
                return false;
            }
            return true;
        }
        if (s === 2) {
            if (!form.current_address || !form.location) {
                toast.error("Geographic coordinates required.");
                return false;
            }
            return true;
        }
        if (s === 3) {
            if (educationList.some(e => !e.degree || !e.university)) {
                toast.error("Complete academic modules required.");
                return false;
            }
            return true;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (step < 4) {
            handleNext();
            return;
        }

        if (!files.photo_file || !files.cv_file) {
            toast.error("Identity Visual & Resume vectors are mandatory.");
            return;
        }

        setLoading(true);
        const fd = new FormData();
        Object.keys(form).forEach(k => fd.append(k, form[k]));
        fd.append('education_details', JSON.stringify(educationList));
        Object.keys(files).forEach(k => files[k] && fd.append(k, files[k]));

        try {
            const res = await fetch('/api/onboarding/admin-unification', {
                method: 'POST',
                credentials: 'include',
                body: fd
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Protocol Error during synchronization');
            
            toast.success('Identity Matrix Synchronized!');
            onComplete(data.employee_code);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-3xl px-4 animate-fade-in overflow-y-auto pt-20 pb-20">
            <div className="glass-panel border-primary/20 bg-[#060E20] p-1 md:p-1 w-full max-w-2xl shadow-[0_0_200px_rgba(16,185,129,0.15)] rounded-[40px] relative">
                
                <div className="bg-[#0B1326]/80 rounded-[38px] p-8 md:p-12 overflow-hidden relative">
                    {/* Background decor */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-primary pointer-events-none"><Shield size={200} /></div>
                    
                    <div className="relative z-10">
                        {/* Header */}
                        <div className="mb-10 flex justify-between items-end border-b border-white/5 pb-8">
                            <div className="space-y-1">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                                    <Shield size={24} />
                                </div>
                                <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter italic">Identity <span className="text-primary text-glow">Initialization</span></h2>
                                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-white/40 mt-1">First-Time Administrative Synchronization</p>
                            </div>
                            <div className="text-right">
                                <div className="flex gap-1 mb-2">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-6 bg-primary shadow-glow' : 'w-2 bg-white/10'}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-white/30">Node {step} / 4</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Step 1: Personal Identification */}
                            {step === 1 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserPlus size={16} className="text-primary" />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Temporal & Contact Origins</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Temporal Origin (DOB)</label>
                                            <input type="date" name="dob" required value={form.dob} onChange={handleChange} className="w-full glass-panel-input border-white/5" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Primary Contact Line</label>
                                            <input type="tel" name="contact_number" required value={form.contact_number} onChange={handleChange} placeholder="+1 234 567..." className="w-full glass-panel-input border-white/5" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Emergency Distress Frequency</label>
                                        <input type="text" name="emergency_contact" required value={form.emergency_contact} onChange={handleChange} placeholder="Name - Contact Number" className="w-full glass-panel-input border-white/5" />
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Location & Capability */}
                            {step === 2 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin size={16} className="text-primary" />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Geographic & Skill Vectors</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Current Operations Base</label>
                                            <textarea name="current_address" rows="2" required value={form.current_address} onChange={handleChange} className="w-full glass-panel-input border-white/5 resize-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Permanent Anchor Point</label>
                                            <textarea name="permanent_address" rows="2" required value={form.permanent_address} onChange={handleChange} className="w-full glass-panel-input border-white/5 resize-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">City / Logistics Hub</label>
                                        <input name="location" required value={form.location} onChange={handleChange} placeholder="e.g. New York, London..." className="w-full glass-panel-input border-white/5" />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Education Modules */}
                            {step === 3 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <GraduationCap size={16} className="text-primary" />
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Academic History Blocks</h3>
                                        </div>
                                        <button type="button" onClick={addEducation} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-primary rounded-xl transition-all border border-primary/20">
                                            <Plus size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Add Module</span>
                                        </button>
                                    </div>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {educationList.map((edu, idx) => (
                                            <div key={idx} className="glass-panel p-6 border-white/5 space-y-4 relative group bg-black/20">
                                                {educationList.length > 1 && (
                                                    <button type="button" onClick={() => removeEducation(idx)} className="absolute top-4 right-4 p-2 text-white/20 hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input placeholder="Degree / Qualification" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                                    <input placeholder="Board / University" value={edu.university} onChange={e => updateEducation(idx, 'university', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Step 4: Digital Visuals */}
                            {step === 4 && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Upload size={16} className="text-primary" />
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Biometric & Identity Assets</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { k: 'photo_file', label: 'Identity Visual (Photo)', icon: UserPlus },
                                            { k: 'cv_file', label: 'Knowledge Vector (CV)', icon: ShieldCheck },
                                            { k: 'id_proof_file', label: 'Citizen Identification (ID)', icon: ShieldCheck }
                                        ].map((f, i) => (
                                            <div key={i} className={`flex items-center gap-6 p-6 rounded-[22px] border transition-all ${files[f.k] ? 'bg-primary/10 border-primary/30' : 'bg-white/5 border-white/5'}`}>
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${files[f.k] ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/30 border-white/5'}`}>
                                                    {files[f.k] ? <CheckCircle size={20} /> : <f.icon size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-white">{f.label}</p>
                                                    <p className="text-[10px] text-white/30 mt-1 truncate">{files[f.k] ? files[f.k].name : 'Required for synchronization'}</p>
                                                </div>
                                                <label className="cursor-pointer px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                                                    {files[f.k] ? 'Replace' : 'Upload'}
                                                    <input type="file" name={f.k} onChange={handleFileChange} className="hidden" />
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div className="flex gap-4 pt-10 border-t border-white/5">
                                {step > 1 && (
                                    <button type="button" onClick={() => setStep(step - 1)} className="px-8 py-5 rounded-2xl border border-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                                        Go Back
                                    </button>
                                )}
                                <button type="submit" disabled={loading} className="flex-1 bg-primary text-black font-black text-[12px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_15px_40px_rgba(204,151,255,0.3)] hover:bg-white hover:shadow-white/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:grayscale">
                                    {loading ? (
                                        <>Initializing Matrix...</>
                                    ) : (
                                        <>
                                            {step < 4 ? 'Advance Node' : 'Confirm Synchronization'}
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .glass-panel-input {
                    background: rgba(0, 0, 0, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 18px 22px;
                    color: white;
                    font-size: 13px;
                    width: 100%;
                    outline: none;
                }
                .glass-panel-input:focus {
                    border-color: #CC97FF;
                    background: rgba(0, 0, 0, 0.6);
                    box-shadow: 0 0 30px rgba(204, 151, 255, 0.1);
                }
                .shadow-glow { box-shadow: 0 0 20px rgba(204, 151, 255, 0.6); }
                .text-glow { text-shadow: 0 0 15px rgba(204, 151, 255, 0.5); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(204, 151, 255, 0.2); border-radius: 10px; }
            `}} />
        </div>
    );
}
