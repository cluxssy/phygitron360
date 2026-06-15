import React from 'react';
import { Shield, Activity, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useLocation } from 'react-router-dom';

import ManageAssessments from './ManageAssessments';
import AssessmentBuilder from './AssessmentBuilder';
import AssessmentTaker from './AssessmentTaker';
import ResultScreen from './ResultScreen';
import AssessmentAnalytics from './AssessmentAnalytics';
import CandidateDashboard from './CandidateDashboard';
import { useNavigate } from 'react-router-dom';

import "../../../styles/light-theme-override.css";
import logo from "../../../assets/phy360.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";
import { getHubTabs } from "../../../core/navigation/hubTabs";

export default function VerifyDashboard() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['org_admin', 'manager', 'assessor']);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, logout } = useAuth();
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab') || (isAdmin ? 'manage' : 'candidate');
  const asmId = params.get('id');

  const setTab = (t) => navigate(`/verify?tab=${t}`);
  const displayName = user?.name || user?.email?.split('@')[0] || "User";

  const appModules = getHubTabs({ hasPermission, hasRole });

  // Dynamic role display based on actual user roles
  const getRoleDisplay = () => {
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organisation Admin';
    if (hasRole?.('manager')) return 'Manager';
    if (hasRole?.('assessor')) return 'Assessor';
    return 'Employee';
  };

  const renderContent = () => {
    switch (tab) {
      case 'manage': return <ManageAssessments />;
      case 'builder': return <AssessmentBuilder />;
      case 'take': return <AssessmentTaker />;
      case 'result': return <ResultScreen />;
      case 'analytics': return <AssessmentAnalytics assessmentId={asmId} />;
      case 'candidate': return <CandidateDashboard />;
      default: return isAdmin ? <ManageAssessments /> : <CandidateDashboard />;
    }
  };

  return (
    <div className="dashboard-page light-theme-override">
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
          <img src={bellIcon} className="icon" alt="bell" />
          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="logout"
            onClick={() => { logout(); navigate('/login'); }}
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

      <div className="dashboard-body">
        <div className="sidebar">
          {isAdmin && <button className={tab === 'manage' ? 'active' : ''} onClick={() => setTab('manage')}>Manage</button>}
          {isAdmin && <button className={tab === 'builder' ? 'active' : ''} onClick={() => setTab('builder')}>Builder</button>}
          {isAdmin && <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>Analytics</button>}
          {!isAdmin && <button className={tab === 'candidate' ? 'active' : ''} onClick={() => setTab('candidate')}>My Assessments</button>}
        </div>
        
        <div className="content">
          <div className="flex flex-col gap-8">
      {/* 🚀 Verify Hero */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-primary/20 rounded-[40px] blur-xl opacity-50"></div>
        <div className="section-card p-10 border-white/5 relative overflow-hidden bg-[#060E20]/50">
          <div className="absolute top-[-100px] right-[-100px] w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px]"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-3 flex items-center gap-2">
                <Shield size={12} />
                Skills Assessment // Verification Module
              </p>
              <h1 className="text-4xl font-display font-black text-white uppercase tracking-tighter italic leading-none">
                Performance <span className="text-primary italic">Verification</span>
              </h1>
            </div>
            
            <div className="flex gap-4">
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Authenticity</p>
                  <p className="text-xl font-display font-black text-emerald-400">100%</p>
               </div>
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center">
                  <p className="text-xs font-black text-white/40 uppercase tracking-widest text-[9px] mb-1">Status</p>
                  <p className="text-xl font-display font-black text-primary">Active</p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 Main Assessment Area */}
      <div className="animate-fade-in-up transition-all delay-200">
        {renderContent()}
      </div>

      {/* 🚀 Guidance Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
        <div className="section-card p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-primary shrink-0"><Activity size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">Assessment results are analyzed against performance benchmarks.</p>
        </div>
        <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-indigo-400 shrink-0"><Shield size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">All evaluations are cryptographically signed by management.</p>
        </div>
        <div className="glass-panel p-6 border-white/5 flex gap-4 items-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-secondary shrink-0"><CheckCircle size={20}/></div>
          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest leading-relaxed">Quarterly syncs ensure continuous mission alignment.</p>
        </div>
      </div>
      </div>
        </div>
      </div>
    </div>
  );
}
