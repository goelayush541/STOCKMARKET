import React from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import './Charts.css';

const MarketOverview = ({ symbols = ['AAPL', 'MSFT', 'GOOGL'] }) => {
  return (
    <div className="market-overview">
      <h3>Market Overview</h3>
      <div className="symbols-grid">
        {symbols.map(symbol => (
          <SymbolCard key={symbol} symbol={symbol} />
        ))}
      </div>
    </div>
  );
};

const SymbolCard = ({ symbol }) => {
  const { data, loading, error, currentPrice, priceChangePercent } = useMarketData(symbol, '1d');

  if (loading) {
    return (
      <div className="symbol-card loading">
        <div className="symbol">{symbol}</div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="symbol-card error">
        <div className="symbol">{symbol}</div>
        <div>Error loading data</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="symbol-card">
        <div className="symbol">{symbol}</div>
        <div>No data available</div>
      </div>
    );
  }

  const latestData = data[0] || {};
  const isPositive = priceChangePercent >= 0;

  return (
    <div className="symbol-card">
      <div className="symbol-header">
        <span className="symbol">{symbol}</span>
        <span className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(priceChangePercent).toFixed(2)}%
        </span>
      </div>
      <div className="symbol-price">${currentPrice.toFixed(2)}</div>
      <div className="symbol-details">
        <div>High: ${latestData.high?.toFixed(2) || 'N/A'}</div>
        <div>Low: ${latestData.low?.toFixed(2) || 'N/A'}</div>
        <div>Vol: {latestData.volume ? `${(latestData.volume / 1000000).toFixed(1)}M` : 'N/A'}</div>
      </div>
    </div>
  );
};

export default MarketOverview;