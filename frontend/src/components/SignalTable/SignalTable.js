import React, { useState } from 'react';
import { useSignals } from '../../hooks/useSignals';
import './SignalTable.css';

const SignalTable = () => {
  const [filters, setFilters] = useState({
    symbol: '',
    signalType: '',
    minStrength: 0
  });
  
  const { signals, loading, error, refresh } = useSignals(filters);

  // Ensure signals is always an array
  const safeSignals = Array.isArray(signals) ? signals : [];

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      symbol: '',
      signalType: '',
      minStrength: 0
    });
  };

  if (loading) return <div className="loading">Loading signals...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="signal-table-container">
      <div className="table-header">
        <h2>Trading Signals</h2>
        <div className="table-actions">
          <button className="btn btn-primary" onClick={refresh}>
            Refresh
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label>Symbol</label>
          <input
            type="text"
            value={filters.symbol}
            onChange={(e) => handleFilterChange('symbol', e.target.value)}
            placeholder="Filter by symbol..."
          />
        </div>

        <div className="filter-group">
          <label>Signal Type</label>
          <select
            value={filters.signalType}
            onChange={(e) => handleFilterChange('signalType', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Min Strength</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={filters.minStrength}
            onChange={(e) => handleFilterChange('minStrength', parseFloat(e.target.value))}
          />
          <span>{(filters.minStrength * 100).toFixed(0)}%</span>
        </div>

        <button className="btn btn-secondary" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      <div className="table-container">
        <table className="signal-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Type</th>
              <th>Strength</th>
              <th>Confidence</th>
              <th>Source</th>
              <th>Generated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {safeSignals.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  No signals available
                </td>
              </tr>
            ) : (
              safeSignals.map(signal => (
                <SignalRow key={signal._id || signal.id} signal={signal} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SignalRow = ({ signal }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="signal-row">
        <td>
          <span className="symbol">{signal.symbol}</span>
        </td>
        <td>
          <span className={`signal-type ${signal.signalType?.toLowerCase()}`}>
            {signal.signalType}
          </span>
        </td>
        <td>
          <div className="strength-bar">
            <div 
              className="strength-fill"
              style={{ width: `${signal.strength * 100}%` }}
            />
            <span>{(signal.strength * 100).toFixed(0)}%</span>
          </div>
        </td>
        <td>{(signal.confidence * 100).toFixed(0)}%</td>
        <td>
          <span className="source-badge">{signal.source}</span>
        </td>
        <td>
          {signal.generatedAt ? new Date(signal.generatedAt).toLocaleString() : 'N/A'}
        </td>
        <td>
          <button 
            className="btn btn-sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'View'} Details
          </button>
        </td>
      </tr>
      
      {expanded && (
        <tr className="details-row">
          <td colSpan="7">
            <div className="signal-details">
              <h4>Signal Details</h4>
              <p><strong>Explanation:</strong> {signal.explanation}</p>
              
              {signal.relatedNews && signal.relatedNews.length > 0 && (
                <div>
                  <strong>Related News:</strong>
                  <ul>
                    {signal.relatedNews.map((news, index) => (
                      <li key={index}>{news.title}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {signal.expiration && (
                <p>
                  <strong>Expires:</strong>{' '}
                  {new Date(signal.expiration).toLocaleString()}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default SignalTable;