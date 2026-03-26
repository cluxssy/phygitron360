import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './core/auth/AuthContext';

// Landing & Auth
import LandingPage from './modules/landing/pages/LandingPage';
import Login from './modules/landing/pages/Login';
import Onboard from './modules/landing/pages/Onboard';
import ResetPassword from './modules/landing/pages/ResetPassword';

// Deploy Module Pages
import DashboardPage from './modules/deploy/pages/Dashboard';
import EmployeeDirectory from './modules/deploy/pages/EmployeeDirectory';
import AddEmployee from './modules/deploy/pages/AddEmployee';
import AdminPanel from './modules/deploy/pages/AdminPanel';
import Attendance from './modules/deploy/pages/Attendance';
import ManageAssets from './modules/deploy/pages/ManageAssets';
import MyPerformance from './modules/deploy/pages/MyPerformance';
import Performance from './modules/deploy/pages/Performance';
import Training from './modules/deploy/pages/Training';
import EmployeeProfile from './modules/deploy/pages/EmployeeProfile';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / Landing Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Deploy Module Routes */}
          <Route path="/dashboard" element={<Navigate to="/deploy/dashboard" replace />} />
          <Route path="/deploy" element={<Navigate to="/deploy/dashboard" replace />} />
          <Route path="/deploy/dashboard" element={<DashboardPage />} />
          <Route path="/deploy/employee-directory" element={<EmployeeDirectory />} />
          <Route path="/deploy/add-employee" element={<AddEmployee />} />
          <Route path="/deploy/admin" element={<AdminPanel />} />
          <Route path="/deploy/attendance" element={<Attendance />} />
          <Route path="/deploy/manage-assets" element={<ManageAssets />} />
          <Route path="/deploy/my-performance" element={<MyPerformance />} />
          <Route path="/deploy/performance" element={<Performance />} />
          <Route path="/deploy/training" element={<Training />} />
          <Route path="/deploy/employee-profile/:id" element={<EmployeeProfile />} />

          {/* Placeholders for unmigrated or future modules */}
          <Route path="/deploy/*" element={<div className="p-8 text-white">Deploy Module Link Not Found...</div>} />
          <Route path="/source/*" element={<div className="p-8 text-white">Source Module Loading...</div>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
