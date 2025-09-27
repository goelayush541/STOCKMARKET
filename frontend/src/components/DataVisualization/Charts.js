import React, { useState, useEffect, useMemo } from 'react';
import { useMarketData } from '../../hooks/useMarketData';
import './Charts.css';

const Charts = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1d');
  const [chartType, setChartType] = useState('price'); // 'price', 'volume', 'combined'
  
  const { data: marketData, loading, error } = useMarketData(selectedSymbol, timeframe);

  // Process and validate data
  const processedData = useMemo(() => {
    if (!marketData || !Array.isArray(marketData)) {
      return generateMockData(selectedSymbol, 50);
    }

    const validData = marketData
      .filter(item => item && 
        item.timestamp && 
        typeof item.close === 'number' && 
        !isNaN(item.close)
      )
      .map(item => ({
        ...item,
        timestamp: new Date(item.timestamp),
        date: new Date(item.timestamp).toLocaleDateString(),
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    return validData.length > 0 ? validData : generateMockData(selectedSymbol, 50);
  }, [marketData, selectedSymbol]);

  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const timeframes = [
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1m', label: '1 Month' }
  ];
  const chartTypes = [
    { value: 'price', label: 'Price Chart' },
    { value: 'volume', label: 'Volume Chart' },
    { value: 'combined', label: 'Combined View' }
  ];

  // Generate mock data fallback
  function generateMockData(symbol, count = 50) {
    const mockData = [];
    const basePrice = 100 + Math.random() * 100;
    let currentPrice = basePrice;
    const now = new Date();
    
    for (let i = 0; i < count; i++) {
      const priceChange = (Math.random() - 0.5) * 3;
      currentPrice = Math.max(1, currentPrice + priceChange); // Ensure price doesn't go below 1
      
      const timestamp = new Date(now - (count - i) * 5 * 60 * 1000);
      
      mockData.push({
        symbol,
        timestamp,
        date: timestamp.toLocaleDateString(),
        time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        open: Math.max(1, currentPrice - Math.random() * 2),
        high: Math.max(1, currentPrice + Math.random() * 3),
        low: Math.max(1, currentPrice - Math.random() * 3),
        close: Math.max(1, currentPrice),
        volume: Math.floor(1000000 + Math.random() * 9000000)
      });
    }
    
    return mockData;
  }

  return (
    <div className="charts-container">
      <div className="charts-header">
        <h2>Market Charts</h2>
        <div className="chart-controls">
          <div className="control-group">
            <label>Symbol:</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="chart-select"
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>
          
          <div className="control-group">
            <label>Timeframe:</label>
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

          <div className="control-group">
            <label>Chart Type:</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="chart-select"
            >
              {chartTypes.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="chart-content">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading market data for {selectedSymbol}...</p>
          </div>
        )}
        
        {error && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Unable to load real-time data</h3>
            <p>Showing demo data for {selectedSymbol}</p>
            <small>Error: {error.message || error}</small>
          </div>
        )}

        {!loading && processedData.length > 0 && (
          <>
            {chartType === 'price' && (
              <PriceChart data={processedData} symbol={selectedSymbol} />
            )}
            
            {chartType === 'volume' && (
              <VolumeChart data={processedData} symbol={selectedSymbol} />
            )}
            
            {chartType === 'combined' && (
              <div className="combined-charts">
                <PriceChart data={processedData} symbol={selectedSymbol} />
                <VolumeChart data={processedData} symbol={selectedSymbol} />
              </div>
            )}
            
            <TechnicalIndicators data={processedData} symbol={selectedSymbol} />
            <ChartStatistics data={processedData} />
          </>
        )}
      </div>
    </div>
  );
};

