'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Briefcase, MapPin, Phone, Calendar, User, Lock, ArrowRight, Save } from 'lucide-react';
import Waves from '../../../components/Background/Waves';

function OnboardingContent() {
    const navigate = useNavigate();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Step 0: Verify, 1: Account, 2: Personal, 3: Professional, 4: Documents, 5: Success
    const [step, setStep] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [inviteData, setInviteData] = useState<any>(null);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
        contact_number: '',
        emergency_contact: '',
        dob: '',
        current_address: '',
        permanent_address: '',
        education_details: '',
        primary_skills: '',
        secondary_skills: ''
    });

    // File States
    const [photo, setPhoto] = useState<File | null>(null);
    const [resume, setResume] = useState<File | null>(null);
    const [documents, setDocuments] = useState<File | null>(null);

    useEffect(() => {
        if (!token) {
            setError("Missing invitation token.");
            setLoading(false);
            return;
        }

        // Verify Token
        fetch('/api/onboarding/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        })
            .then(async res => {
                const data = await res.json();
                if (res.ok) {
                    setInviteData(data);
                    setStep(1); // Move to Account Setup
                } else {
                    setError(data.detail || "Invalid or expired invitation.");
                }
            })
            .catch(() => setError("Failed to verify invitation. Please check your network."))
            .finally(() => setLoading(false));
    }, [token]);

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (f: File | null) => void) => {
        if (e.target.files && e.target.files[0]) {
            setter(e.target.files[0]);
        }
    };

    const validateStep = () => {
        switch (step) {
            case 1: // Account
                if (!formData.password || !formData.confirmPassword) return alert("Please fill all fields");
                if (formData.password !== formData.confirmPassword) return alert("Passwords do not match");
                return true;
            case 2: // Personal
                if (!formData.contact_number || !formData.emergency_contact || !formData.dob || !formData.current_address || !formData.permanent_address) return alert("Please details are required");
                return true;
            case 3: // Professional
                // Skills are optional
                return true;
            case 4: // Documents
                // Optional or Required? Let's make photo required at least if we want
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (isTransitioning) return;
        if (validateStep()) {
            setIsTransitioning(true);
            setStep(step + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => setIsTransitioning(false), 800);
        }
    };

    const prevStep = () => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setStep(step - 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setIsTransitioning(false), 800);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Hard guard: Ensure we are strictly on the final step before submitting
        if (step !== 4) return;

        setSubmitting(true);
        try {
            // Use FormData for File Uploads
            const data = new FormData();
            data.append('token', token || '');
            data.append('password', formData.password);
            data.append('contact_number', formData.contact_number);
            data.append('emergency_contact', formData.emergency_contact);
            data.append('dob', formData.dob);
            data.append('current_address', formData.current_address);
            data.append('permanent_address', formData.permanent_address);
            data.append('education_details', formData.education_details);
            data.append('primary_skills', formData.primary_skills);
            data.append('secondary_skills', formData.secondary_skills);

            if (photo) data.append('photo_file', photo);
            if (resume) data.append('cv_file', resume);
            if (documents) data.append('id_proof_file', documents);

            const res = await fetch('/api/onboarding/complete', {
                method: 'POST',
                body: data
            });

            const result = await res.json();
            if (res.ok) {
                setStep(5); // Success
                setTimeout(() => navigate('/'), 3000);
            } else {
                alert(result.detail || "Failed to complete onboarding.");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-purple"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-red-900/20 border border-red-800 p-8 rounded-2xl max-w-md w-full text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-white mb-2">Invitation Error</h1>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#333] hover:bg-[#444] rounded-lg text-white transition-colors">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (step === 5) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="bg-green-900/20 border border-green-800 p-12 rounded-2xl max-w-md w-full text-center animate-fade-in-up">
                    <CheckCircle className="mx-auto text-green-500 mb-6" size={64} />
                    <h1 className="text-3xl font-bold text-white mb-4">Welcome Aboard! {inviteData?.name.split(' ')[0]}</h1>
                    <p className="text-green-200 mb-8">Your account has been set up successfully. Redirecting you to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative z-10 py-20">
            <div className="bg-[#111]/90 backdrop-blur-xl border border-[#222] p-8 md:p-12 rounded-3xl w-full max-w-3xl shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="text-center mb-10">
                    <img src="/logo.png" alt="Logo" className="h-12 mx-auto mb-6" />
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to EwandzDigital</h1>
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                        <span className="font-medium text-brand-purple">{inviteData.name}</span>
                        <span>•</span>
                        <span>{inviteData.designation || inviteData.role}</span>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between mb-2">
                        {['Account', 'Personal', 'Skills', 'Documents'].map((label, i) => (
                            <div key={i} className={`text-xs font-bold uppercase transition-colors ${step > i + 1 ? 'text-green-500' : step === i + 1 ? 'text-brand-purple' : 'text-gray-600'}`}>
                                {label}
                            </div>
                        ))}
                    </div>
                    <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-purple transition-all duration-500 ease-out"
                            style={{ width: `${((step - 1) / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-6"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && step !== 4) {
                            e.preventDefault();
                        }
                    }}
                >

                    {/* Step 1: Security */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-4">Create your secure password</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextInput
                                    label="Create Password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    icon={<Lock size={16} />}
                                    required
                                />
                                <TextInput
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    icon={<Lock size={16} />}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Personal Details */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-4">Tell us about yourself</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextInput
                                    label="Phone Number"
                                    name="contact_number"
                                    value={formData.contact_number}
                                    onChange={handleChange}
                                    icon={<Phone size={16} />}
                                    required
                                />
                                <TextInput
                                    label="Emergency Contact"
                                    name="emergency_contact"
                                    value={formData.emergency_contact}
                                    onChange={handleChange}
                                    icon={<Phone size={16} />}
                                    required
                                />
                                <TextInput
                                    label="Date of Birth"
                                    name="dob"
                                    type="date"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    icon={<Calendar size={16} />}
                                    required
                                />
                            </div>
                            <TextInput
                                label="Current Address"
                                name="current_address"
                                value={formData.current_address}
                                onChange={handleChange}
                                icon={<MapPin size={16} />}
                                required
                            />
                            <TextInput
                                label="Permanent Address"
                                name="permanent_address"
                                value={formData.permanent_address}
                                onChange={handleChange}
                                icon={<MapPin size={16} />}
                                required
                            />
                        </div>
                    )}

                    {/* Step 3: Professional Info */}
                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-4">Skills & Experience</h3>
                            <TextInput
                                label="Education / Previous Experience"
                                name="education_details"
                                value={formData.education_details}
                                onChange={handleChange}
                                icon={<Briefcase size={16} />}
                                required={false}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <TextInput
                                    label="Primary Skills (e.g. React, Communication)"
                                    name="primary_skills"
                                    value={formData.primary_skills}
                                    onChange={handleChange}
                                    required={false}
                                />
                                <TextInput
                                    label="Secondary Skills (e.g. Docker, Leadership)"
                                    name="secondary_skills"
                                    value={formData.secondary_skills}
                                    onChange={handleChange}
                                    required={false}
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Documents */}
                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="text-xl font-bold text-white mb-4">Upload Documents</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FileInput
                                    label="Profile Photo"
                                    accept="image/*"
                                    onChange={(e: any) => handleFileChange(e, setPhoto)}
                                    file={photo}
                                />
                                <FileInput
                                    label="Resume / CV"
                                    accept=".pdf,.doc,.docx"
                                    onChange={(e: any) => handleFileChange(e, setResume)}
                                    file={resume}
                                />
                                <FileInput
                                    label="ID Proof"
                                    accept=".pdf,.jpg,.png"
                                    onChange={(e: any) => handleFileChange(e, setDocuments)}
                                    file={documents}
                                />
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex gap-4 pt-6">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 py-4 rounded-xl bg-[#222] hover:bg-[#333] text-white font-bold transition-all"
                            >
                                Back
                            </button>
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={isTransitioning}
                                className={`flex-1 py-4 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-white font-bold transition-all flex items-center justify-center gap-2 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Next Step <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={submitting || isTransitioning}
                                className={`flex-1 py-4 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 text-white font-bold shadow-lg shadow-brand-purple/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 ${(submitting || isTransitioning) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {submitting ? 'Setting up...' : <><CheckCircle size={20} /> Complete Setup</>}
                            </button>
                        )}
                    </div>

                </form>

            </div>
        </div>
    );
}

const TextInput = ({ label, name, type = 'text', value, onChange, icon, required }: any) => (
    <div className="relative group">
        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block ml-1">{label} {required && <span className="text-red-500">*</span>}</label>
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-brand-purple transition-colors">
                {icon}
            </div>
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-purple transition-colors"
                placeholder={label}
            />
        </div>
    </div>
);

const FileInput = ({ label, accept, onChange, file }: any) => (
    <div className="relative group">
        <label className="text-xs text-gray-500 uppercase font-bold mb-1 block ml-1">{label}</label>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#333] rounded-xl cursor-pointer hover:border-brand-purple hover:bg-[#1a1a1a] transition-all relative overflow-hidden">
            <input type="file" className="hidden" accept={accept} onChange={onChange} />
            {file ? (
                <div className="flex flex-col items-center p-2 text-center">
                    <CheckCircle className="text-green-500 mb-2" size={24} />
                    <span className="text-xs text-green-400 font-bold truncate max-w-[120px]">{file.name}</span>
                </div>
            ) : (
                <div className="flex flex-col items-center text-gray-500">
                    <span className="mb-2 text-2xl">+</span>
                    <span className="text-xs">Upload</span>
                </div>
            )}
        </label>
    </div>
);


export default function Onboard() {
    return (
        <div className="min-h-screen bg-black relative">
            <Waves
                lineColor="#230a46ff"
                backgroundColor="rgba(0, 0, 0, 0.2)"
                waveSpeedX={0.02}
                waveSpeedY={0.01}
                waveAmpX={40}
                waveAmpY={20}
                className="fixed top-0 left-0 w-full h-screen z-0 pointer-events-none"
            />
            <Suspense fallback={<div className="text-white text-center pt-20">Loading...</div>}>
                <OnboardingContent />
            </Suspense>
        </div>
    );
}
