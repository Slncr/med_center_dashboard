import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoomDisplayPage from './pages/RoomDisplayPage';
import NurseDashboardPage from './pages/NurseDashboardPage';
import DoctorDashboardPage from './pages/DoctorDashboardPage';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import './App.css';
import ArchivedPatients from './components/nurse-station/ArchivedPatients';

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
            <Route path="/archived" element={<ArchivedPatients />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;