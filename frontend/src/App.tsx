import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AdminRegistrationPage from './pages/AdminRegistrationPage';
import NurseDashboardPage from './pages/NurseDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import RoomDisplayPage from './pages/RoomDisplayPage';
import MainLayout from './MainLayout';

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
    // ✅ Перенаправляем на страницу по умолчанию для роли
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
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        {/* Все защищённые маршруты оборачиваются в MainLayout */}
        <Route 
          path="/register" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminRegistrationPage />
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
        
        <Route 
          path="/room" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'nurse', 'doctor']}>
              <RoomDisplayPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Редиректы по умолчанию */}
        <Route path="/dashboard" element={<Navigate to="/register" replace />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;