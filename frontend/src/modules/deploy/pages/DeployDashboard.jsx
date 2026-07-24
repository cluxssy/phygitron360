import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNotifications } from '../../../core/context/NotificationContext';
import PerformancePanel from '../components/PerformancePanel';
import AssetsPanel from '../components/AssetsPanel';
import OnboardingPanel from '../components/OnboardingPanel';
import EmployeeDashboard from '../components/EmployeeDashboard';
import AttendancePanel from '../components/AttendancePanel';
import DeployAnalytics from '../components/DeployAnalytics';
import EmployeeDirectory from '../components/EmployeeDirectory';
import MyProfile from '../components/MyProfile';
import EmployeeProfileFull from '../components/EmployeeProfileFull';
import PayrollPanel from '../components/PayrollPanel';
import MyPayrollPanel from '../components/MyPayrollPanel';
import InternalOpportunitiesPanel from '../components/InternalOpportunitiesPanel';
import "../styles/deploy.css";
import useTabListKeyNav from '../../../core/hooks/useTabListKeyNav';

import logo from "../../../assets/phy360.png";
import ewandzLogo from "../../../assets/EWANDZ.png";
import bellIcon from "../../../assets/bell.png";
import logoutIcon from "../../../assets/exit.png";

import { getHubTabs } from "../../../core/navigation/hubTabs";

