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
  const { data, loading, error } = useMarketData(symbol, '1d');
  
  if (loading) return <div className="symbol-card loading">Loading...</div>;
  if (error) return <div className="symbol-card error">Error loading {symbol}</div>;
  
  if (!data || data.length === 0) {
    return <div className="symbol-card">No data for {symbol}</div>;
  }
  
  const latest = data[0];
  const previous = data[1] || latest;
  const change = latest.close - previous.close;
  const changePercent = (change / previous.close) * 100;
  
  return (
    <div className="symbol-card">
      <div className="symbol-header">
        <span className="symbol">{symbol}</span>
        <span className={`price-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      <div className="symbol-price">${latest.close.toFixed(2)}</div>
      <div className="symbol-details">
        <div>High: ${latest.high.toFixed(2)}</div>
        <div>Low: ${latest.low.toFixed(2)}</div>
        <div>Vol: {(latest.volume / 1000000).toFixed(1)}M</div>
      </div>
    </div>
  );
};

export default MarketOverview;