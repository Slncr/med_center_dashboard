import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoomDisplayPage from './pages/RoomDisplayPage';
import NurseDashboardPage from './pages/NurseDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/room" replace />} />
            <Route path="/room" element={<RoomDisplayPage />} />
            <Route path="/nurse" element={<NurseDashboardPage />} />
            <Route path="/doctor" element={<DoctorDashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;