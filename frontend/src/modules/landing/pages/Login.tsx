'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Mail, X, CheckCircle } from 'lucide-react';
import DarkVeil from '../../../components/Background/DarkVeil';
import DecryptedText from '../../../components/Text Animation/DecryptedText';
import Cookies from 'js-cookie';
import { useAuth } from '../../../core/auth/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Set Auth Cookie for Middleware Protection
        Cookies.set('auth_token', 'logged-in', { expires: 1 }); // Expires in 1 day

        // Update global auth state
        login(data.user);

        navigate('/dashboard');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Main Container: Centers everything vertically and horizontally on the screen
    <div className="relative flex min-h-screen items-center justify-center bg-brand-black overflow-hidden">

      {/* Background Animation */}
      <div className="absolute inset-0 z-0 h-full w-full">
        <div style={{ width: '100%', height: '600px', position: 'relative' }}>
          <DarkVeil />
        </div>
      </div>

      {/* Login Card: The main white/dark box holding the form */}
      <div className="relative z-12 w-150 max-w-lg rounded-xl bg-card-bg/90 backdrop-blur-sm border border-border-color p-8 shadow-2xl">

        {/* Header Section: Icon + Title */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-black border-2 border-brand-purple">
            <img src="/icon.jpeg" alt="Brand Logo" className="h-10 w-10 object-contain" />
          </div>
          <div style={{ marginTop: '4rem', fontFamily: 'BBH Bartle', fontSize: '2rem' }}>
            <DecryptedText
              text="Lets Log you in....."
              animateOn="view"
              revealDirection="start"
              speed={80}
              maxIterations={15}
            // useOriginalCharsOnly={true}
            />
          </div>
        </div>

        {/* Error Alert: Shows up only if login fails */}
        {error && (
          <div className="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800">
            {error}
          </div>
        )}

        {/* The Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* Username Field */}
          <div>
            <label className="text-sm font-medium text-gray-300">Username</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-border-color bg-input-bg py-2 pl-10 pr-4 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-white placeholder-gray-500"
                placeholder="Enter username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="text-sm font-medium text-gray-300">Password</label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border-color bg-input-bg py-2 pl-10 pr-4 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-white placeholder-gray-500"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-brand-purple hover:text-purple-400 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm bg-brand-purple py-3 font-bold text-white uppercase transition hover:bg-transparent hover:text-brand-purple border-2 border-brand-purple disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Text */}
        <div className="mt-6 text-center text-xs text-gray-400">
          EwandzDigital HRMS &copy; 2025
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}

// Forgot Password Modal Component
function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || 'Failed to send reset link');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl bg-card-bg border border-border-color p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {!success ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-full bg-brand-purple/20">
                  <Lock size={24} className="text-brand-purple" />
                </div>
                <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
              </div>
              <p className="text-sm text-gray-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-md bg-red-900/50 p-3 text-sm text-red-200 border border-red-800">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300">Email Address</label>
                <div className="relative mt-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border-color bg-input-bg py-2 pl-10 pr-4 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-white placeholder-gray-500"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-border-color bg-transparent py-2 font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-brand-purple py-2 font-medium text-white hover:bg-purple-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center py-6">
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-green-900/20">
                  <CheckCircle size={48} className="text-green-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Check Your Email</h3>
              <p className="text-gray-400 mb-6">
                If an account exists with <strong className="text-white">{email}</strong>, you'll receive a password reset link shortly.
              </p>
              <button
                onClick={onClose}
                className="w-full rounded-lg bg-brand-purple py-2 font-medium text-white hover:bg-purple-600 transition-colors"
              >
                Got it!
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
