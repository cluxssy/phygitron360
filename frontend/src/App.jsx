import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './core/auth/AuthContext';
import { Toaster } from 'react-hot-toast';
import TooltipProvider from './core/components/TooltipProvider';
import HorizontalLoader from './core/components/HorizontalLoader';

import Layout from './components/Layout';
import LandingPage from "./modules/landing/pages/LandingPage";
import ForgotPasswordPage from './modules/landing/pages/ForgotPasswordPage';
import ResetPasswordPage from './modules/landing/pages/ResetPasswordPage';
import OnboardPage from './modules/landing/pages/OnboardPage';

import ForceChangePasswordPage from './modules/landing/pages/ForceChangePasswordPage';

import MasterConsole from './modules/admin/pages/MasterConsole';
import OrgDashboard from './modules/admin/pages/OrgDashboard';
import SuperadminDashboard from './modules/admin/pages/SuperadminDashboard';

import SourceDashboard from './modules/source/pages/SourceDashboard';
import DeployDashboard from './modules/deploy/pages/DeployDashboard';
import VerifyDashboard from './modules/verify/pages/VerifyDashboard';
import ForgeDashboard from './modules/forge/pages/ForgeDashboard';
import TraineeDashboard from './modules/trainee/pages/TraineeDashboard';

function ProtectedRoute({ children, requiredPermission, requiredModule }) {
  const { user, loading, hasPermission } = useAuth();
  
  if (loading) {
    return <HorizontalLoader fullScreen label="Loading workspace..." />;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Force password change check
  if (user.password_must_change) {
    return <Navigate to="/force-change-password" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  if (requiredModule && !hasPermission(`module.${requiredModule}.access`)) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
}

function AdminGate() {
  const { hasRole, hasPermission } = useAuth();
  
  if (hasPermission('admin.users.manage') || hasRole(['org_admin'])) {
    return <OrgDashboard />;
  }
  
  if (hasRole(['super_admin'])) {
    return <MasterConsole />;
  }

  // Fallback for managers or others who shouldn't be in the admin workspace
  return <Navigate to="/deploy" replace />;
}

function VerifyAccessRoute({ children }) {
  const { user, loading, hasPermission } = useAuth();
  const [checkingAssignment, setCheckingAssignment] = useState(false);
  const [hasAssignment, setHasAssignment] = useState(false);
  const [assignmentChecked, setAssignmentChecked] = useState(false);
  const roles = (user?.roles || [user?.role]).filter(Boolean).map((role) => String(role).toLowerCase());
  const isEmployee = roles.includes('employee');
  const moduleEnabled = (user?.modules_enabled || []).some((module) => String(module).toLowerCase() === 'verify');
  const hasModuleAccess = hasPermission('module.verify.access');

  useEffect(() => {
    if (!user || hasModuleAccess || !isEmployee || !moduleEnabled) return;

    let active = true;
    setCheckingAssignment(true);
    setAssignmentChecked(false);
    fetch('/api/verify/assignments/my-tests', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json();
        return Array.isArray(body?.data) ? body.data : body;
      })
      .then((assignments) => {
        if (active) setHasAssignment(Array.isArray(assignments) && assignments.length > 0);
      })
      .catch(() => { if (active) setHasAssignment(false); })
      .finally(() => {
        if (active) {
          setCheckingAssignment(false);
          setAssignmentChecked(true);
        }
      });

    return () => { active = false; };
  }, [user, hasModuleAccess, isEmployee, moduleEnabled]);

  if (loading || checkingAssignment || (user && !hasModuleAccess && isEmployee && moduleEnabled && !assignmentChecked)) return null;
  if (!user) return <Navigate to="/" replace />;
  if (user.password_must_change) return <Navigate to="/force-change-password" replace />;
  if (hasModuleAccess || (isEmployee && moduleEnabled && hasAssignment)) return children;
  return <Navigate to="/deploy" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster position="top-right" />

        <Routes>
          {/* Landing & Auth */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/force-change-password" element={<ForceChangePasswordPage />} />
          <Route path="/onboard" element={<OnboardPage />} />

          {/* Dashboards */}
          <Route 
            path="/superadmin" 
            element={
              <ProtectedRoute requiredPermission="manage_system">
                <Layout><SuperadminDashboard /></Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Layout><AdminGate /></Layout>
              </ProtectedRoute>
            } 
          />

          {/* ── ABOUT ROUTE REMOVED ── */}
          {/* <Route path="/about" element={<About />} /> */}

          <Route 
            path="/source" 
            element={
              <ProtectedRoute requiredModule="source">
                <Layout><SourceDashboard /></Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/verify" 
            element={
              <VerifyAccessRoute>
                <Layout><VerifyDashboard /></Layout>
              </VerifyAccessRoute>
            } 
          />

          <Route 
            path="/forge" 
            element={
              <ProtectedRoute requiredModule="forge">
                <Layout><ForgeDashboard /></Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/deploy" 
            element={
              <ProtectedRoute requiredModule="deploy">
                <Layout><DeployDashboard /></Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/trainee" 
            element={
              <ProtectedRoute>
                <TraineeDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallbacks */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  );
}