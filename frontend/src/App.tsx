import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminRegistrationPage from './pages/AdminRegistrationPage';
import NurseDashboardPage from './pages/NurseDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import RoomDisplayPage from './pages/RoomDisplayPage';
import OperatingRoomTabletPage from './pages/OperatingRoomTabletPage';
import OperatingRoomDisplayPage from './pages/OperatingRoomDisplayPage';
import OperatingRoomInfoPage from './pages/OperatingRoomInfoPage';
import OperatingRoomAdminPage from './pages/OperatingRoomAdminPage';
import MainLayout from './MainLayout';
import ArchivedPatients from './components/nurse-station/ArchivedPatients';
import NotificationToast from './components/common/NotificationToast';
import AppFullscreenGate from './components/common/AppFullscreenGate';
import { AppDialogProvider } from './context/AppDialogContext';

// Защита маршрутов
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role.toLowerCase())) {
    switch (user.role.toLowerCase()) {
      case 'nurse':
        return <Navigate to="/nurse/appointments" replace />;
      case 'doctor':
        return <Navigate to="/doctor/patients" replace />;
      case 'admin':
        return <Navigate to="/register" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <MainLayout>{children}</MainLayout>;
};

const App: React.FC = () => {
  return (
    <AppDialogProvider>
      <Router>
        <NotificationToast />
        <AppFullscreenGate />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route 
            path="/register" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminRegistrationPage />
              </ProtectedRoute>
            } 
          />

          <Route
            path="/admin/operating-room"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <OperatingRoomAdminPage />
              </ProtectedRoute>
            }
          />

          <Route 
            path="/nurse/appointments" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'nurse']}>
                <NurseDashboardPage />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/doctor/patients" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                <DoctorDashboardPage />
              </ProtectedRoute>
            } 
          />

          <Route path="/room" element={<RoomDisplayPage />} />
          <Route path="/room/:monitorId" element={<RoomDisplayPage />} />
          <Route path="/or" element={<OperatingRoomTabletPage />} />
          <Route path="/or/tablet" element={<OperatingRoomTabletPage />} />
          <Route path="/or/display" element={<OperatingRoomDisplayPage />} />
          <Route path="/or/monitor" element={<OperatingRoomDisplayPage />} />
          <Route path="/or/info" element={<OperatingRoomInfoPage />} />
          <Route path="/or/board" element={<OperatingRoomInfoPage />} />

          <Route path="/dashboard" element={<Navigate to="/register" replace />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route 
            path="/archived" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}>
                <ArchivedPatients />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AppDialogProvider>
  );
};

export default App;
