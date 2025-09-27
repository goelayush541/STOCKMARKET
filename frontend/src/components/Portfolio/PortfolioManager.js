import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import './Portfolio.css';

const PortfolioManager = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPortfolio = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getPortfolio();
      setPortfolio(data);
    } catch (err) {
      setError(err.message);
      // Create a mock portfolio for demonstration
      setPortfolio(createMockPortfolio());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const createMockPortfolio = () => {
    const mockPositions = [
      {
        symbol: 'AAPL',
        quantity: 10,
        entryPrice: 150.25,
        currentPrice: 175.24,
        entryDate: new Date('2024-01-15'),
        signalType: 'BUY'
      },
      {
        symbol: 'MSFT',
        quantity: 5,
        entryPrice: 320.50,
        currentPrice: 345.67,
        entryDate: new Date('2024-02-01'),
        signalType: 'BUY'
      }
    ];

    // Calculate values based on positions
    const positionsValue = mockPositions.reduce((total, position) => {
      const currentPrice = position.currentPrice || position.entryPrice;
      return total + (position.quantity * currentPrice);
    }, 0);

    const initialBalance = 100000;
    const cashBalance = 25000;
    const totalValue = positionsValue + cashBalance;
    const totalReturn = ((totalValue - initialBalance) / initialBalance) * 100;
    const unrealizedPnL = mockPositions.reduce((total, position) => {
      if (!position.currentPrice) return total;
      return total + ((position.currentPrice - position.entryPrice) * position.quantity);
    }, 0);

    return {
      balance: cashBalance,
      initialBalance: initialBalance,
      positions: mockPositions,
      totalValue: totalValue,
      totalReturn: totalReturn,
      unrealizedPnL: unrealizedPnL
    };
  };

  const calculatePositionValue = (position) => {
    const currentPrice = position.currentPrice || position.entryPrice;
    return position.quantity * currentPrice;
  };

  const calculatePositionPnL = (position) => {
    if (!position.currentPrice) return 0;
    return (position.currentPrice - position.entryPrice) * position.quantity;
  };

  const calculatePositionPnLPercent = (position) => {
    if (!position.currentPrice) return 0;
    return ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
  };

  // Calculate portfolio metrics
  const calculatePortfolioMetrics = (portfolioData) => {
    if (!portfolioData || !portfolioData.positions) {
      return {
        totalValue: portfolioData?.balance || 0,
        totalReturn: 0,
        unrealizedPnL: 0,
        positionsValue: 0
      };
    }

    const positionsValue = portfolioData.positions.reduce((total, position) => {
      return total + calculatePositionValue(position);
    }, 0);

    const totalValue = positionsValue + (portfolioData.balance || 0);
    const totalReturn = portfolioData.initialBalance 
      ? ((totalValue - portfolioData.initialBalance) / portfolioData.initialBalance) * 100
      : 0;

    const unrealizedPnL = portfolioData.positions.reduce((total, position) => {
      return total + calculatePositionPnL(position);
    }, 0);

    return {
      totalValue,
      totalReturn,
      unrealizedPnL,
      positionsValue
    };
  };

  if (loading) return <div className="portfolio-loading">Loading portfolio...</div>;
  if (error) return <div className="portfolio-error">Error: {error}</div>;
  if (!portfolio) return <div>No portfolio found</div>;

  const { totalValue, totalReturn, unrealizedPnL, positionsValue } = calculatePortfolioMetrics(portfolio);

  return (
    <div className="portfolio-manager">
      <div className="portfolio-header">
        <h2>Portfolio Overview</h2>
        <div className="portfolio-summary">
          <div className="summary-item">
            <span className="label">Total Value:</span>
            <span className="value">${totalValue.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Cash Balance:</span>
            <span className="value">${portfolio.balance.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Invested Value:</span>
            <span className="value">${positionsValue.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Total Return:</span>
            <span className={`value ${totalReturn >= 0 ? 'positive' : 'negative'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      <div className="positions-section">
        <h3>Positions ({portfolio.positions?.length || 0})</h3>
        {!portfolio.positions || portfolio.positions.length === 0 ? (
          <div className="no-positions">
            <p>No positions yet. Start trading to build your portfolio.</p>
            <button className="btn-primary" onClick={() => window.location.href = '#/signals'}>
              View Trading Signals
            </button>
          </div>
        ) : (
          <div className="positions-grid">
            {portfolio.positions.map((position, index) => (
              <PositionCard
                key={`${position.symbol}-${index}`}
                position={position}
                calculatePositionValue={calculatePositionValue}
                calculatePositionPnL={calculatePositionPnL}
                calculatePositionPnLPercent={calculatePositionPnLPercent}
              />
            ))}
          </div>
        )}
      </div>

      <div className="performance-section">
        <h3>Performance Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Total Return</span>
            <span className={`metric-value ${totalReturn >= 0 ? 'positive' : 'negative'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Unrealized P&L</span>
            <span className={`metric-value ${unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
              {unrealizedPnL >= 0 ? '+' : ''}${Math.abs(unrealizedPnL).toFixed(2)}
            </span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Number of Positions</span>
            <span className="metric-value">{portfolio.positions?.length || 0}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Initial Investment</span>
            <span className="metric-value">${portfolio.initialBalance?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="portfolio-actions">
        <button className="btn-primary" onClick={loadPortfolio}>
          Refresh Portfolio
        </button>
      </div>
    </div>
  );
};

const PositionCard = ({ position, calculatePositionValue, calculatePositionPnL, calculatePositionPnLPercent }) => {
  const pnl = calculatePositionPnL(position);
  const pnlPercent = calculatePositionPnLPercent(position);
  const positionValue = calculatePositionValue(position);
  const currentPrice = position.currentPrice || position.entryPrice;

  return (
    <div className="position-card">
      <div className="position-header">
        <span className="symbol">{position.symbol}</span>
        <span className={`pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
          {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
        </span>
      </div>
      
      <div className="position-details">
        <div className="detail-row">
          <span className="detail-label">Quantity:</span>
          <span className="detail-value">{position.quantity}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Avg Price:</span>
          <span className="detail-value">${position.entryPrice.toFixed(2)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Current Price:</span>
          <span className="detail-value">${currentPrice.toFixed(2)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Position Value:</span>
          <span className="detail-value">${positionValue.toFixed(2)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">P&L:</span>
          <span className={`detail-value ${pnl >= 0 ? 'positive' : 'negative'}`}>
            {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="position-footer">
        <span className="position-date">
          Opened: {new Date(position.entryDate).toLocaleDateString()}
        </span>
        <span className={`signal-type ${position.signalType?.toLowerCase()}`}>
          {position.signalType}
        </span>
      </div>
    </div>
  );
};

export default PortfolioManager;