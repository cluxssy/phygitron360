import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import '../styles/login.css';

export default function ForceChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  
  useEffect(() => {
    if (!user || !user.password_must_change) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user || !user.password_must_change) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Update user state to remove must_change flag so they can proceed
        login({ ...user, password_must_change: false });
        
        const uRoles = (user.roles || [user.role]).map(r => r ? r.toLowerCase() : '');
        if (uRoles.includes('super_admin')) navigate('/superadmin');
        else if (uRoles.includes('org_admin')) navigate('/admin');
        else if (uRoles.includes('manager')) navigate('/deploy?tab=team');
        else if (uRoles.includes('candidate')) navigate('/source?tab=my-application');
        else navigate('/deploy');
      } else {
        setError(data.detail || data.message || 'Failed to change password.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-right" style={{ width: '100%' }}>
        <div className="login-box" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <h2>Action Required</h2>
          <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px' }}>
            Your account was created with a temporary password. You must change your password to continue.
          </p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label>Current/Temporary Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            
            <label>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading} style={{ marginTop: '20px' }}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
