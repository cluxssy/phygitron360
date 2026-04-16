import React, { useState } from 'react';
import { Lock, Zap, ArrowRight, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChangePasswordModal({ onClose, forceUpdate = false }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Key mismatch.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.detail || 'Failed to change password');
      
      toast.success('Security matrix updated.');
      if (onClose) onClose();
      else window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="relative z-10 w-full max-w-md animate-fade-in-up glass-panel border-white/10 rounded-3xl p-8 shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
        {!forceUpdate && (
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        )}

        <div className="mb-8">
           <h2 className="text-2xl font-display font-extrabold text-white mb-2 uppercase">
              {forceUpdate ? 'Mandatory Reset' : 'Update Matrix Key'}
           </h2>
           <p className="text-[10px] font-bold uppercase tracking-widest text-[#CC97FF] opacity-70">
              {forceUpdate ? 'Your security clearance requires a new key.' : 'Enhance your access security.'}
           </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-error/10 p-4 text-xs text-[#FFB4AB] border border-error/20 flex gap-3 items-center animate-shake">
             <Zap size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Current Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">New Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">Confirm New Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/5 bg-white/5 py-4 pl-12 pr-4 text-white placeholder-white/20 transition-all focus:border-primary/40 focus:bg-white/10 outline-none font-medium text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-primary text-black font-extrabold text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-[0_10px_30px_rgba(204,151,255,0.3)] hover:bg-white hover:shadow-white/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {loading ? 'Processing...' : 'Secure Node'}
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
