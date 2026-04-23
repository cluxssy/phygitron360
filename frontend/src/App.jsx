import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth/AuthContext';
import { Toaster } from 'react-hot-toast';

import Layout from './components/Layout';
import LandingPage from './modules/landing/pages/LandingPage';
import LoginPage from './modules/landing/pages/LoginPage';
import ForgotPasswordPage from './modules/landing/pages/ForgotPasswordPage';
import ResetPasswordPage from './modules/landing/pages/ResetPasswordPage';
import OnboardPage from './modules/landing/pages/OnboardPage';
import MasterConsole from './modules/admin/pages/MasterConsole';
import OrgDashboard from './modules/admin/pages/OrgDashboard';
import SuperadminDashboard from './modules/admin/pages/SuperadminDashboard';
import SourceDashboard from './modules/source/pages/SourceDashboard';
import DeployDashboard from './modules/deploy/pages/DeployDashboard';

import VerifyDashboard from './modules/verify/pages/VerifyDashboard';
import ForgeDashboard from './modules/forge/pages/ForgeDashboard';

function ProtectedRoute({ children, requiredPermission, requiredModule }) {
  const { user, loading, hasPermission } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#040812]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-lg shadow-primary/20"></div>
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Verifying Neural Clearance...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Use granular permission if provided, otherwise fallback to module access check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  if (requiredModule && !hasPermission(`module.${requiredModule}.access`)) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
}

function AdminGate() {
  const { hasRole } = useAuth();
  if (hasRole(['org_admin'])) return <OrgDashboard />;
  return <MasterConsole />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Landing & Portal Entry */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboard" element={<OnboardPage />} />

          {/* Unified Platform Worlds (The 4-in-1 Stage) */}
          <Route 
            path="/superadmin" 
            element={<ProtectedRoute requiredPermission="manage_system"><Layout><SuperadminDashboard /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/admin" 
            element={<ProtectedRoute requiredPermission="admin.users.manage"><Layout><AdminGate /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/source" 
            element={<ProtectedRoute requiredModule="source"><Layout><SourceDashboard /></Layout></ProtectedRoute>} 
          />
          
          <Route 
            path="/verify" 
            element={<ProtectedRoute requiredModule="verify"><Layout><VerifyDashboard /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/forge" 
            element={<ProtectedRoute requiredModule="forge"><Layout><ForgeDashboard /></Layout></ProtectedRoute>} 
          />
          <Route 
            path="/deploy" 
            element={<ProtectedRoute requiredModule="deploy"><Layout><DeployDashboard /></Layout></ProtectedRoute>} 
          />

          {/* Fallbacks */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
