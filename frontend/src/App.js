import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import Navbar from './components/Navigation/Navbar';
import Dashboard from './components/Dashboard/Dashboard';
import SignalTable from './components/SignalTable/SignalTable';
import BacktestResults from './components/BacktestResults/BacktestResults';
import Charts from './components/DataVisualization/Charts';
import PortfolioManager from './components/Portfolio/PortfolioManager';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import AlertManager from './components/Alerts/AlertManager';
import AdminPanel from './components/Admin/AdminPanel';
import SystemHealth from './components/Admin/SystemHealth';
import './App.css';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const { alerts, addAlert } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setActiveTab('auth');
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="app">
        {authMode === 'login' ? (
          <Login onSwitchToRegister={() => setAuthMode('register')} />
        ) : (
          <Register onSwitchToLogin={() => setAuthMode('login')} />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="app-content">
        <AlertManager alerts={alerts} />
        
        <main className="main-content">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'signals' && <SignalTable />}
          {activeTab === 'backtest' && <BacktestResults />}
          {activeTab === 'charts' && <Charts />}
          {activeTab === 'portfolio' && <PortfolioManager />}
          {activeTab === 'admin' && user.role === 'admin' && <AdminPanel />}
          {activeTab === 'system-health' && user.role === 'admin' && <SystemHealth />}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;