// Price Chart Component
const PriceChart = ({ data, symbol }) => {
  if (!data || data.length === 0) return null;

  const prices = data.map(d => d.close).filter(price => !isNaN(price));
  if (prices.length === 0) return null;

  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

  const priceChange = data.length > 1 ? prices[prices.length - 1] - prices[0] : 0;
  const priceChangePercent = data.length > 1 ? (priceChange / prices[0]) * 100 : 0;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{symbol} Price Chart</h3>
        <div className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
          {priceChange >= 0 ? '↗' : '↘'} ${priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
        </div>
      </div>
      
      <div className="price-chart-container">
        <div className="chart-y-axis">
          <span>${maxPrice.toFixed(2)}</span>
          <span>${((maxPrice + minPrice) / 2).toFixed(2)}</span>
          <span>${minPrice.toFixed(2)}</span>
        </div>
        
        <div className="chart-main">
          <div className="chart-bars">
            {data.map((point, index) => {
              if (isNaN(point.close)) return null;
              
              const height = 100 - ((point.close - minPrice) / priceRange) * 100;
              const isPositive = point.close >= (point.open || point.close);
              
              return (
                <div
                  key={index}
                  className="chart-bar"
                  style={{
                    height: `${Math.max(1, height)}%`, // Ensure minimum height
                    backgroundColor: isPositive ? '#10b981' : '#ef4444',
                    opacity: 0.7 + (index / data.length) * 0.3 // Gradient effect
                  }}
                  title={`$${point.close.toFixed(2)}
Open: $${point.open?.toFixed(2) || point.close.toFixed(2)}
High: $${point.high?.toFixed(2) || point.close.toFixed(2)}
Low: $${point.low?.toFixed(2) || point.close.toFixed(2)}
Volume: ${point.volume?.toLocaleString() || 'N/A'}
${point.date} ${point.time}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="chart-x-axis">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

// Volume Chart Component
const VolumeChart = ({ data, symbol }) => {
  if (!data || data.length === 0) return null;

  const volumes = data.map(d => d.volume).filter(vol => !isNaN(vol));
  if (volumes.length === 0) return null;

  const maxVolume = Math.max(...volumes);
  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
  const avgVolume = totalVolume / volumes.length;

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{symbol} Trading Volume</h3>
        <div className="volume-stats">
          Avg: {(avgVolume / 1000000).toFixed(1)}M | Total: {(totalVolume / 1000000).toFixed(0)}M
        </div>
      </div>
      
      <div className="volume-chart-container">
        <div className="volume-bars">
          {data.map((point, index) => {
            if (!point.volume || isNaN(point.volume)) return null;
            
            const height = (point.volume / maxVolume) * 100;
            const isPositive = point.close >= (point.open || point.close);
            
            return (
              <div
                key={index}
                className="volume-bar"
                style={{
                  height: `${Math.max(1, height)}%`,
                  backgroundColor: isPositive ? '#10b981' : '#ef4444',
                  opacity: 0.6
                }}
                title={`Volume: ${point.volume.toLocaleString()}
${point.date} ${point.time}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Technical Indicators Component
const TechnicalIndicators = ({ data, symbol }) => {
  if (!data || data.length < 5) return null;

  // Calculate Simple Moving Average
  const calculateSMA = (period = 10) => {
    if (data.length < period) return null;
    const recentData = data.slice(-period);
    const sum = recentData.reduce((acc, point) => acc + point.close, 0);
    return sum / period;
  };

  // Calculate RSI
  const calculateRSI = (period = 14) => {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period || 1; // Avoid division by zero
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  // Calculate MACD (simplified)
  const calculateMACD = () => {
    if (data.length < 26) return { value: 0, signal: 0 };
    
    const ema12 = calculateEMA(12);
    const ema26 = calculateEMA(26);
    const macdLine = ema12 - ema26;
    
    return {
      value: macdLine,
      signal: macdLine > 0 ? 'BULLISH' : 'BEARISH'
    };
  };

  const calculateEMA = (period) => {
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
    }
    
    return ema;
  };

  const sma10 = calculateSMA(10);
  const sma20 = calculateSMA(20);
  const rsi = calculateRSI();
  const macd = calculateMACD();
  const currentPrice = data[data.length - 1]?.close;

  return (
    <div className="chart-card">
      <h3>Technical Indicators - {symbol}</h3>
      <div className="indicators-grid">
        <div className="indicator-item">
          <span className="indicator-label">Current Price:</span>
          <span className="indicator-value">${currentPrice?.toFixed(2) || 'N/A'}</span>
        </div>
        
        <div className="indicator-item">
          <span className="indicator-label">SMA (10):</span>
          <span className="indicator-value">
            {sma10 ? `$${sma10.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        
        <div className="indicator-item">
          <span className="indicator-label">SMA (20):</span>
          <span className="indicator-value">
            {sma20 ? `$${sma20.toFixed(2)}` : 'N/A'}
          </span>
        </div>
        
        <div className="indicator-item">
          <span className="indicator-label">RSI (14):</span>
          <span className={`indicator-value ${
            rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'normal'
          }`}>
            {rsi ? rsi.toFixed(1) : 'N/A'}
          </span>
        </div>
        
        <div className="indicator-item">
          <span className="indicator-label">MACD:</span>
          <span className={`indicator-value ${macd.value > 0 ? 'bullish' : 'bearish'}`}>
            {macd.value ? macd.value.toFixed(3) : 'N/A'}
          </span>
        </div>
        
        <div className="indicator-item">
          <span className="indicator-label">Trend:</span>
          <span className={`indicator-value ${
            sma10 && sma20 ? (sma10 > sma20 ? 'bullish' : 'bearish') : 'neutral'
          }`}>
            {sma10 && sma20 ? (sma10 > sma20 ? '↗ Bullish' : '↘ Bearish') : 'Neutral'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Chart Statistics Component
const ChartStatistics = ({ data }) => {
  if (!data || data.length < 2) return null;

  const prices = data.map(d => d.close).filter(p => !isNaN(p));
  const volumes = data.map(d => d.volume).filter(v => !isNaN(v));

  const priceStats = {
    high: Math.max(...prices),
    low: Math.min(...prices),
    current: prices[prices.length - 1],
    change: prices[prices.length - 1] - prices[0],
    changePercent: ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
  };

  const volumeStats = {
    total: volumes.reduce((sum, vol) => sum + vol, 0),
    average: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
    max: Math.max(...volumes)
  };

  return (
    <div className="chart-card">
      <h3>Market Statistics</h3>
      <div className="statistics-grid">
        <div className="stat-item">
          <span className="stat-label">Period High:</span>
          <span className="stat-value">${priceStats.high.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Period Low:</span>
          <span className="stat-value">${priceStats.low.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Price Change:</span>
          <span className={`stat-value ${priceStats.change >= 0 ? 'positive' : 'negative'}`}>
            {priceStats.change >= 0 ? '+' : ''}{priceStats.change.toFixed(2)} ({priceStats.changePercent.toFixed(2)}%)
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Volume:</span>
          <span className="stat-value">{(volumeStats.average / 1000000).toFixed(1)}M</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Volume:</span>
          <span className="stat-value">{(volumeStats.total / 1000000).toFixed(0)}M</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Data Points:</span>
          <span className="stat-value">{data.length}</span>
        </div>
      </div>
    </div>
  );
};

export default Charts;