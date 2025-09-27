import React from 'react';
import { useApp } from '../../contexts/AppContext';
import MarketOverview from '../DataVisualization/MarketOverview';
import { useSignals } from '../../hooks/useSignals';
import './Dashboard.css';

const Dashboard = () => {
  // Use the useSignals hook to get signals data
  const { signals, loading, error } = useSignals({ limit: 10 });
  const { userPreferences } = useApp();

  // Ensure signals is always an array and filter safely
  const signalsArray = Array.isArray(signals) ? signals : [];
  const strongSignals = signalsArray.filter(s => s && s.strength > 0.7);
  const buySignals = signalsArray.filter(s => s && s.signalType === 'BUY');
  const sellSignals = signalsArray.filter(s => s && s.signalType === 'SELL');

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Financial Signals Dashboard</h1>
        <p>Real-time market analysis and trading signals</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Total Signals</h3>
            <p className="stat-number">{signalsArray.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <h3>Strong Signals</h3>
            <p className="stat-number">{strongSignals.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Buy Signals</h3>
            <p className="stat-number buy">{buySignals.length}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-content">
            <h3>Sell Signals</h3>
            <p className="stat-number sell">{sellSignals.length}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="market-section">
          <MarketOverview symbols={userPreferences?.defaultSymbols || ['AAPL', 'MSFT', 'GOOGL']} />
        </div>

        <div className="signals-section">
          <div className="card">
            <div className="card-header">
              <h2>Recent Strong Signals</h2>
              <span className="badge">{strongSignals.length} signals</span>
            </div>
            
            {loading ? (
              <div className="loading">Loading signals...</div>
            ) : error ? (
              <div className="error">Error loading signals: {error}</div>
            ) : strongSignals.length === 0 ? (
              <div className="no-signals">
                <p>No strong signals detected yet</p>
                <small>Strong signals will appear here when confidence exceeds 70%</small>
              </div>
            ) : (
              <div className="signals-list">
                {strongSignals.slice(0, 5).map(signal => (
                  <SignalCard key={signal._id || signal.id} signal={signal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SignalCard = ({ signal }) => {
  if (!signal) return null;

  return (
    <div className="signal-card">
      <div className="signal-header">
        <span className={`signal-type ${signal.signalType ? signal.signalType.toLowerCase() : 'neutral'}`}>
          {signal.signalType || 'NEUTRAL'}
        </span>
        <span className="symbol">{signal.symbol || 'Unknown'}</span>
        <span className="strength">Strength: {((signal.strength || 0) * 100).toFixed(0)}%</span>
      </div>
      
      <div className="signal-explanation">
        {signal.explanation || 'Signal analysis not available'}
      </div>
      
      <div className="signal-footer">
        <span className="signal-time">
          {signal.generatedAt ? new Date(signal.generatedAt).toLocaleString() : 'Recent'}
        </span>
        <span className="confidence">
          Confidence: {((signal.confidence || 0) * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default Dashboard;