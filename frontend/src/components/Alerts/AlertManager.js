import React from 'react';
import './Alerts.css';

const AlertManager = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alert-container">
      {alerts.map(alert => (
        <div key={alert.id} className={`alert alert-${alert.type}`}>
          <span className="alert-icon">
            {alert.type === 'success' ? '✅' : 
             alert.type === 'error' ? '❌' : 
             alert.type === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span className="alert-message">{alert.message}</span>
        </div>
      ))}
    </div>
  );
};

export default AlertManager;