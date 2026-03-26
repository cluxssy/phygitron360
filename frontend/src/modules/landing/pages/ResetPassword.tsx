'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DarkVeil from '../../../components/Background/DarkVeil';

function ResetPasswordContent() {
    const navigate = useNavigate();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    // Verify token on mount
    useEffect(() => {
        if (!token) {
            setError('Invalid reset link');
            setVerifying(false);
            return;
        }

        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            const res = await fetch('/api/auth/verify-reset-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (res.ok && data.valid) {
                setTokenValid(true);
                setUserEmail(data.email);
            } else {
                setError(data.message || 'Invalid or expired reset link');
                setTokenValid(false);
            }
        } catch (err) {
            setError('Network error. Please try again.');
            setTokenValid(false);
        } finally {
            setVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    new_password: newPassword,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setError(data.detail || 'Failed to reset password');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getPasswordStrength = (password: string) => {
        if (password.length === 0) return { strength: 0, label: '', color: '' };
        if (password.length < 6) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
        if (password.length < 10) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
        if (password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
            return { strength: 3, label: 'Strong', color: 'bg-green-500' };
        }
        return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    };

    const passwordStrength = getPasswordStrength(newPassword);

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-brand-black overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0 h-full w-full">
                <div style={{ width: '100%', height: '600px', position: 'relative' }}>
                    <DarkVeil />
                </div>
            </div>

            {/* Main Card */}
            <div className="relative z-12 w-full max-w-md rounded-xl bg-card-bg/90 backdrop-blur-sm border border-border-color p-8 shadow-2xl mx-4">

                {verifying ? (
                    // Loading State
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple mx-auto mb-4"></div>
                        <p className="text-gray-400">Verifying reset link...</p>
                    </div>
                ) : !tokenValid ? (
                    // Invalid Token State
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-red-900/20">
                                <XCircle size={48} className="text-red-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h2>
                        <p className="text-gray-400 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full rounded-lg bg-brand-purple py-2 font-medium text-white hover:bg-purple-600 transition-colors"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : success ? (
                    // Success State
                    <div className="text-center py-6">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 rounded-full bg-green-900/20">
                                <CheckCircle size={48} className="text-green-500" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
                        <p className="text-gray-400 mb-6">
                            Your password has been updated. Redirecting to login...
                        </p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple mx-auto"></div>
                    </div>
                ) : (
                    // Reset Password Form
                    <>
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 rounded-full bg-brand-purple/20">
                                    <Lock size={24} className="text-brand-purple" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                            </div>
                            <p className="text-sm text-gray-400">
                                Enter your new password for <strong className="text-white">{userEmail}</strong>
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800 flex items-start gap-2">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* New Password */}
                            <div>
                                <label className="text-sm font-medium text-gray-300">New Password</label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <Lock size={18} />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-lg border border-border-color bg-input-bg py-2 pl-10 pr-10 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-white placeholder-gray-500"
                                        placeholder="Enter new password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {newPassword && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1 flex-1 rounded-full ${level <= passwordStrength.strength
                                                            ? passwordStrength.color
                                                            : 'bg-gray-700'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400">
                                            Password strength: <span className={`font-medium ${passwordStrength.strength === 3 ? 'text-green-500' :
                                                    passwordStrength.strength === 2 ? 'text-yellow-500' : 'text-red-500'
                                                }`}>{passwordStrength.label}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="text-sm font-medium text-gray-300">Confirm Password</label>
                                <div className="relative mt-1">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                        <Lock size={18} />
                                    </span>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-lg border border-border-color bg-input-bg py-2 pl-10 pr-4 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-white placeholder-gray-500"
                                        placeholder="Confirm new password"
                                        required
                                    />
                                </div>
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || newPassword !== confirmPassword}
                                className="w-full rounded-lg bg-brand-purple py-3 font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Resetting Password...' : 'Reset Password'}
                            </button>
                        </form>

                        {/* Back to Login */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => navigate('/')}
                                className="text-sm text-gray-400 hover:text-brand-purple transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-brand-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
