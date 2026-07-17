import React, { useState } from 'react';
import { Shield, Activity, CheckCircle, LayoutDashboard, User } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

import ManageAssessments from './ManageAssessments';
import AssessmentBuilder from './AssessmentBuilder';
import AssessmentTaker from './AssessmentTaker';
import ResultScreen from './ResultScreen';
import AssessmentAnalytics from './AssessmentAnalytics';
import CandidateDashboard from './CandidateDashboard';
import QuestionBank from './QuestionBank';
import LiveMonitor from './LiveMonitor';
import AssessmentDashboard from './AssessmentDashboard';

import "../../../styles/light-theme-override.css";
import logo from "../../../assets/phy360.png";
import ewandzLogo from "../../../assets/EWANDZ.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";
import { getHubTabs } from "../../../core/navigation/hubTabs";
import { useNotifications } from '../../../core/context/NotificationContext';

export default function VerifyDashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['org_admin', 'manager', 'assessor']);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, logout } = useAuth();
  const { setShowNotifications } = useNotifications();
  const params = new URLSearchParams(location.search);
  
  // Default to candidate if not admin
  const tab = params.get('tab') || (isAdmin ? 'dashboard' : 'candidate');

  // NEW: Add a view toggle for admins, just like Deploy module
  const [verifyView, setVerifyView] = useState(isAdmin ? 'management' : 'personal');

  const setTab = (t) => navigate(`/verify?tab=${t}`);
  const displayName = user?.name || user?.email?.split('@')[0] || "User";

  const appModules = getHubTabs({ hasPermission, hasRole });

  // Dynamic role display based on actual user roles and view
  const getRoleDisplay = () => {
    if (verifyView === 'personal') return 'Candidate Portal';
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organisation Admin';
    if (hasRole?.('manager')) return 'Manager';
    if (hasRole?.('assessor')) return 'Assessor';
    return 'Employee';
  };

  const renderContent = () => {
    if (verifyView === 'personal') {
      if (tab === 'take') return <AssessmentTaker />;
      if (tab === 'result') return <ResultScreen />;
      return <CandidateDashboard />;
    }

    switch (tab) {
      case 'dashboard': return <AssessmentDashboard />;
      case 'manage': return <ManageAssessments />;
      case 'builder': return <AssessmentBuilder />;
      case 'take': return <AssessmentTaker />;
      case 'result': return <ResultScreen />;
      case 'analytics': return <AssessmentAnalytics assessmentId={params.get('id')} />;
      case 'bank': return <QuestionBank />;
      case 'live': return <LiveMonitor />;
      case 'candidate': return <CandidateDashboard />;
      default: return isAdmin ? <ManageAssessments /> : <CandidateDashboard />;
    }
  };

  // Show header for dashboard, manage, and candidate tabs
  const showHeader = (verifyView === 'management' && (tab === 'dashboard' || tab === 'manage')) || verifyView === 'personal';

  // ── KPI Cards for Header (Admin) ──
  const [headerStats, setHeaderStats] = React.useState({ total: 0, active: 0, submissions: 0 });
  const [loadingStats, setLoadingStats] = React.useState(true);

  React.useEffect(() => {
    if (isAdmin && verifyView === 'management' && showHeader) {
      const fetchHeaderStats = async () => {
        try {
          const [assessmentsRes, submissionsRes] = await Promise.all([
            fetch('/api/verify/builder/assessments', { credentials: 'include' }),
            fetch('/api/verify/submissions/recent', { credentials: 'include' })
          ]);
          const assessments = await assessmentsRes.json();
          const submissions = await submissionsRes.json();
          setHeaderStats({
            total: (assessments.data || []).length,
            active: (assessments.data || []).filter(a => a.status?.toLowerCase() === 'active').length,
            submissions: (submissions.data || []).length
          });
        } catch { /* silent */ }
        finally { setLoadingStats(false); }
      };
      fetchHeaderStats();
    }
  }, [isAdmin, verifyView, showHeader]);

  return (
    <div className="dashboard-page light-theme-override" style={{ backgroundColor: '#FFFFFF' }}>
      {/* TOPBAR - UNCHANGED */}
      <div className="topbar">
        <div className="top-left">
          <img src={logo} className="logo" alt="logo" />
        </div>
        <div className="top-center">
          <div className="hub-tabs">
            {appModules.map((m) => (
              <button
                key={m.id}
                className={`hub-tab ${location.pathname.startsWith(m.path) ? "active" : ""}`}
                onClick={() => navigate(m.path)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="top-right">
          <img 
            src={bellIcon} 
            className="icon cursor-pointer" 
            alt="bell" 
            onClick={() => setShowNotifications(true)}
          />
          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="logout"
            onClick={() => { logout(); navigate('/'); }}
          />
          <div className="profile-wrap">
            <div className="avatar">{displayName?.charAt(0)?.toUpperCase()}</div>
            <div className="profile-text">
              <h4>{displayName}</h4>
              <p>{getRoleDisplay()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="dashboard-body">
        {/* SIDEBAR */}
        <div className="sidebar">
          {isAdmin && (
            <div className="w-full flex bg-[#f3f0ff] p-1 rounded-xl border border-[#ebe4ff] mb-6">
              <button
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  verifyView === 'management'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
                onClick={() => { setVerifyView('management'); setTab('dashboard'); }}
              >
                <Shield size={14} className="inline mr-1" /> Admin
              </button>
              <button
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  verifyView === 'personal'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
                onClick={() => { setVerifyView('personal'); setTab('candidate'); }}
              >
                <User size={14} className="inline mr-1" /> Personal
              </button>
            </div>
          )}

          {verifyView === 'management' && isAdmin && (
            <>
              <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
                Dashboard
              </button>
              <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')}>Manage</button>
              <button className={tab === 'builder' ? 'active' : ''} onClick={() => setTab('builder')}>Builder</button>
              <button className={tab === 'bank' ? 'active' : ''} onClick={() => setTab('bank')}>Question Bank</button>
              <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>Analytics</button>
              <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>Live Monitor</button>
            </>
          )}

          {verifyView === 'personal' && (
            <>
              <button className={tab === 'candidate' ? 'active' : ''} onClick={() => setTab('candidate')}>
                <LayoutDashboard size={14} className="inline mr-2" /> Dashboard
              </button>
              <button className={tab === 'candidate' ? 'active' : ''} onClick={() => setTab('candidate')}>My Assessments</button>
            </>
          )}
          <div className="sidebar-brand">
            <img src={ewandzLogo} alt="Ewandz" />
          </div>
        </div>
        
        {/* CONTENT */}
        <div className="content" style={{ backgroundColor: '#FFFFFF', padding: '24px' }}>
          <div className="flex flex-col gap-6">
            {/* Header - Only shows for Manage and Candidate tabs */}
            {showHeader && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#7c3aed] mb-3">
                  {verifyView === 'management' ? 'ASSESSMENT CENTRAL' : 'CANDIDATE PORTAL'}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                      {verifyView === 'management' 
                        ? (tab === 'dashboard' ? 'Dashboard' : 'Skills Assessment') 
                        : 'My Assessments'}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      {verifyView === 'management'
                        ? (tab === 'dashboard' 
                            ? 'Overview of all assessment activities and performance metrics'
                            : 'Create, manage, and evaluate skills assessments for candidates and employees.')
                        : 'View and take your assigned skills assessments.'
                      }
                    </p>
                  </div>
                  {verifyView === 'management' && isAdmin && tab !== 'dashboard' && (
                    <button 
                      onClick={() => setTab('builder')}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors duration-150 shadow-sm"
                    >
                      <Shield size={16} /> New Assessment
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="animate-fade-in-up transition-all delay-200">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
