import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'signals', label: 'Signals', icon: '🚦' },
    { id: 'backtest', label: 'Backtest', icon: '📈' },
    { id: 'charts', label: 'Charts', icon: '📉' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' }
  ];

  if (user?.role === 'admin') {
    tabs.push(
      { id: 'admin', label: 'Admin', icon: '⚙️' },
      { id: 'system-health', label: 'System Health', icon: '❤️' }
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">📊</span>
        <h1>Financial Signals</h1>
      </div>

      <div className="navbar-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`navbar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="navbar-user">
        <span className="user-name">
          {user.firstName} {user.lastName}
        </span>
        <span className="user-role">{user.role}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;