export default function DeployDashboard() {

  const { user, hasPermission, hasRole, logout } = useAuth();
  const { setShowNotifications } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);

  /* =========================================
     ROLE / VIEW CONTROL
  ========================================= */

  const isOrgAdmin =
    hasPermission?.('deploy.dashboard.view_admin');

  const [deployView, setDeployView] = useState(
    isOrgAdmin ? 'management' : 'employee'
  );

  const panelMode =
  deployView === 'management'
    ? 'admin'
    : 'employee';

  /* =========================================
     MODULES
  ========================================= */

  const modules = getHubTabs({ hasPermission, hasRole });

  /* =========================================
     PERMISSIONS
  ========================================= */

  const canViewDashboard = hasPermission?.('deploy.dashboard.view_admin');

  const canViewProfile = hasPermission?.('deploy.employees.view_list');

  const canViewAttendance = hasPermission?.('deploy.attendance.view_team') || hasPermission?.('deploy.attendance.view_all');

  const canManagePayroll = hasPermission?.('deploy.payroll.approve') || hasPermission?.('deploy.payroll.run_payroll');

  const canViewPayroll = hasPermission?.('deploy.payroll.view_personal') || hasPermission?.('deploy.payroll.view_all');

  const canViewPerformance = hasPermission?.('deploy.performance.view_team') || hasPermission?.('deploy.performance.view_all');

  const canViewPersonalAttendance = hasPermission?.('deploy.attendance.view_personal');
  const canViewPersonalPerformance = hasPermission?.('deploy.performance.view_personal');

  const canViewAssets = hasPermission?.('deploy.assets.view_all') || hasPermission?.('deploy.assets.manage_onboarding');

  const canViewOnboarding = hasPermission?.('deploy.onboarding.view');

  console.log('--- DEBUG PERMISSIONS ---');
  console.log('User roles:', user?.roles, user?.role);
  console.log('Has super_admin?', hasRole?.('super_admin'));
  console.log('User permissions object:', user?.permissions);
  console.log('canViewAttendance:', canViewAttendance);
  console.log('canViewOnboarding:', canViewOnboarding);
  console.log('deploy.employees.view_list:', hasPermission?.('deploy.employees.view_list'));
  console.log('-------------------------');

  /* =========================================
     NAVIGATION
  ========================================= */

  const currentTab =
    params.get('tab') || 'dashboard';

  const setTab = (tab) =>
    navigate(`/deploy?tab=${tab}`);

  const handleTabKeyNav = useTabListKeyNav();

  const displayName =
    user?.name ||
    user?.email?.split('@')[0] ||
    "User";

  // Dynamic role display based on current view
  const getRoleDisplay = () => {
    // In employee/personal view, always show Employee Workspace
    if (deployView === 'employee') {
      return 'Employee Workspace';
    }
    
    // In management view, show actual management role
    if (deployView === 'management') {
      if (hasRole?.('super_admin')) return 'Super Admin';
      if (hasRole?.('org_admin')) return 'Organization Admin';
      if (hasRole?.('manager')) return 'Manager';
      return 'Employee Workspace';
    }
    
    // Fallback
    return hasRole?.('super_admin')
      ? 'Super Admin'
      : hasRole?.('org_admin')
      ? 'Organization Admin'
      : hasRole?.('manager')
      ? 'Manager Workspace'
      : 'Employee Workspace';
  };

  useEffect(() => {
    if (
      deployView === 'employee' &&
      (currentTab === 'assets' || currentTab === 'onboard')
    ) {
      navigate('/deploy?tab=dashboard');
    }
  }, [deployView, currentTab, navigate]);

  return (

    <div className="dashboard-page">

      {/* =========================================
          TOPBAR
      ========================================= */}

      <div className="topbar">

        <div className="top-left">
          <img
            src={logo}
            className="logo"
            alt="logo"
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
              {displayName?.charAt(0)?.toUpperCase()}
            </div>

            <div className="profile-text">

              <h4>{displayName}</h4>

              <p>
                {getRoleDisplay()}
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* =========================================
          BODY
      ========================================= */}

      <div className="dashboard-body">

        {/* =========================================
            SIDEBAR
        ========================================= */}

        <div className="sidebar" data-no-tooltip onKeyDown={handleTabKeyNav}>

          {/* VIEW TOGGLE */}

          {isOrgAdmin && (

            <div
              className="
                w-full
                flex
                bg-[#f3f0ff]
                p-1
                rounded-2xl
                border
                border-[#ebe4ff]
                mb-6
                overflow-hidden
              "
            >

              <button
                className={`
                  flex-1
                  py-2.5
                  rounded-xl
                  text-[13px]
                  font-bold
                  transition-all
                  ${
                    deployView === 'management'
                      ? '!bg-black !text-white shadow-md'
                      : 'text-black/60 hover:bg-white'
                  }
                `}
                onClick={() => {
                  setDeployView('management');
                  setTab('dashboard');
                }}
              >
                Management
              </button>

              <button
                className={`
                  flex-1
                  py-2.5
                  rounded-xl
                  text-[13px]
                  font-bold
                  transition-all
                  ${
                    deployView === 'employee'
                      ? '!bg-black !text-white shadow-md'
                      : 'text-black/60 hover:bg-white'
                  }
                `}
                onClick={() => {
                  setDeployView('employee');
                  setTab('dashboard');
                }}
              >
                Personal
              </button>

            </div>

          )}

          {/* MANAGEMENT NAV */}

          {deployView === 'management' ? (

            <>

              <button
                className={currentTab === 'dashboard' ? 'active' : ''}
                onClick={() => setTab('dashboard')}
              >
                Analytics
              </button>

              {canViewProfile && (
                <button
                  className={currentTab === 'personnel' ? 'active' : ''}
                  onClick={() => setTab('personnel')}
                >
                  Directory
                </button>
              )}

              {canViewAttendance && (
                <button
                  className={currentTab === 'attendance' ? 'active' : ''}
                  onClick={() => setTab('attendance')}
                >
                  Attendance
                </button>
              )}

              {canViewPerformance && (
                <button
                  className={currentTab === 'performance' ? 'active' : ''}
                  onClick={() => setTab('performance')}
                >
                  Performance
                </button>
              )}

              {canViewAssets && (
                <button
                  className={currentTab === 'assets' ? 'active' : ''}
                  onClick={() => setTab('assets')}
                >
                  Assets
                </button>
              )}

              {canViewOnboarding && (
                <button
                  className={currentTab === 'onboard' ? 'active' : ''}
                  onClick={() => setTab('onboard')}
                >
                  Onboarding
                </button>
              )}

              {canManagePayroll && (
                <button
                  className={currentTab === 'payroll' ? 'active' : ''}
                  onClick={() => setTab('payroll')}
                >
                  Payroll
                </button>
              )}

            </>

          ) : (

            <>
              {/* EMPLOYEE NAV */}

              <button
                className={currentTab === 'dashboard' ? 'active' : ''}
                onClick={() => setTab('dashboard')}
              >
                Dashboard
              </button>

              <button                className={currentTab === 'profile' ? 'active' : ''}
                onClick={() => setTab('profile')}
              >
                My Profile
              </button>

              {canViewPersonalAttendance && (
                <button
                  className={currentTab === 'attendance' ? 'active' : ''}
                  onClick={() => setTab('attendance')}
                >
                  My Attendance
                </button>
              )}

              {canViewPersonalPerformance && (
                <button
                  className={currentTab === 'performance' ? 'active' : ''}
                  onClick={() => setTab('performance')}
                >
                  My Performance
                </button>
              )}
              
              <button
                className={currentTab === 'opportunities' ? 'active' : ''}
                onClick={() => setTab('opportunities')}
              >
                My Opportunities
              </button>

              {canViewPayroll && (
                <button
                  className={currentTab === 'payroll' ? 'active' : ''}
                  onClick={() => setTab('payroll')}
                >
                  My Payroll
                </button>
              )}

            </>

          )}

          <div className="sidebar-brand">
            <img src={ewandzLogo} alt="Ewandz" />
          </div>

        </div>

        {/* =========================================
            CONTENT
        ========================================= */}

        <div className="content">

          {/* =========================================
            DASHBOARD
          ========================================= */}

          {deployView === 'management' &&
            currentTab === 'dashboard' &&
            canViewDashboard && (

            <DeployAnalytics
              key="management-dashboard"
              mode={panelMode}
              user={user}
            />

          )}

          {deployView === 'employee' &&
            currentTab === 'dashboard' &&
            canViewDashboard && (

            <EmployeeDashboard
              key="employee-dashboard"
              mode="employee"
              user={user}
            />

          )}

          {/* =========================================
            MANAGEMENT PERSONNEL
          ========================================= */}

          {deployView === 'management' &&
            currentTab === 'personnel' &&
            canViewProfile && (

            <EmployeeDirectory
              key="management-personnel"
            />

          )}

          {/* =========================================
            EMPLOYEE PROFILE
          ========================================= */}

          {deployView === 'employee' &&
            currentTab === 'profile' && (

            <MyProfile
              key="employee-profile"
              mode="employee"
              user={user}
            />

          )}

          {/* =========================================
            MANAGEMENT PROFILE (Full View)
          ========================================= */}

          {deployView === 'management' &&
            currentTab === 'profile' &&
            canViewProfile && (

            <EmployeeProfileFull
              key="management-profile-full"
              employeeCode={params.get('code')}
              onBack={() => setTab('personnel')}
            />

          )}

          {/* =========================================
            ATTENDANCE
          ========================================= */}

          {currentTab === 'attendance' &&
            ((deployView === 'management' && canViewAttendance) ||
             (deployView === 'employee' && canViewPersonalAttendance)) && (

            <AttendancePanel
              key={`${deployView}-attendance`}
              mode={
                deployView === 'management'
                  ? panelMode
                  : 'employee'
              }
              user={user}
            />

          )}

          {/* =========================================
            PERFORMANCE
          ========================================= */}

          {currentTab === 'performance' &&
            ((deployView === 'management' && canViewPerformance) ||
             (deployView === 'employee' && canViewPersonalPerformance)) && (

            <PerformancePanel
              key={`${deployView}-performance`}
              isAdmin={deployView === 'management'}
              mode={
                deployView === 'management'
                  ? panelMode
                  : 'employee'
              }
              user={user}
            />

          )}

          {/* ASSETS */}

          {currentTab === 'assets' && deployView === 'management' && canViewAssets && (

            <AssetsPanel
              mode={panelMode}
              user={user}
            />

          )}

          {/* ONBOARDING */}

          {currentTab === 'onboard' && deployView === 'management' && canViewOnboarding && (

            <OnboardingPanel
              mode={panelMode}
              user={user}
              isAdmin={panelMode === 'admin'}
            />

          )}

          {/* PAYROLL — ADMIN/MANAGER */}
          {currentTab === 'payroll' && deployView === 'management' && canManagePayroll && (
            <PayrollPanel
              key="management-payroll"
              mode={panelMode}
              user={user}
            />
          )}

          {/* PAYROLL — EMPLOYEE */}
          {currentTab === 'payroll' && deployView === 'employee' && canViewPayroll && (
            <MyPayrollPanel
              key="employee-payroll"
              user={user}
            />
          )}

          {/* OPPORTUNITIES — EMPLOYEE */}
          {currentTab === 'opportunities' && deployView === 'employee' && (
            <InternalOpportunitiesPanel
              key="employee-opportunities"
              user={user}
            />
          )}

        </div>

      </div>
    </div>
    
  );
}