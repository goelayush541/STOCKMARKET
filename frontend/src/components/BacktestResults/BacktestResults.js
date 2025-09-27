import React, { useState } from 'react';
import StrategyBuilder from './StrategyBuilder';
import { api } from '../../services/api';
import './BacktestResults.css';

const BacktestResults = () => {
  const [backtestResults, setBacktestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleBacktestComplete = (results) => {
    setBacktestResults(results);
    setError(null);
  };

  const handleRunBacktest = async (strategyConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await api.runBacktest(strategyConfig);
      setBacktestResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="backtest-results">
      <div className="backtest-header">
        <h2>Strategy Backtesting</h2>
        <p>Test your trading strategies against historical data</p>
      </div>

      <div className="backtest-content">
        <div className="strategy-builder-section">
          <StrategyBuilder onBacktestComplete={handleBacktestComplete} />
        </div>

        <div className="results-section">
          {isLoading && (
            <div className="loading">Running backtest...</div>
          )}

          {error && (
            <div className="error">
              <h3>Backtest Failed</h3>
              <p>{error}</p>
            </div>
          )}

          {backtestResults && (
            <BacktestResultDisplay results={backtestResults} />
          )}
        </div>
      </div>
    </div>
  );
};

const BacktestResultDisplay = ({ results }) => {
  const performance = results.performance;
  const isPositive = performance.totalReturn >= 0;

  return (
    <div className="backtest-result">
      <div className="result-header">
        <h3>Backtest Results: {results.strategyName}</h3>
        <span className={`result-summary ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{performance.totalReturn.toFixed(2)}%
        </span>
      </div>

      <div className="performance-grid">
        <div className="metric-card">
          <div className="metric-label">Total Return</div>
          <div className={`metric-value ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{performance.totalReturn.toFixed(2)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Annualized Return</div>
          <div className={`metric-value ${performance.annualizedReturn >= 0 ? 'positive' : 'negative'}`}>
            {performance.annualizedReturn >= 0 ? '+' : ''}{performance.annualizedReturn.toFixed(2)}%
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Sharpe Ratio</div>
          <div className="metric-value">{performance.sharpeRatio.toFixed(2)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Max Drawdown</div>
          <div className="metric-value negative">-{performance.maxDrawdown.toFixed(2)}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Volatility</div>
          <div className="metric-value">{performance.volatility.toFixed(2)}%</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Final Value</div>
          <div className="metric-value">
            ${performance.finalValue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="trades-section">
        <h4>Trade History</h4>
        <div className="trades-table">
          <div className="trade-row header">
            <div>Date</div>
            <div>Symbol</div>
            <div>Action</div>
            <div>Quantity</div>
            <div>Price</div>
            <div>Value</div>
          </div>
          
          {results.trades.slice(0, 10).map((trade, index) => (
            <div key={index} className="trade-row">
              <div>{new Date(trade.timestamp).toLocaleDateString()}</div>
              <div>{trade.symbol}</div>
              <div className={`trade-action ${trade.action.toLowerCase()}`}>
                {trade.action}
              </div>
              <div>{trade.quantity}</div>
              <div>${trade.price.toFixed(2)}</div>
              <div>${trade.value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BacktestResults;