import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/login.css';
import loginImg from "../../../assets/login.png";
import hideIcon from "../../../assets/hide.png";
import viewIcon from "../../../assets/view.png";
import { validatePassword } from '../../../core/utils/validators';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenChecking, setTokenChecking] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  useEffect(() => {
    if (!token) {
        setError('No access token provided.');
        setTokenChecking(false);
        return;
    }
    
    // Check token validity
    fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
        if (data.valid) {
            setTokenValid(true);
        } else {
            setError('Invalid or expired token.');
        }
    })
    .catch(() => setError('Connection failed.'))
    .finally(() => setTokenChecking(false));

  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
        setError(passwordError);
        return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || data.detail || 'Reset failed');
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (tokenChecking) {
    return (
      <div className="login-page">
        <div className="login-left">
          <img src={loginImg} alt="login visual" />
        </div>
        <div className="login-right">
          <div className="login-box">
            <p>Verifying link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid && !success) {
    return (
      <div className="login-page">
        <div className="login-left">
          <img src={loginImg} alt="login visual" />
        </div>
        <div className="login-right">
          <div className="login-box">
            <h2>Invalid Link</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>{error}</p>
            <button onClick={() => navigate('/')} style={{ width: '100%', padding: '12px', backgroundColor: '#CC97FF', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-left">
          <img src={loginImg} alt="login visual" />
        </div>
        <div className="login-right">
          <div className="login-box">
            <h2>Success!</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Your password has been reset successfully.</p>
            <button onClick={() => navigate('/')} style={{ width: '100%', padding: '12px', backgroundColor: '#CC97FF', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Log In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <img src={loginImg} alt="login visual" />
      </div>

      <div className="login-right">
        <div className="login-box">
          <div className="back" onClick={() => navigate("/")}>
            ←
          </div>

          <h2>Reset your password</h2>

          {error && (
            <div className="error-box">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label>New Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: '50px', width: '100%' }}
              />

              <img
                src={showPassword ? hideIcon : viewIcon}
                alt="toggle password"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '42%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'opacity 0.2s ease'
                }}
              />
            </div>

            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={{ paddingRight: '50px', width: '100%' }}
              />

              <img
                src={showConfirmPassword ? hideIcon : viewIcon}
                alt="toggle password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '42%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  opacity: 0.7,
                  transition: 'opacity 0.2s ease'
                }}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
