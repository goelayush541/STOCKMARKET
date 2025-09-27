import React, { useState } from 'react';
import { api } from '../../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsageStats();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={`admin-tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          System
        </button>
        <button 
          className={`admin-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'users' && <UsersTab users={users} loading={loading} />}
        {activeTab === 'system' && <SystemTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
};

const UsersTab = ({ users, loading }) => {
  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div className="users-tab">
      <h3>User Management</h3>
      <div className="users-table">
        <div className="table-row header">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Last Login</div>
          <div>Actions</div>
        </div>
        
        {users.map(user => (
          <div key={user.id} className="table-row">
            <div>{user.firstName} {user.lastName}</div>
            <div>{user.email}</div>
            <div>
              <span className={`role-badge ${user.role}`}>
                {user.role}
              </span>
            </div>
            <div>
              {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
            </div>
            <div>
              <button className="btn btn-sm">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SystemTab = () => {
  const [systemInfo, setSystemInfo] = useState(null);

  React.useEffect(() => {
    const loadSystemInfo = async () => {
      try {
        const info = await api.getSystemHealth();
        setSystemInfo(info);
      } catch (error) {
        console.error('Failed to load system info:', error);
      }
    };

    loadSystemInfo();
  }, []);

  if (!systemInfo) return <div className="loading">Loading system info...</div>;

  return (
    <div className="system-tab">
      <h3>System Information</h3>
      
      <div className="system-cards">
        <div className="system-card">
          <h4>Status</h4>
          <div className={`status ${systemInfo.status}`}>
            {systemInfo.status.toUpperCase()}
          </div>
        </div>

        <div className="system-card">
          <h4>Uptime</h4>
          <div className="uptime">
            {Math.floor(systemInfo.uptime / 3600)} hours
          </div>
        </div>

        <div className="system-card">
          <h4>Services</h4>
          <div className="services">
            {Object.entries(systemInfo.services).map(([service, status]) => (
              <div key={service} className="service">
                <span className="service-name">{service}</span>
                <span className={`service-status ${status}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LogsTab = () => {
  return (
    <div className="logs-tab">
      <h3>System Logs</h3>
      <div className="logs-content">
        <p>Log viewing functionality will be implemented here.</p>
        <p>This will include filtering, search, and real-time log streaming.</p>
      </div>
    </div>
  );
};

export default AdminPanel;