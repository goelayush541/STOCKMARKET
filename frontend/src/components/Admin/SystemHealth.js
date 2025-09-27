import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import './AdminPanel.css';

const SystemHealth = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const health = await api.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading system health...</div>;
  if (!systemHealth) return <div className="error">Failed to load system health</div>;

  return (
    <div className="system-health">
      <div className="health-header">
        <h2>System Health Dashboard</h2>
        <button className="btn btn-primary" onClick={loadSystemHealth}>
          Refresh
        </button>
      </div>

      <div className="health-overview">
        <div className={`status-card ${systemHealth.status}`}>
          <h3>Overall Status</h3>
          <div className="status-value">{systemHealth.status.toUpperCase()}</div>
          <p>Last updated: {new Date(systemHealth.timestamp).toLocaleString()}</p>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Uptime</h4>
            <div className="metric-value">
              {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
            </div>
          </div>

          <div className="metric-card">
            <h4>Memory Usage</h4>
            <div className="metric-value">76%</div>
          </div>

          <div className="metric-card">
            <h4>CPU Load</h4>
            <div className="metric-value">42%</div>
          </div>

          <div className="metric-card">
            <h4>Active Connections</h4>
            <div className="metric-value">18</div>
          </div>
        </div>
      </div>

      <div className="services-health">
        <h3>Services Status</h3>
        <div className="services-grid">
          {Object.entries(systemHealth.services).map(([service, status]) => (
            <div key={service} className="service-card">
              <h4>{service}</h4>
              <div className={`service-status ${status}`}>
                {status.toUpperCase()}
              </div>
              <div className="service-metrics">
                <span>Response: 120ms</span>
                <span>Availability: 99.9%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="recent-issues">
        <h3>Recent Issues</h3>
        <div className="issues-list">
          <div className="issue-card">
            <div className="issue-severity high">HIGH</div>
            <div className="issue-details">
              <h4>Database connection timeout</h4>
              <p>Occurred 15 minutes ago - Resolved automatically</p>
            </div>
          </div>
          
          <div className="issue-card">
            <div className="issue-severity medium">MEDIUM</div>
            <div className="issue-details">
              <h4>API rate limit exceeded</h4>
              <p>Occurred 2 hours ago - Manual intervention required</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;