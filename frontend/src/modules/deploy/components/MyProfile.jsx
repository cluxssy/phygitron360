import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../core/auth/AuthContext';
import ChangePasswordModal from '../../../core/auth/ChangePasswordModal';
import { 
  User, MapPin, Phone, Mail, Calendar, Key, AlertCircle, Save, 
  CheckCircle, Edit3, Briefcase, TrendingUp, GraduationCap, 
  Landmark, FileText, Upload, ExternalLink, Image, Package
} from 'lucide-react';
import ComboBox from '../../../core/components/ComboBox';

const DESIGNATIONS = [
    'Software Engineer', 'Senior Engineer', 'Team Lead', 'Project Manager', 
    'Product Manager', 'Designer', 'QA Analyst', 'Sales Executive', 
    'HR Associate', 'Accountant', 'Marketing Specialist', 'Operations Manager'
];

const DEPARTMENTS = [
    'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 
    'Human Resources', 'Finance', 'Operations', 'Quality Assurance'
];

export default function MyProfile() {
  const { user } = useAuth();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [assets, setAssets] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dynDesignations, setDynDesignations] = useState([]);
  const [dynDepartments, setDynDepartments] = useState([]);
  const [locations, setLocations] = useState([]);
  
  const fileInputPfp = useRef();
  const fileInputCv = useRef();
  const fileInputId = useRef();

  useEffect(() => {
      if (user?.employee_code) {
          fetchDetails(user.employee_code);
          fetch(`/api/assets/${user.employee_code}`, { credentials: 'include' })
              .then(r => r.json()).then(d => setAssets(d)).catch(() => {});
          
          fetch('/api/options', { credentials: 'include' })
              .then(r => r.json())
              .then(data => {
                  setLocations(data.locations || []);
                  if (data.designations?.length > 0) setDynDesignations(data.designations);
                  if (data.teams?.length > 0) setDynDepartments(data.teams);
              }).catch(() => {});
      } else {
          setLoading(false);
      }
  }, [user]);

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
      toast.error('Failed to load profile'); 
    } finally { 
      setLoading(false); 
    }
  };

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
        
        toast.success('Profile updated. Some changes may require re-login.');
        setEditMode(false);
        fetchDetails(formData.employee_code);
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
        toast.loading('Uploading...', { id: 'upload' });
        const res = await fetch(`/api/employee/${details.employee_code}/documents`, {
            method: 'POST',
            credentials: 'include',
            body: fd
        });
        if (!res.ok) throw new Error('Upload failed');
        toast.success('Uploaded successfully', { id: 'upload' });
        fetchDetails(details.employee_code);
    } catch {
        toast.error('Upload failed', { id: 'upload' });
    }
  };

  if (loading && !details) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!details || !user?.employee_code) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
         <div className="w-20 h-20 rounded-[1.6rem] bg-error/10 border border-error/20 flex items-center justify-center text-error mb-6">
            <AlertCircle size={32} />
         </div>
         <h2 className="text-3xl font-display font-black text-black uppercase tracking-tighter mb-2">Matrix Link <span className="text-error">Required</span></h2>
         <p className="text-black text-xs max-w-md uppercase tracking-widest leading-relaxed">
            Your profile cannot be accessed without an active personnel sequence. <br/> 
            Return to the Management portal and complete an Outbound Invite.
         </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in-up pb-10">
      {/* Action Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[1.5rem] border border-[#ece4ff] shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6b7280] italic">Personnel Dossier // Self Management</h2>
        <div className="flex gap-3">
            <button 
                onClick={() => setShowPwdModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black hover:text-black transition-all"
            >
                <Key size={14} /> Update Key
            </button>
            {editMode ? (
                <>
                    <button onClick={() => setEditMode(false)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-black">Abort</button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-primary/20"
                    >
                        {isSaving ? 'Syncing...' : 'Synchronize'}
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-8 py-2 bg-white border border-[#ece4ff] rounded-[1.8rem] border-white/10 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-black transition-all"
                >
                    <Edit3 size={14} /> Modify Profile
                </button>
            )}
        </div>
      </div>

      {/* Profile Hero */}
      <div className="bg-white border border-[#ece4ff] rounded-[2rem] p-7 shadow-[0_10px_40px_rgba(180,140,255,0.08)] flex flex-col md:flex-row items-start gap-8 relative overflow-hidden">
        
        <div className="relative group">
            <div className="w-24 h-24 rounded-[1.6rem] bg-gradient-to-br from-[#b784f7] to-[#8b5cf6] flex items-center justify-center text-black font-display font-black text-4xl shrink-0 shadow-[0_0_30px_rgba(204,151,255,0.2)] overflow-hidden">
            {details.photo_path ? (
                <img src={`/${details.photo_path}`} className="w-full h-full object-cover" alt="" />
            ) : (
                details.name?.[0] || 'U'
            )}
            </div>
            {editMode && (
                <button 
                    onClick={() => fileInputPfp.current.click()}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1 rounded-[1.6rem] text-black text-[8px] font-black uppercase tracking-widest"
                >
                    <Image size={14} /> Update
                </button>
            )}
            <input type="file" ref={fileInputPfp} hidden accept="image/*" onChange={e => handleFileUpload('pfp', e.target.files[0])} />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-black">
                    {details.employee_code} // {details.role || user?.role}
                </p>
                {editMode && (
                    <input 
                        type="text" 
                        value={formData.employee_code}
                        onChange={e => setFormData({...formData, employee_code: e.target.value})}
                        className="bg-[#faf7ff] border border-[#e9defd] rounded-lg px-2 py-0.5 text-[10px] text-black focus:outline-none"
                    />
                )}
            </div>
            {editMode ? (
                <input 
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="text-3xl font-display font-black text-black uppercase tracking-tighter bg-[#faf7ff] border border-[#e9defd] rounded-xl px-4 py-1 focus:outline-none focus:border-primary w-full max-w-md"
                />
            ) : (
                <h1 className="text-3xl font-display font-black text-black uppercase tracking-tighter italic">
                    {details.name}
                </h1>
            )}
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mt-2">
                {editMode ? (
                   <>
                     <ComboBox 
                        options={dynDesignations.length > 0 ? dynDesignations : DESIGNATIONS}
                        value={formData.designation}
                        onChange={v => setFormData({...formData, designation: v})}
                        placeholder="Designation..."
                        className="w-full md:w-64"
                     />
                     <ComboBox 
                        options={dynDepartments.length > 0 ? dynDepartments : DEPARTMENTS}
                        value={formData.team}
                        onChange={v => setFormData({...formData, team: v})}
                        placeholder="Team/Department..."
                         className="w-full md:w-64"
                     />
                   </>
                ) : (
                    <p className="text-sm text-black font-bold uppercase tracking-widest">{details.designation} · {details.team}</p>
                )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
            <EditMetaItem editMode={editMode} icon={Mail} label="Email" value={formData.email_id} onChange={v => setFormData({...formData, email_id: v})} />
            <EditMetaItem editMode={editMode} icon={Phone} label="Contact" value={formData.contact_number} onChange={v => setFormData({...formData, contact_number: v})} />
            <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-black flex items-center gap-2">
                    <MapPin size={10} /> Location
                </p>
                {editMode ? (
                    <ComboBox 
                        options={locations.length > 0 ? locations : ['Remote', 'On-Site', 'Hybrid']}
                        value={formData.location}
                        onChange={v => setFormData({...formData, location: v})}
                        placeholder="Location..."
                        className="w-full"
                    />
                ) : (
                    <p className="text-xs text-black font-bold truncate">{formData.location || '—'}</p>
                )}
            </div>
            <EditMetaItem editMode={editMode} icon={Calendar} label="DOJ" value={formData.doj} type="date" onChange={v => setFormData({...formData, doj: v})} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
              {/* Skill Matrix */}
              <div className="bg-white border border-[#ece4ff] rounded-[1.8rem] p-8 border-white/5">
                <SectionHeader icon={TrendingUp} title="Neural Capability Matrix" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#000000] mb-3">Primary Skills</p>
                        {editMode ? (
                            <textarea value={formData.primary_skillset} onChange={e => setFormData({...formData, primary_skillset: e.target.value})} className="w-full bg-[#faf7ff] border border-[#e9defd] rounded-xl p-4 text-xs text-black focus:outline-none" rows={3}/>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(details.skill_matrix?.primary_skillset || '').split(',').map((s, i) => (
                                    <span key={i} className="px-2 py-1 bg-primary/10 text-black text-[9px] font-bold uppercase rounded-lg">
                                        {s.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-black mb-3">Secondary Skills</p>
                        {editMode ? (
                            <textarea value={formData.secondary_skillset} onChange={e => setFormData({...formData, secondary_skillset: e.target.value})} className="w-full bg-[#faf7ff] border border-[#e9defd] rounded-xl p-4 text-xs text-black focus:outline-none" rows={3}/>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {(details.skill_matrix?.secondary_skillset || '').split(',').map((s, i) => (
                                    <span key={i} className="px-2 py-1 bg-white/5 text-black text-[9px] font-bold uppercase rounded-lg">
                                        {s.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              </div>

              {/* Identity Documents */}
              <div className="bg-white border border-[#ece4ff] rounded-[1.8rem] p-8 border-white/5">
                <SectionHeader icon={FileText} title="Document Registry" />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FileCard editMode={editMode} label="CV / Resume" path={details.cv_path} onUpload={() => fileInputCv.current.click()} />
                    <FileCard editMode={editMode} label="ID Compliance" path={details.id_proofs} onUpload={() => fileInputId.current.click()} />
                </div>
                <input type="file" ref={fileInputCv} hidden accept=".pdf,.doc,.docx" onChange={e => handleFileUpload('cv', e.target.files[0])} />
                <input type="file" ref={fileInputId} hidden accept="image/*,.pdf" onChange={e => handleFileUpload('id', e.target.files[0])} />
              </div>

              {/* Detailed Allocation List (Relocated) */}
              <div className="bg-white border border-[#ece4ff] rounded-[1.8rem] border-primary/10 bg-primary/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-primary/10 flex items-center justify-between">
                    <SectionHeader icon={Package} title="Allocation Matrix" />
                </div>
                
                <div className="p-2 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {/* Onboarding Section */}
                    <div className="space-y-1">
                        <div className="px-4 py-2 bg-black/5 rounded-lg mb-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black italic">I. Onboarding Protocol</p>
                        </div>
                        {[
                            { key: 'ob_laptop', label: 'Laptop Unit' },
                            { key: 'ob_laptop_bag', label: 'Laptop Bag' },
                            { key: 'ob_headphones', label: 'Headphones' },
                            { key: 'ob_mouse', label: 'External Mouse' },
                            { key: 'ob_id_card', label: 'Identity Card' },
                            { key: 'ob_email_access', label: 'Email Node' },
                            { key: 'ob_groups', label: 'Group Access' },
                            { key: 'ob_mediclaim', label: 'Mediclaim Status' },
                            { key: 'ob_pf', label: 'Provident Fund' }
                        ].map(a => (
                            <div key={a.key} className="flex items-center justify-between p-3 px-6 hover:bg-white/5 transition-colors border-b border-white/[0.02] last:border-0 group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-black group-hover:text-black transition-colors">{a.label}</span>
                                {assets?.[a.key] ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[8px] font-black uppercase border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                        <CheckCircle size={8} /> Allocated
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-white/5 text-black rounded-full text-[8px] font-black uppercase border border-white/5">
                                        Pending
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Clearance Section */}
                    <div className="space-y-1 pt-4">
                        <div className="px-4 py-2 bg-black/5 rounded-lg mb-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black italic">II. Clearance Protocol</p>
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
                            <div key={a.key} className="flex items-center justify-between p-3 px-6 hover:bg-white/5 transition-colors border-b border-white/[0.02] last:border-0 group">
                                <span className="text-[10px] font-black uppercase tracking-widest text-black group-hover:text-black transition-colors">{a.label}</span>
                                {assets?.[a.key] ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                                        <CheckCircle size={8} /> Cleared
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 bg-white/5 text-black rounded-full text-[8px] font-black uppercase border border-white/5">
                                        In Use
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
              </div>
          </div>

          <div className="space-y-6">
              {/* Address Details */}
              <div className="bg-white border border-[#ece4ff] rounded-[1.8rem] p-8 border-white/5">
                <SectionHeader icon={Landmark} title="Geography" />
                <div className="mt-6 space-y-4">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">Current Base</p>
                        {editMode ? (
                            <textarea value={formData.current_address} onChange={e => setFormData({...formData, current_address: e.target.value})} className="w-full bg-[#faf7ff] border border-[#e9defd] rounded-xl p-3 text-xs text-black" rows={2}/>
                        ) : (
                            <p className="text-xs text-black">{details.current_address || 'Unregistered'}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-black mb-1">Permanent Anchor</p>
                        {editMode ? (
                            <textarea value={formData.permanent_address} onChange={e => setFormData({...formData, permanent_address: e.target.value})} className="w-full bg-[#faf7ff] border border-[#e9defd] rounded-xl p-3 text-xs text-black" rows={2}/>
                        ) : (
                            <p className="text-xs text-black">{details.permanent_address || 'Unregistered'}</p>
                        )}
                    </div>
                </div>
              </div>
          </div>
          {showPwdModal && <ChangePasswordModal onClose={() => setShowPwdModal(false)} />}
      </div>
    </div>
  );
}

function EditMetaItem({ editMode, icon: Icon, label, value, onChange, type="text" }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-black flex items-center gap-2">
                <Icon size={10} /> {label}
            </p>
            {editMode ? (
                <input 
                    type={type}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-[#faf7ff] border border-[#e9defd] rounded-lg px-2 py-1 text-xs text-black focus:outline-none"
                />
            ) : (
                <p className="text-xs text-black font-bold truncate">{value || '—'}</p>
            )}
        </div>
    );
}

function SectionHeader({ icon: Icon, title }) {
    return (
        <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-black">
                <Icon size={14} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black">{title}</h3>
        </div>
    );
}

function FileCard({ label, path, editMode, onUpload }) {
    return (
        <div className="flex items-center justify-between p-4 bg-[#faf7ff] rounded-xl border border-[#ece4ff] group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-3">
                <FileText size={16} className="text-black group-hover:text-black" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black group-hover:text-black">{label}</span>
            </div>
            <div className="flex gap-2">
                {path && (
                    <a href={`/${path}`} target="_blank" rel="noreferrer" className="p-2 bg-white/5 rounded-lg text-black hover:bg-primary hover:text-black">
                        <ExternalLink size={12} />
                    </a>
                )}
                {editMode && (
                    <button onClick={onUpload} className="p-2 bg-white/5 rounded-lg text-black hover:text-black transition-all">
                        <Upload size={12} />
                    </button>
                )}
            </div>
        </div>
    );
}
