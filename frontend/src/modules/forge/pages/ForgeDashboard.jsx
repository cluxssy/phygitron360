import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNotifications } from '../../../core/context/NotificationContext';
import { P } from '../../../core/permissions';
import { getHubTabs } from '../../../core/navigation/hubTabs';
import { getInitials } from '../../../core/utils/nameHelpers';

import LearnerOverviewPanel from '../components/LearnerOverviewPanel';
import CourseLibrary from './CourseLibrary';
import ManageCourses from './ManageCourses';
import TeamAnalytics from './TeamAnalytics';
import Transcript from './Transcript';
import MyCourses from './MyCourses';
import AdminJourneys from './AdminJourneys';
import UserJourney from './UserJourney';

import "../styles/forge.css";
import logo from "../../../assets/phy360.png";
import ewandzLogo from "../../../assets/EWANDZ.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";

const STRICT_MANAGEMENT_TABS = ['analytics', 'my-courses', 'journeys'];
const STRICT_PERSONAL_TABS = ['dashboard', 'journey', 'transcript'];
const MANAGEMENT_TABS = ['analytics', 'my-courses', 'journeys'];
const PERSONAL_TABS = ['dashboard', 'library', 'journey', 'transcript'];
const LEARNER_TABS = PERSONAL_TABS;

