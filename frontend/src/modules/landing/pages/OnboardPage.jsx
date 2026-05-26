import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  UserPlus, ArrowRight, Zap, CheckCircle, Upload, 
  Trash2, Plus, Info, ShieldCheck, Phone, MapPin, GraduationCap 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import logo from "../../../assets/phy360.png";
export default function OnboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Validation States
  const [validationErrors, setValidationErrors] = useState({});

  // Form states
  const [form, setForm] = useState({
    password: '', contact_number: '', emergency_contact: '', dob: '',
    current_address: '', permanent_address: '',
    location: '',
    primary_skills: '', secondary_skills: ''
  });

  const [educationList, setEducationList] = useState([
    { degree: '', university: '', year: '', percentage: '' }
  ]);
  
  const [files, setFiles] = useState({ photo_file: null, cv_file: null, id_proof_file: null });
  const [sameAsCurrent, setSameAsCurrent] = useState(false);

  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const ROLE_LABELS = {
      'org_admin': 'Org Admin (L2)',
      'manager': 'Manager (L3)',
      'employee': 'Employee (L4)'
  };

  useEffect(() => {
    if (!token) {
        setError('Missing secure onboarding token.');
        setLoading(false);
        return;
    }
    fetch('/api/onboarding/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
        if (data.valid || data.email) {
            setTokenInfo(data);
        } else {
            setError(data.detail || 'Token invalid or expired.');
        }
    })
    .catch(() => setError('Connection failed.'))
    .finally(() => setLoading(false));
  }, [token]);

  const validateStep = (currentStep) => {
      const errors = {};
      
      if (currentStep === 1) {
          // Password length
          if (form.password.length < 8) errors.password = "Minimum 8 characters required";
          
          // DOB / Age check
          if (!form.dob) errors.dob = "Required";
          else {
              const birthDate = new Date(form.dob);
              const age = new Date().getFullYear() - birthDate.getFullYear();
              if (age < 18) errors.dob = "Must be at least 18 years old";
          }
          
          // Phone validation
          const phoneRegex = /^\+[1-9]\d{1,14}$/; // E.164 format
          if (!form.contact_number) errors.contact_number = "Required";
          else if (!phoneRegex.test(form.contact_number.replace(/\s/g, ''))) {
              errors.contact_number = "Include country code (e.g. +91...)";
          }
          
          if (!form.emergency_contact) errors.emergency_contact = "Required";
          else if (!phoneRegex.test(form.emergency_contact.split('-').pop().trim().replace(/\s/g, ''))) {
              errors.emergency_contact = "Format: Name - +91...";
          }
      }

      if (currentStep === 2) {
          if (!form.current_address) errors.current_address = "Required";
          if (!form.permanent_address && !sameAsCurrent) errors.permanent_address = "Required";
          if (!form.location) errors.location = "Required";
          if (!form.primary_skills) errors.primary_skills = "Required";
      }

      if (currentStep === 3) {
          educationList.forEach((edu, idx) => {
              if (!edu.degree || !edu.university || !edu.year) {
                  errors[`edu_${idx}`] = "All fields required";
              }
          });
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
      if (validateStep(step)) {
          setStep(step + 1);
      } else {
          toast.error("Please fix errors before proceeding");
      }
  };

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

  const addEducation = () => {
      setEducationList([...educationList, { degree: '', university: '', year: '', percentage: '' }]);
  };

  const removeEducation = (index) => {
      if (educationList.length > 1) {
          setEducationList(educationList.filter((_, i) => i !== index));
      }
  };

  const updateEducation = (index, field, value) => {
      const newList = [...educationList];
      newList[index][field] = value;
      setEducationList(newList);
  };

  const handleFileChange = (e) => {
      const { name, files: fList } = e.target;
      const file = fList[0];
      setFiles(prev => ({ ...prev, [name]: file }));

      // Simulate Resume Parsing for CV
      if (name === 'cv_file' && file) {
          toast.promise(
              new Promise(resolve => setTimeout(resolve, 1500)),
              {
                  loading: 'Reading resume details...',
                  success: 'Skills and experience added',
                  error: 'Parsing failed',
              }
          ).then(() => {
              // Mock population
              setForm(prev => ({
                  ...prev,
                  primary_skills: prev.primary_skills || 'Extracted Skills: React, Node.js, AWS',
                  secondary_skills: prev.secondary_skills || 'Python, Docker, SQL'
              }));
          });
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 4) {
       handleNext();
       return;
    }

    // Final file check
    if (!files.cv_file || !files.photo_file) {
        toast.error("Resume and Photo are mandatory uploads");
        return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append('token', token);
    Object.keys(form).forEach(k => fd.append(k, form[k]));
    fd.append('education_details', JSON.stringify(educationList));
    Object.keys(files).forEach(k => files[k] && fd.append(k, files[k]));

    try {
        const res = await fetch('/api/onboarding/complete', {
            method: 'POST',
            body: fd
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to submit data');
        setSuccess(true);
        toast.success("Onboarding details submitted!");
    } catch (err) {
        toast.error(err.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="onboard-page relative min-h-screen bg-[#f5f5f5] text-black flex items-center justify-center p-6 overflow-hidden font-inter">
      <div className="onboard-bg-glow absolute inset-0 z-0 h-full w-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-primary/10 blur-[200px] rounded-full animate-pulse opacity-40 will-change-transform" />
      </div>

      <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
        <div className="mb-10 flex flex-col items-center">
          <div onClick={() => navigate('/')} className="cursor-pointer mb-6 transition-all hover:scale-105 active:scale-95">
             <img src={logo} alt="PHYGITRON 360" className="onboard-logo" />
          </div>
          <h1 className="text-4xl font-display font-black tracking-tighter uppercase mb-2">Complete <span className="text-primary text-glow">Onboarding</span></h1>
          <div className="flex items-center gap-2 opacity-50 uppercase tracking-[0.4em] text-[10px] font-black">
              <ShieldCheck size={12} /> Secure candidate onboarding
          </div>
        </div>

        <div className="glass-panel p-1 border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
          <div className="bg-[#0B1326]/60 backdrop-blur-3xl rounded-[26px] p-8 md:p-12">
             {loading ? (
                 <div className="text-center py-20">
                     <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                     <p className="text-[12px] text-white/40 uppercase font-black tracking-widest animate-pulse">Checking onboarding link...</p>
                 </div>
             ) : error ? (
                 <div className="text-center space-y-6 py-12">
                     <div className="w-20 h-20 bg-error/10 text-error border border-error/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                        <Zap size={40} />
                     </div>
                     <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Link unavailable</h2>
                     <p className="text-[14px] text-white/50 pb-8 leading-relaxed uppercase tracking-wider">{error}</p>
                     <button onClick={() => navigate('/')} className="px-10 py-4 glass-panel border-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-white/5 transition-all">Return home</button>
                 </div>
             ) : success ? (
                 <div className="text-center space-y-6 py-12">
                     <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                        <CheckCircle size={40} />
                     </div>
                     <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter">Onboarding submitted</h2>
                     <p className="text-sm text-white/50 pb-10 leading-relaxed max-w-md mx-auto">
                        Your details have been submitted. The HR team will verify your credentials shortly and notify you when your account is ready.
                     </p>
                     <button onClick={() => navigate('/login')} className="w-full bg-primary text-black font-black text-[12px] uppercase tracking-[0.2em] py-6 rounded-2xl hover:bg-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20">
                        Go to login
                     </button>
                 </div>
             ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                   <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
                       <div className="space-y-1">
                           <p className="text-[10px] font-black uppercase tracking-widest text-primary">Candidate details</p>
                           <h2 className="text-2xl font-display font-black text-white uppercase">{tokenInfo.name}</h2>
                           <p className="text-[11px] text-white/40 font-medium">{tokenInfo.email} // {ROLE_LABELS[tokenInfo.role] || tokenInfo.role}</p>
                       </div>
                       <div className="text-right">
                           <div className="flex gap-1 mb-2">
                               {[1,2,3,4].map(i => (
                                   <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step >= i ? 'w-6 bg-primary shadow-glow' : 'w-2 bg-white/10'}`} />
                               ))}
                           </div>
                           <span className="text-[10px] font-black tracking-widest uppercase text-white/30">Step {step} / 4</span>
                       </div>
                   </div>

                   {/* Step 1: Identity & Credentials */}
                   {step === 1 && (
                      <div className="space-y-6 animate-fade-in-up">
                         <div className="flex items-center gap-2 mb-2">
                             <ShieldCheck size={16} className="text-primary" />
                             <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Account setup</h3>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Password</label>
                               <input type="password" name="password" value={form.password} onChange={handleChange} className={`w-full glass-panel-input ${validationErrors.password ? 'border-error/50' : 'border-white/5'}`} placeholder="Min 8 characters" />
                               {validationErrors.password && <p className="text-[9px] text-error font-bold uppercase tracking-widest mt-1 ml-1">{validationErrors.password}</p>}
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Date of birth</label>
                               <input type="date" name="dob" value={form.dob} onChange={handleChange} className={`w-full glass-panel-input ${validationErrors.dob ? 'border-error/50' : 'border-white/5'}`} />
                               {validationErrors.dob && <p className="text-[9px] text-error font-bold uppercase tracking-widest mt-1 ml-1">{validationErrors.dob}</p>}
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-1"><Phone size={10} /> Contact number</label>
                               <input type="text" name="contact_number" value={form.contact_number} onChange={handleChange} className={`w-full glass-panel-input ${validationErrors.contact_number ? 'border-error/50' : 'border-white/5'}`} placeholder="+91 XXXX XXX XXX" />
                               {validationErrors.contact_number && <p className="text-[9px] text-error font-bold uppercase tracking-widest mt-1 ml-1">{validationErrors.contact_number}</p>}
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Emergency contact</label>
                               <input type="text" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} className={`w-full glass-panel-input ${validationErrors.emergency_contact ? 'border-error/50' : 'border-white/5'}`} placeholder="Name - +91..." />
                               {validationErrors.emergency_contact && <p className="text-[9px] text-error font-bold uppercase tracking-widest mt-1 ml-1">{validationErrors.emergency_contact}</p>}
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Step 2: Location & Capabilities */}
                   {step === 2 && (
                      <div className="space-y-6 animate-fade-in-up">
                         <div className="flex items-center gap-2 mb-2">
                             <MapPin size={16} className="text-primary" />
                             <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Location and skills</h3>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Current address</label>
                                <textarea name="current_address" rows="2" value={form.current_address} onChange={handleChange} className="w-full glass-panel-input resize-none" />
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">City / location</label>
                                <input name="location" value={form.location} onChange={handleChange} className="w-full glass-panel-input" placeholder="e.g. Mumbai, Bangalore" />
                             </div>
                          </div>

                         <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Permanent address</label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" checked={sameAsCurrent} onChange={e => handleSameAsCurrent(e.target.checked)} className="hidden" />
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${sameAsCurrent ? 'bg-primary border-primary' : 'border-white/20'}`}>
                                        {sameAsCurrent && <CheckCircle size={10} className="text-black" />}
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-primary transition-colors">Same as current</span>
                                </label>
                            </div>
                            {!sameAsCurrent && <textarea name="permanent_address" rows="2" value={form.permanent_address} onChange={handleChange} className="w-full glass-panel-input resize-none" />}
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Primary skills</label>
                               <input type="text" name="primary_skills" value={form.primary_skills} onChange={handleChange} className="w-full glass-panel-input" placeholder="Core Skills" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Secondary skills</label>
                               <input type="text" name="secondary_skills" value={form.secondary_skills} onChange={handleChange} className="w-full glass-panel-input" placeholder="Auxiliary Skills" />
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Step 3: Education Modules */}
                   {step === 3 && (
                      <div className="space-y-6 animate-fade-in-up">
                         <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-2">
                                <GraduationCap size={16} className="text-primary" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Education history</h3>
                             </div>
                             <button type="button" onClick={addEducation} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-primary rounded-xl transition-all border border-primary/20">
                                <Plus size={14} /> <span className="text-[10px] font-black uppercase tracking-widest">Add education</span>
                             </button>
                         </div>

                         <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                             {educationList.map((edu, idx) => (
                                 <div key={idx} className="glass-panel p-6 border-white/5 space-y-4 relative group">
                                     {educationList.length > 1 && (
                                         <button type="button" onClick={() => removeEducation(idx)} className="absolute top-4 right-4 p-2 text-white/20 hover:text-error hover:bg-error/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 size={14} />
                                         </button>
                                     )}
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <input placeholder="Degree / Qualification" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                         <input placeholder="Institution / Board" value={edu.university} onChange={e => updateEducation(idx, 'university', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                     </div>
                                     <div className="grid grid-cols-2 gap-4">
                                         <input placeholder="Year" value={edu.year} onChange={e => updateEducation(idx, 'year', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                         <input placeholder="CGPA / %" value={edu.percentage} onChange={e => updateEducation(idx, 'percentage', e.target.value)} className="w-full glass-panel-input text-[11px] py-3 bg-black/40" />
                                     </div>
                                 </div>
                             ))}
                         </div>
                      </div>
                   )}

                   {/* Step 4: Digital Proofs */}
                   {step === 4 && (
                      <div className="space-y-6 animate-fade-in-up">
                         <div className="flex items-center gap-2 mb-2">
                             <Upload size={16} className="text-primary" />
                             <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Document uploads</h3>
                         </div>
                         
                         <div className="space-y-4">
                            {[
                                { k: 'cv_file', label: 'Resume / CV', desc: 'Upload your latest resume', icon: ShieldCheck },
                                { k: 'photo_file', label: 'Photo', desc: 'Clear passport size photo', icon: UserPlus },
                                { k: 'id_proof_file', label: 'ID proof', desc: 'Government issued identity proof', icon: ShieldCheck }
                            ].map((f, i) => (
                               <div key={i} className={`onboard-upload-row flex items-center gap-6 p-6 rounded-[22px] border transition-all ${files[f.k] ? 'is-complete' : 'is-empty'}`}>
                                  <div className={`onboard-upload-icon w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${files[f.k] ? 'is-complete' : 'is-empty'}`}>
                                      {files[f.k] ? <CheckCircle size={24} /> : <f.icon size={24} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                         <p className="text-[11px] font-black uppercase tracking-widest text-white">{f.label}</p>
                                         {!files[f.k] && <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" title="Required" />}
                                     </div>
                                     <p className="text-[10px] text-white/30 mt-1 uppercase tracking-wider truncate">{files[f.k] ? files[f.k].name : f.desc}</p>
                                  </div>
                                  <label className="cursor-pointer px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white border border-white/10 rounded-xl transition-all">
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
                           <button type="button" onClick={() => setStep(step - 1)} className="px-10 py-5 rounded-2xl border border-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
                               Previous
                           </button>
                       )}
                       <button type="submit" disabled={submitting} className="flex-1 bg-primary text-black font-black text-[12px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_15px_40px_rgba(204,151,255,0.3)] hover:bg-white hover:shadow-white/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:grayscale">
                           {submitting ? (
                               <>
                                   <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                   Submitting...
                               </>
                           ) : (
                               <>
                                   {step < 4 ? 'Continue' : 'Submit onboarding'}
                                   <ArrowRight size={18} />
                               </>
                           )}
                       </button>
                   </div>
                </form>
             )}
          </div>
        </div>
        
        <div className="mt-10 flex items-center justify-center gap-6 opacity-30 text-[9px] font-black uppercase tracking-widest">
            <span className="flex items-center gap-2"><ShieldCheck size={12}/> Secure form</span>
            <span className="flex items-center gap-2"><Info size={12}/> Resume parsing enabled</span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .onboard-page {
          background: #f5f5f5;
          color: #111111;
          min-height: 100vh;
          align-items: flex-start;
          padding-top: 48px;
          padding-bottom: 48px;
        }

        .onboard-bg-glow {
          display: none;
        }

        .onboard-page .glass-panel {
          background: #ffffff !important;
          border: 1px solid #e5e5e5 !important;
          border-radius: 8px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .onboard-page [class*="bg-[#0B1326"] {
          background: #ffffff !important;
          border-radius: 8px !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .onboard-page [class*="bg-[#060E20"],
        .onboard-page [class*="bg-black/40"],
        .onboard-page [class*="bg-white/5"] {
          background: #f7f7f7 !important;
        }

        .onboard-page [class*="border-white"] {
          border-color: #e5e5e5 !important;
        }

        .onboard-page [class*="text-white"],
        .onboard-page [class*="text-on-surface"] {
          color: #111111 !important;
        }

        .onboard-page [class*="text-white/"],
        .onboard-page [class*="opacity-50"],
        .onboard-page [class*="opacity-40"],
        .onboard-page [class*="opacity-30"] {
          color: #666666 !important;
          opacity: 1 !important;
        }

        .onboard-page .text-primary,
        .onboard-page [class*="text-primary"] {
          color: #7b1eff !important;
        }

        .onboard-page .bg-primary,
        .onboard-page [class*="bg-primary"] {
          background: #7b1eff !important;
        }

        .onboard-page .text-black,
        .onboard-page button.bg-primary,
        .onboard-page button[class*="bg-primary"] {
          color: #ffffff !important;
        }

        .onboard-page h1,
        .onboard-page h2,
        .onboard-page h3,
        .onboard-page label,
        .onboard-page button,
        .onboard-page p,
        .onboard-page span {
          letter-spacing: 0 !important;
        }

        .onboard-page h1 {
          font-size: clamp(28px, 4vw, 42px) !important;
          font-weight: 500 !important;
          text-transform: none !important;
        }

        .onboard-logo {
          width: min(150px, 64vw);
          height: auto;
          display: block;
        }

        .onboard-page h2 {
          font-weight: 600 !important;
          text-transform: none !important;
        }

        .onboard-page label,
        .onboard-page h3,
        .onboard-page p,
        .onboard-page span {
          text-transform: none !important;
        }

        .onboard-page button,
        .onboard-page label[class*="cursor-pointer"] {
          border-radius: 6px !important;
        }

        .onboard-page .rounded-3xl,
        .onboard-page .rounded-2xl,
        .onboard-page .rounded-[22px],
        .onboard-page .rounded-[26px] {
          border-radius: 8px !important;
        }

        .onboard-page .shadow-glow,
        .onboard-page .text-glow {
          box-shadow: none !important;
          text-shadow: none !important;
        }

        .onboard-upload-row.is-complete {
          background: #eeeeee !important;
          border-color: #d6d6d6 !important;
        }

        .onboard-upload-row.is-empty {
          background: #f7f7f7 !important;
          border-color: #e5e5e5 !important;
        }

        .onboard-upload-row.is-empty:hover {
          background: #f1f1f1 !important;
        }

        .onboard-upload-icon.is-complete {
          background: #4a4a4a !important;
          border-color: #4a4a4a !important;
          color: #ffffff !important;
        }

        .onboard-upload-icon.is-empty {
          background: #ffffff !important;
          border-color: #d8d8d8 !important;
          color: #777777 !important;
        }

        .glass-panel-input {
          background: #ffffff;
          border: 1px solid #d8d8d8;
          border-radius: 6px;
          padding: 16px 20px;
          color: #111111;
          font-size: 13px;
          width: 100%;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          outline: none;
        }
        .glass-panel-input:focus {
          border-color: #7b1eff;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(123, 30, 255, 0.12);
        }
        .glass-panel-input::placeholder {
          color: #8a8a8a;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cccccc; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #999999; }
      `}} />
    </div>
  );
}
