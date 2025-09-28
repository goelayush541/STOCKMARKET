import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useSignals } from '../../hooks/useSignals';
import { useMarketData } from '../../hooks/useMarketData';
import MarketOverview from '../DataVisualization/MarketOverview';
import './Dashboard.css';

const Dashboard = () => {
  const { userPreferences, addAlert } = useApp();
  const { signals, loading: signalsLoading, error: signalsError, refresh: refreshSignals } = useSignals({ limit: 10 });
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const { data: marketData, loading: marketLoading, refresh: refreshMarketData } = useMarketData(selectedSymbol, '1d');
  
  const [dashboardStats, setDashboardStats] = useState({
    totalSignals: 0,
    strongSignals: 0,
    buySignals: 0,
    sellSignals: 0,
    marketStatus: 'loading'
  });

  // Calculate dashboard statistics
  useEffect(() => {
    if (signals && Array.isArray(signals)) {
      const strongSignals = signals.filter(s => s && s.strength > 0.7);
      const buySignals = signals.filter(s => s && s.signalType === 'BUY');
      const sellSignals = signals.filter(s => s && s.signalType === 'SELL');

      setDashboardStats({
        totalSignals: signals.length,
        strongSignals: strongSignals.length,
        buySignals: buySignals.length,
        sellSignals: sellSignals.length,
        marketStatus: marketData && marketData.length > 0 ? 'active' : 'loading'
      });
    }
  }, [signals, marketData]);

  // Handle errors
  useEffect(() => {
    if (signalsError) {
      addAlert({
        type: 'error',
        message: `Failed to load signals: ${signalsError}`
      });
    }
  }, [signalsError, addAlert]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      await refreshSignals();
      await refreshMarketData();
      addAlert({
        type: 'success',
        message: 'Dashboard data refreshed successfully'
      });
    } catch (error) {
      addAlert({
        type: 'error',
        message: 'Failed to refresh data'
      });
    }
  }, [refreshSignals, refreshMarketData, addAlert]);

  // Get default symbols from user preferences or use defaults
  const defaultSymbols = userPreferences?.defaultSymbols || ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

  // Safe filtering of signals
  const strongSignals = Array.isArray(signals) 
    ? signals.filter(s => s && s.strength > 0.7).slice(0, 5)
    : [];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Financial Signals Dashboard</h1>
        <p>Real-time market analysis and trading signals</p>
        <div className="dashboard-controls">
          <select 
            value={selectedSymbol} 
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="symbol-selector"
          >
            {defaultSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
          <button 
            onClick={refreshAllData}
            className="refresh-btn"
            disabled={signalsLoading || marketLoading}
          >
            {signalsLoading || marketLoading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="stats-grid">
        <StatCard 
          icon="📊"
          title="Total Signals"
          value={dashboardStats.totalSignals}
          description="Active trading signals"
          trend={dashboardStats.totalSignals > 0 ? 'up' : 'neutral'}
        />
        <StatCard 
          icon="🚀"
          title="Strong Signals"
          value={dashboardStats.strongSignals}
          description="High confidence opportunities"
          trend={dashboardStats.strongSignals > 0 ? 'up' : 'neutral'}
          highlight={true}
        />
        <StatCard 
          icon="📈"
          title="Buy Signals"
          value={dashboardStats.buySignals}
          description="Recommended purchases"
          trend="up"
          type="buy"
        />
        <StatCard 
          icon="📉"
          title="Sell Signals"
          value={dashboardStats.sellSignals}
          description="Recommended sales"
          trend="down"
          type="sell"
        />
      </div>

      {/* Market Status Indicator */}
      <div className="market-status">
        <div className={`status-indicator ${dashboardStats.marketStatus}`}>
          <span className="status-dot"></span>
          Market: {dashboardStats.marketStatus === 'active' ? 'Active' : 'Loading...'}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Market Overview Section */}
        <div className="market-section">
          <div className="card">
            <div className="card-header">
              <h2>Market Overview</h2>
              <span className="last-updated">
                {marketData && marketData.length > 0 ? 'Live Data' : 'Mock Data'}
              </span>
            </div>
            <MarketOverview 
              symbols={defaultSymbols}
              onSymbolSelect={setSelectedSymbol}
            />
          </div>
        </div>

        {/* Recent Signals Section */}
        <div className="signals-section">
          <div className="card">
            <div className="card-header">
              <h2>Recent Strong Signals</h2>
              <div className="header-actions">
                <span className="badge">{dashboardStats.strongSignals} signals</span>
                <button 
                  onClick={refreshSignals}
                  className="icon-btn"
                  disabled={signalsLoading}
                  title="Refresh signals"
                >
                  ⟳
                </button>
              </div>
            </div>
            
            {signalsLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading trading signals...</p>
              </div>
            ) : signalsError ? (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <div>
                  <p>Unable to load signals</p>
                  <small>{signalsError}</small>
                </div>
                <button onClick={refreshSignals} className="retry-btn">
                  Try Again
                </button>
              </div>
            ) : strongSignals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div>
                  <p>No strong signals detected</p>
                  <small>Check back later for new trading opportunities</small>
                </div>
              </div>
            ) : (
              <div className="signals-list">
                {strongSignals.map(signal => (
                  <SignalCard key={signal._id || signal.id} signal={signal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <h3>System Performance</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Signal Accuracy</span>
            <span className="metric-value">78%</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Response Time</span>
            <span className="metric-value">1.2s</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Data Freshness</span>
            <span className="metric-value">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon, title, value, description, trend, type, highlight }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  const getTrendText = (trend) => {
    switch (trend) {
      case 'up': return 'Increasing';
      case 'down': return 'Decreasing';
      default: return 'Stable';
    }
  };

  return (
    <div className={`stat-card ${highlight ? 'highlight' : ''} ${type || ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
        <p className="stat-description">{description}</p>
        <div className={`stat-trend ${trend}`}>
          <span className="trend-icon">{getTrendIcon(trend)}</span>
          <span className="trend-text">{getTrendText(trend)}</span>
        </div>
      </div>
    </div>
  );
};

// Signal Card Component
const SignalCard = ({ signal }) => {
  const getSignalIcon = (signalType) => {
    switch (signalType) {
      case 'BUY': return '🟢';
      case 'SELL': return '🔴';
      default: return '⚪';
    }
  };

  const getStrengthColor = (strength) => {
    if (strength > 0.8) return 'high';
    if (strength > 0.6) return 'medium';
    return 'low';
  };

  if (!signal) return null;

  return (
    <div className="signal-card">
      <div className="signal-header">
        <span className="signal-icon">{getSignalIcon(signal.signalType)}</span>
        <span className="symbol">{signal.symbol || 'Unknown'}</span>
        <span className={`signal-type ${signal.signalType ? signal.signalType.toLowerCase() : 'neutral'}`}>
          {signal.signalType || 'NEUTRAL'}
        </span>
        <span className={`strength-badge ${getStrengthColor(signal.strength)}`}>
          Strength: {(signal.strength * 100).toFixed(0)}%
        </span>
      </div>
      
      <div className="signal-body">
        <p className="signal-explanation">
          {signal.explanation || `Strong ${signal.signalType ? signal.signalType.toLowerCase() : 'trading'} signal detected based on market analysis`}
        </p>
        
        <div className="signal-meta">
          <span className="source">Source: {signal.source || 'technical analysis'}</span>
          <span className="confidence">
            Confidence: {(signal.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="signal-footer">
        <span className="timestamp">
          {signal.generatedAt ? new Date(signal.generatedAt).toLocaleString() : 'Recent'}
        </span>
        {signal.expiration && (
          <span className="expiration">
            Expires: {new Date(signal.expiration).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default Dashboard;