export default function ForgeDashboard({ initialTab, initialView }) {
  const { user, hasPermission, hasRole, logout } = useAuth();
  const { setShowNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  // Clearance check for management capabilities
  const hasManagementClearance = 
    hasPermission?.(P.FORGE_COURSES_MANAGE) || 
    hasRole?.(['org_admin', 'super_admin', 'manager', 'instructor', 'hr']);

  const normalizeView = (v) => {
    if (!v) return null;
    if (v === 'learner' || v === 'personal') return 'personal';
    if (v === 'management' || v === 'admin') return 'management';
    return v;
  };

  // Initial view selection
  const [forgeView, setForgeView] = useState(() => {
    const urlView = normalizeView(params.get('view')) || normalizeView(initialView);
    if (urlView) {
      if (urlView === 'management' && !hasManagementClearance) return 'personal';
      return urlView;
    }
    const tabParam = params.get('tab') || initialTab;
    if (tabParam) {
      if (STRICT_MANAGEMENT_TABS.includes(tabParam) && hasManagementClearance) {
        return 'management';
      }
      if (STRICT_PERSONAL_TABS.includes(tabParam)) {
        return 'personal';
      }
    }
    return hasManagementClearance ? 'management' : 'personal';
  });

  // Current active tab
  const currentTab = params.get('tab') || initialTab || (forgeView === 'management' ? 'analytics' : 'dashboard');

  const setTab = (tab) => {
    navigate(`/forge?tab=${tab}&view=${forgeView}`);
  };

  const modules = getHubTabs({ hasPermission, hasRole });

  const displayName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    user?.email?.split('@')[0] ||
    "User";

  const getRoleDisplay = () => {
    if (forgeView === 'personal' || forgeView === 'learner') return 'Personal Learning';
    if (hasRole?.('super_admin')) return 'Super Admin';
    if (hasRole?.('org_admin')) return 'Organization Admin';
    if (hasRole?.('manager')) return 'Manager';
    if (hasRole?.('instructor')) return 'Instructor';
    return 'Learning Portal';
  };

  // Keep view aligned if external navigation / deep link occurs
  useEffect(() => {
    const urlView = normalizeView(params.get('view'));
    if (urlView && urlView !== forgeView) {
      if (urlView === 'management' && hasManagementClearance) {
        setForgeView('management');
      } else if (urlView === 'personal') {
        setForgeView('personal');
      }
      return;
    }

    const tabParam = params.get('tab');
    if (tabParam) {
      if (STRICT_MANAGEMENT_TABS.includes(tabParam) && hasManagementClearance && forgeView !== 'management') {
        setForgeView('management');
      } else if (STRICT_PERSONAL_TABS.includes(tabParam) && forgeView !== 'personal') {
        setForgeView('personal');
      }
    }
  }, [location.search, hasManagementClearance, forgeView]);

  // Render the selected tab's panel content
  const renderActivePanel = () => {
    if (forgeView === 'management') {
      switch (currentTab) {
        case 'analytics':
          return <TeamAnalytics embedded={true} />;
        case 'my-courses':
          return <ManageCourses embedded={true} />;
        case 'journeys':
          return <AdminJourneys embedded={true} />;
        default:
          return <TeamAnalytics embedded={true} />;
      }
    } else {
      switch (currentTab) {
        case 'dashboard':
          return <LearnerOverviewPanel onSwitchTab={setTab} />;
        case 'library':
          return <CourseLibrary embedded={true} />;
        case 'journey':
          return <UserJourney embedded={true} />;
        case 'transcript':
          return <Transcript embedded={true} />;
        default:
          return <LearnerOverviewPanel onSwitchTab={setTab} />;
      }
    }
  };

  return (
    <div className="dashboard-page">
      {/* =========================================
          TOPBAR (Aligned with Employee Central)
      ========================================= */}
      <div className="topbar">
        <div className="top-left">
          <img
            src={logo}
            className="logo cursor-pointer"
            alt="logo"
            onClick={() => navigate('/forge')}
          />
        </div>

        <div className="top-center">
          <div className="hub-tabs">
            {modules.map((m) => (
              <button
                key={m.id}
                className={`hub-tab ${
                  location.pathname.startsWith(m.path)
                    ? "active"
                    : ""
                }`}
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
            aria-label="Open notifications"
            onClick={() => setShowNotifications(true)}
          />

          <img
            src={logoutIcon}
            className="icon logout-icon"
            alt="logout"
            aria-label="Log out"
            onClick={() => {
              logout();
              navigate('/');
            }}
          />

          <div className="profile-wrap">
            <div className="avatar">
              {user?.photo_path ? (
                <img src={`/api/employee/${user.employee_code}/document/pfp`} alt="" />
              ) : (
                getInitials(displayName)
              )}
            </div>

            <div className="profile-text">
              <h4>{displayName}</h4>
              <p>{getRoleDisplay()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================
          BODY (Sidebar + Content Canvas)
      ========================================= */}
      <div className="dashboard-body">
        {/* =========================================
            SIDEBAR (Matching Employee Central)
        ========================================= */}
        <div className="sidebar" data-no-tooltip>
          {/* VIEW TOGGLE (Management vs Personal) */}
          {hasManagementClearance && (
            <div className="w-full flex bg-[#f3f0ff] p-1 rounded-2xl border border-[#ebe4ff] mb-6 overflow-hidden">
              <button
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  forgeView === 'management'
                    ? '!bg-black !text-white shadow-md'
                    : 'text-black/60 hover:bg-white'
                }`}
                onClick={() => {
                  setForgeView('management');
                  const nextTab = 'analytics';
                  navigate(`/forge?tab=${nextTab}&view=management`);
                }}
              >
                Management
              </button>

              <button
                className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                  forgeView === 'personal' || forgeView === 'learner'
                    ? '!bg-black !text-white shadow-md'
                    : 'text-black/60 hover:bg-white'
                }`}
                onClick={() => {
                  setForgeView('personal');
                  const nextTab = currentTab === 'library' ? 'library' : 'dashboard';
                  navigate(`/forge?tab=${nextTab}&view=personal`);
                }}
              >
                Personal
              </button>
            </div>
          )}

          {/* SIDEBAR BUTTONS */}
          {forgeView === 'management' ? (
            <>
              <button
                className={currentTab === 'analytics' ? 'active' : ''}
                onClick={() => setTab('analytics')}
              >
                Analytics
              </button>

              <button
                className={currentTab === 'my-courses' ? 'active' : ''}
                onClick={() => setTab('my-courses')}
              >
                Manage Courses
              </button>
              <button
                className={currentTab === 'journeys' ? 'active' : ''}
                onClick={() => setTab('journeys')}
              >
                Journeys
              </button>
            </>
          ) : (
            <>
              <button
                className={currentTab === 'dashboard' ? 'active' : ''}
                onClick={() => setTab('dashboard')}
              >
                Dashboard
              </button>

              <button
                className={currentTab === 'library' ? 'active' : ''}
                onClick={() => setTab('library')}
              >
                Course Library
              </button>

              <button
                className={currentTab === 'journey' ? 'active' : ''}
                onClick={() => setTab('journey')}
              >
                My Journey
              </button>

              <button
                className={currentTab === 'transcript' ? 'active' : ''}
                onClick={() => setTab('transcript')}
              >
                Transcript
              </button>
            </>
          )}

          <div className="sidebar-brand">
            <img src={ewandzLogo} alt="Ewandz" />
          </div>
        </div>

        {/* =========================================
            MAIN CONTENT
        ========================================= */}
        <div className="content">
          {renderActivePanel()}
        </div>
      </div>
    </div>
  );
}