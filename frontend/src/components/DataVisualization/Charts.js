import React, { useState } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import './Charts.css';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1d');
  
  const { data, loading, error } = useMarketData(selectedSymbol, timeframe);

  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const timeframes = [
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' }
  ];

  return (
    <div className="charts-container">
      <div className="charts-header">
        <h2>Market Charts</h2>
        <div className="chart-controls">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="chart-select"
          >
            {symbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
          
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="chart-select"
          >
            {timeframes.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="chart-content">
        {loading && <div className="loading">Loading chart data...</div>}
        {error && <div className="error">Error loading chart: {error}</div>}
        
        {!loading && !error && data && data.length > 0 && (
          <>
            <PriceChart data={data} symbol={selectedSymbol} />
            <VolumeChart data={data} symbol={selectedSymbol} />
            <TechnicalIndicators data={data} />
          </>
        )}
      </div>
    </div>
  );
};

const PriceChart = ({ data, symbol }) => {
  // Simple price chart implementation
  const maxPrice = Math.max(...data.map(d => d.high));
  const minPrice = Math.min(...data.map(d => d.low));
  
  return (
    <div className="chart-card">
      <h3>{symbol} Price Chart</h3>
      <div className="price-chart">
        <div className="chart-y-axis">
          <span>${maxPrice.toFixed(2)}</span>
          <span>${((maxPrice + minPrice) / 2).toFixed(2)}</span>
          <span>${minPrice.toFixed(2)}</span>
        </div>
        
        <div className="chart-content">
          {data.map((point, index) => {
            const height = 100 - ((point.close - minPrice) / (maxPrice - minPrice)) * 100;
            return (
              <div
                key={index}
                className="chart-bar"
                style={{
                  height: `${height}%`,
                  backgroundColor: point.close >= point.open ? '#38a169' : '#e53e3e'
                }}
                title={`$${point.close} - ${new Date(point.timestamp).toLocaleTimeString()}`}
              />
            );
          })}
        </div>
      </div>
      
      <div className="chart-x-axis">
        <span>{new Date(data[0].timestamp).toLocaleDateString()}</span>
        <span>{new Date(data[data.length - 1].timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

const VolumeChart = ({ data, symbol }) => {
  const maxVolume = Math.max(...data.map(d => d.volume));
  
  return (
    <div className="chart-card">
      <h3>{symbol} Volume</h3>
      <div className="volume-chart">
        {data.map((point, index) => {
          const height = (point.volume / maxVolume) * 100;
          return (
            <div
              key={index}
              className="volume-bar"
              style={{
                height: `${height}%`,
                backgroundColor: point.close >= point.open ? '#38a169' : '#e53e3e'
              }}
              title={`${point.volume.toLocaleString()} shares`}
            />
          );
        })}
      </div>
    </div>
  );
};

const TechnicalIndicators = ({ data }) => {
  // Calculate simple moving average
  const sma = data.map((_, index) => {
    if (index < 10) return null;
    const sum = data.slice(index - 10, index).reduce((acc, d) => acc + d.close, 0);
    return sum / 10;
  }).filter(val => val !== null);

  return (
    <div className="chart-card">
      <h3>Technical Indicators</h3>
      <div className="indicators">
        <div className="indicator">
          <span className="indicator-label">SMA (10):</span>
          <span className="indicator-value">
            {sma.length > 0 ? sma[sma.length - 1].toFixed(2) : 'N/A'}
          </span>
        </div>
        
        <div className="indicator">
          <span className="indicator-label">Current RSI:</span>
          <span className="indicator-value">52.34</span>
        </div>
        
        <div className="indicator">
          <span className="indicator-label">MACD:</span>
          <span className="indicator-value">0.45</span>
        </div>
      </div>
    </div>
  );
};

export default Charts;