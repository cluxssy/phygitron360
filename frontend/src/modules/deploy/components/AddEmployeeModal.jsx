import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, User, Mail, Phone, Calendar, MapPin, Briefcase } from 'lucide-react';

const ROLES = ['org_admin', 'manager', 'employee', 'candidate'];

export default function AddEmployeeModal({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', email: '', dob: '', phone: '', emergency: '',
    doj: '', team: '', role: 'employee', type: 'Full-time',
    manager: '', location: '', designation: '',
    current_address: '', permanent_address: '',
    pf: 'No', mediclaim: 'No', notes: '',
    primary_skillset: '', secondary_skillset: '', experience_years: '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      const res = await fetch('/api/employee', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      toast.success(data.message || 'Employee added!');
      if (data.login_credentials) {
        const { username, temporary_password } = data.login_credentials;
        toast.success(`Login: ${username} / ${temporary_password}`, { duration: 10000 });
      }
      onSuccess();
    } catch (e) {
      toast.error(e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, k, type = 'text', options }) => (
    <div>
      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">{label}</label>
      {options ? (
        <select value={form[k]} onChange={e => set(k, e.target.value)}
          className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none">
          {options.map(o => <option key={o} value={o} className="bg-[#080f1f]">{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
          className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none placeholder-white/20" />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel border-white/10 rounded-3xl p-10 mx-4 custom-scrollbar animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl">
          <X size={18} className="text-white/40" />
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Deploy // Add Personnel</p>
          <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter">
            {step === 1 ? 'Core Identity' : step === 2 ? 'Assignment' : 'Skills & Config'}
          </h2>
          {/* Step Indicator */}
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-primary' : 'bg-white/10'}`} />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-5">
              <Field label="Employee Code *" k="code" />
              <Field label="Full Name *" k="name" />
              <Field label="Email Address *" k="email" type="email" />
              <Field label="Phone (10 digits) *" k="phone" />
              <Field label="Date of Birth *" k="dob" type="date" />
              <Field label="Emergency Contact" k="emergency" />
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-5">
              <Field label="Date of Joining *" k="doj" type="date" />
              <Field label="Team / Department *" k="team" />
              <Field label="Designation *" k="designation" />
              <Field label="Reporting Manager" k="manager" />
              <Field label="Location *" k="location" />
              <Field label="Employment Type" k="type" options={['Full-time', 'Part-time', 'Contract', 'Intern']} />
              <Field label="System Role" k="role" options={ROLES} />
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-5">
              <Field label="Primary Skills" k="primary_skillset" />
              <Field label="Secondary Skills" k="secondary_skillset" />
              <Field label="Experience (years)" k="experience_years" type="number" />
              <Field label="PF Enrolled" k="pf" options={['No', 'Yes']} />
              <Field label="Mediclaim Enrolled" k="mediclaim" options={['No', 'Yes']} />
              <div className="col-span-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                  className="w-full glass-panel border-white/5 text-white text-xs bg-transparent px-4 py-3 rounded-xl focus:outline-none resize-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 rounded-2xl glass-panel border-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all">
              Continue
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex-1 py-3 rounded-2xl bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-50">
              {submitting ? 'Deploying...' : 'Deploy Personnel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
