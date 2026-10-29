import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, Layers, Award, BarChart2, GitFork, PlusCircle,
  PlayCircle, Clock
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNotifications } from '../../../core/context/NotificationContext';
import { P } from '../../../core/permissions';
import { getHubTabs } from '../../../core/navigation/hubTabs';
import { getInitials } from '../../../core/utils/nameHelpers';

import logo from '../../../assets/phy360.png';
import bellIcon from '../../../assets/bell.png';
import logoutIcon from '../../../assets/exit.png';

export default function ForgeHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, hasRole, logout } = useAuth();
  const { setShowNotifications } = useNotifications();

  const isManager = hasPermission(P.FORGE_COURSES_MANAGE) || hasRole(['org_admin', 'manager', 'instructor', 'super_admin']);
  const displayName = user?.name || user?.full_name || user?.email?.split('@')[0] || 'User';
  const appModules = getHubTabs({ hasPermission, hasRole });

  const getRoleDisplay = () => {
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organization Admin';
    if (hasRole?.('manager')) return 'Manager';
    if (hasRole?.('trainer')) return 'Trainer';
    return 'Learner';
  };

  const navItems = [
    { label: 'My Learning', path: '/forge', icon: PlayCircle },
    { label: 'Course Library', path: '/forge/library', icon: Layers },
    { label: 'Transcript', path: '/forge/transcript', icon: Award },
    { label: 'My Journey', path: '/journey/my-path', icon: GitFork },
    ...(isManager ? [
      { label: 'Manage Courses', path: '/forge/my-courses', icon: BookOpen },
      { label: 'Team Analytics', path: '/forge/team', icon: BarChart2 },
      { label: 'Admin Journeys', path: '/admin/journeys', icon: GitFork },
    ] : []),
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
        <div className="top-left" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logo} className="logo" alt="Phygitron 360" style={{ height: 32, cursor: 'pointer' }} onClick={() => navigate('/forge')} />
        </div>

        <div className="top-center">
          <div className="hub-tabs" style={{ display: 'flex', gap: 8 }}>
            {appModules.map((m) => (
              <button
                key={m.id}
                className={`hub-tab ${location.pathname.startsWith(m.path) ? 'active' : ''}`}
                onClick={() => navigate(m.path)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: location.pathname.startsWith(m.path) ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
                  color: location.pathname.startsWith(m.path) ? '#7c3aed' : '#4b5563',
                  transition: 'all 0.15s ease'
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        <div className="top-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={bellIcon}
            className="icon"
            alt="Notifications"
            style={{ width: 22, height: 22, cursor: 'pointer' }}
            onClick={() => setShowNotifications?.(prev => !prev)}
          />
          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="Log out"
            style={{ width: 20, height: 20, cursor: 'pointer' }}
            onClick={() => { logout(); navigate('/'); }}
          />
          <div className="profile-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              className="avatar"
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}
            >
              {user?.photo_path ? (
                <img src={`/api/employee/${user.employee_code}/document/pfp`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div className="profile-text" style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{displayName}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{getRoleDisplay()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Bar for Learning Central ──────────────────────── */}
      <div style={{ background: '#faf5ff', borderBottom: '1px solid #ede9fe', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', marginRight: 12 }}>
          Learning Central
        </span>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#ffffff' : '#5b21b6',
                background: isActive ? '#7c3aed' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
