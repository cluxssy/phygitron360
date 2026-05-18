import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import '../styles/orgsetup.css';

export default function OrgAdminSetupModal({ user, onComplete }) {

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    contact_number: '',
    emergency_contact: '',
    current_location: '',
    state: '',
    city: '',
    pincode: ''
  });

  const [educationList, setEducationList] = useState([
    { degree: '', university: '', cgpa: '', year: '' }
  ]);

  const [files, setFiles] = useState({
    photo_file: null,
    cv_file: null,
    id_proof_file: null
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const updateEducation = (i, field, value) => {
    const copy = [...educationList];
    copy[i][field] = value;
    setEducationList(copy);
  };

  const addEducation = () => {
    setEducationList([
      ...educationList,
      { degree: '', university: '', cgpa: '', year: '' }
    ]);
  };

  const removeEducation = (i) => {
    if (educationList.length > 1) {
      setEducationList(educationList.filter((_, idx) => idx !== i));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: f } = e.target;
    setFiles(prev => ({ ...prev, [name]: f[0] }));
  };

  const validateStep = () => {

    if (step === 1 && (
      !form.full_name ||
      !form.dob ||
      !form.contact_number ||
      !form.emergency_contact
    )) {
      toast.error("Fill all personal details");
      return false;
    }

    if (step === 2 && (
      !form.current_location ||
      !form.city ||
      !form.state ||
      !form.pincode
    )) {
      toast.error("Complete location details");
      return false;
    }

    if (step === 3 && educationList.some(e =>
      !e.degree || !e.university || !e.cgpa || !e.year
    )) {
      toast.error("Complete education details");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step < 4) {
      if (validateStep()) setStep(prev => prev + 1);
      return;
    }

    if (!files.photo_file || !files.cv_file) {
      toast.error("Upload required files");
      return;
    }

    setLoading(true);

    const fd = new FormData();

    const finalAddress = `${form.current_location}, ${form.city}, ${form.state} - ${form.pincode}`;

    fd.append("current_address", finalAddress);
    fd.append("location", form.city);

    fd.append("full_name", form.full_name);
    fd.append("dob", form.dob);
    fd.append("contact_number", form.contact_number);
    fd.append("emergency_contact", form.emergency_contact);

    fd.append('education_details', JSON.stringify(educationList));

    Object.entries(files).forEach(([k, v]) => v && fd.append(k, v));

    try {
      const res = await fetch('/api/onboarding/admin-unification', {
        method: 'POST',
        credentials: 'include',
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      toast.success("Setup complete");
      onComplete(data.employee_code);

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white px-6">

      <div className="w-full max-w-4xl">

        {/* HEADER */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Identity Initialisation</h2>

          <div className="flex gap-2">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className={`h-1 rounded-full ${
                  step >= i ? 'w-10 bg-purple-600' : 'w-6 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">Step {step} of 4</p>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="card">
              <h3 className="card-title">Personal Details</h3>

              <div className="grid grid-cols-2 gap-6">

                <div>
                  <label className="label">Full Name</label>
                  <input name="full_name" value={form.full_name} onChange={handleChange} className="input" />
                </div>

                <div>
                  <label className="label">Date of Birth</label>
                  <input type="date" name="dob" value={form.dob} onChange={handleChange} className="input" />
                </div>

                <div>
                  <label className="label">Primary Contact</label>
                  <input name="contact_number" value={form.contact_number} onChange={handleChange} className="input" />
                </div>

                <div>
                  <label className="label">Emergency Contact</label>
                  <input name="emergency_contact" value={form.emergency_contact} onChange={handleChange} className="input" />
                </div>

              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="card">
              <h3 className="card-title">Location</h3>

              <div className="grid grid-cols-2 gap-6">

                <input placeholder="Current Location" value={form.current_location} onChange={e => setForm({...form,current_location:e.target.value})} className="input"/>
                <input placeholder="State" value={form.state} onChange={e => setForm({...form,state:e.target.value})} className="input"/>

                <input placeholder="City" value={form.city} onChange={e => setForm({...form,city:e.target.value})} className="input"/>
                <input placeholder="Pincode" value={form.pincode} onChange={e => setForm({...form,pincode:e.target.value})} className="input"/>

              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="card">

              <div className="flex justify-between items-center mb-4">
                <h3 className="card-title">Academic History</h3>

                <button type="button" onClick={addEducation} className="add-btn">
                  + Add degree
                </button>
              </div>

              <div className="space-y-6">
                {educationList.map((edu, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4">

                    <input placeholder="Degree" value={edu.degree} onChange={e => updateEducation(i,'degree',e.target.value)} className="input"/>
                    <input placeholder="College / University" value={edu.university} onChange={e => updateEducation(i,'university',e.target.value)} className="input"/>

                    <input placeholder="CGPA" value={edu.cgpa} onChange={e => updateEducation(i,'cgpa',e.target.value)} className="input"/>
                    <input placeholder="Graduation Year" value={edu.year} onChange={e => updateEducation(i,'year',e.target.value)} className="input"/>

                    {educationList.length > 1 && (
                      <button type="button" onClick={() => removeEducation(i)} className="delete-btn">
                        <Trash2 size={16}/>
                      </button>
                    )}

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="card">
              <h3 className="card-title">Uploads</h3>

              <div className="space-y-4">
                <input type="file" name="photo_file" onChange={handleFileChange}/>
                <input type="file" name="cv_file" onChange={handleFileChange}/>
                <input type="file" name="id_proof_file" onChange={handleFileChange}/>
              </div>
            </div>
          )}

          {/* BUTTON */}
          <div className="flex justify-end">
            <button type="submit" className="w-64 bg-gradient-to-r from-purple-600 to-purple-500 text-white py-3 rounded-lg">
              {loading ? "Loading..." : step < 4 ? "Next" : "Submit"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}