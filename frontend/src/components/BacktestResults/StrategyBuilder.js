import React, { useState } from 'react';
import { api } from '../../services/api';
import './BacktestResults.css';

const StrategyBuilder = ({ onBacktestComplete }) => {
  const [formData, setFormData] = useState({
    strategyName: '',
    symbols: ['AAPL', 'MSFT'],
    startDate: '2023-01-01',
    endDate: new Date().toISOString().split('T')[0],
    initialCapital: 100000,
    strategyType: 'movingAverageCrossover',
    parameters: {
      shortPeriod: 10,
      longPeriod: 20
    }
  });
  const [isRunning, setIsRunning] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSymbolsChange = (e) => {
    const symbols = e.target.value.split(',').map(s => s.trim().toUpperCase());
    setFormData(prev => ({ ...prev, symbols }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsRunning(true);

    try {
      const result = await api.runBacktest(formData);
      onBacktestComplete(result);
    } catch (error) {
      console.error('Backtest failed:', error);
      alert('Backtest failed: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="strategy-builder">
      <h3>Strategy Builder</h3>
      
      <form onSubmit={handleSubmit} className="strategy-form">
        <div className="form-row">
          <div className="form-group">
            <label>Strategy Name</label>
            <input
              type="text"
              name="strategyName"
              value={formData.strategyName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Initial Capital ($)</label>
            <input
              type="number"
              name="initialCapital"
              value={formData.initialCapital}
              onChange={handleChange}
              min="1000"
              step="1000"
              required
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Symbols (comma-separated)</label>
          <input
            type="text"
            value={formData.symbols.join(', ')}
            onChange={handleSymbolsChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Strategy Type</label>
          <select
            name="strategyType"
            value={formData.strategyType}
            onChange={handleChange}
          >
            <option value="movingAverageCrossover">Moving Average Crossover</option>
            <option value="rsiMeanReversion">RSI Mean Reversion</option>
            <option value="newsSentiment">News Sentiment</option>
          </select>
        </div>
        
        {formData.strategyType === 'movingAverageCrossover' && (
          <div className="form-row">
            <div className="form-group">
              <label>Short Period</label>
              <input
                type="number"
                name="parameters.shortPeriod"
                value={formData.parameters.shortPeriod}
                onChange={handleChange}
                min="1"
                max="50"
              />
            </div>
            
            <div className="form-group">
              <label>Long Period</label>
              <input
                type="number"
                name="parameters.longPeriod"
                value={formData.parameters.longPeriod}
                onChange={handleChange}
                min="5"
                max="200"
              />
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isRunning}
          className="run-backtest-btn"
        >
          {isRunning ? 'Running Backtest...' : 'Run Backtest'}
        </button>
      </form>
    </div>
  );
};

export default StrategyBuilder;