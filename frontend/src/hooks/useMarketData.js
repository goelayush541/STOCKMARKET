import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export const useMarketData = (symbol, period = '1d') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMarketData = useCallback(async () => {
    if (!symbol) {
      setData([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const marketData = await api.getMarketData(symbol, period);
      
      // Ensure we have a valid array of market data
      if (Array.isArray(marketData) && marketData.length > 0) {
        setData(marketData);
        setLastUpdated(new Date());
      } else {
        // If no data returned, use mock data for development
        const mockData = generateMockMarketData(symbol, 20);
        setData(mockData);
        setLastUpdated(new Date());
        setError('Using mock data (real data unavailable)');
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      
      // Fallback to mock data on error
      const mockData = generateMockMarketData(symbol, 20);
      setData(mockData);
      setLastUpdated(new Date());
      setError(`Server error: ${err.message}. Using mock data.`);
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Calculate derived data
  const currentPrice = data.length > 0 ? data[0].close : 0;
  const previousPrice = data.length > 1 ? data[1].close : currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

  const volume = data.length > 0 ? data[0].volume : 0;
  const averageVolume = data.length > 0 
    ? data.reduce((sum, item) => sum + item.volume, 0) / data.length 
    : 0;

  // Calculate technical indicators
  const technicalIndicators = calculateTechnicalIndicators(data);

  // Refresh function
  const refresh = async () => {
    await fetchMarketData();
  };

  return { 
    data, 
    loading, 
    error, 
    lastUpdated,
    refresh,
    // Derived data
    currentPrice,
    previousPrice,
    priceChange,
    priceChangePercent,
    volume,
    averageVolume,
    // Technical indicators
    technicalIndicators
  };
};

// Helper function to generate mock market data
const generateMockMarketData = (symbol, count = 20) => {
  const basePrice = 100 + Math.random() * 500; // $100-$600 base price
  let currentPrice = basePrice;
  const data = [];

  for (let i = 0; i < count; i++) {
    const priceChange = (Math.random() - 0.5) * 10; // -5 to +5 price change
    currentPrice += priceChange;
    const volume = 1000000 + Math.random() * 9000000; // 1M-10M volume
    
    // Ensure prices are realistic (high >= low, etc.)
    const open = currentPrice - Math.random() * 2;
    const high = Math.max(currentPrice, open) + Math.random() * 3;
    const low = Math.min(currentPrice, open) - Math.random() * 3;
    const close = currentPrice;

    data.push({
      symbol: symbol.toUpperCase(),
      timestamp: new Date(Date.now() - i * 5 * 60 * 1000), // 5-minute intervals going back
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(volume),
      source: 'mock'
    });
  }

  return data.reverse(); // Return in chronological order (oldest first)
};

// Calculate technical indicators
const calculateTechnicalIndicators = (data) => {
  if (data.length < 2) {
    return {
      sma20: 0,
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0 }
    };
  }

  // Simple Moving Average (20 periods)
  const sma20 = data.length >= 20 
    ? data.slice(0, 20).reduce((sum, item) => sum + item.close, 0) / 20
    : data.reduce((sum, item) => sum + item.close, 0) / data.length;

  // RSI Calculation (simplified)
  const rsi = calculateRSI(data.slice(0, 14));

  // MACD Calculation (simplified)
  const macd = calculateMACD(data);

  // Bollinger Bands (simplified)
  const bollingerBands = calculateBollingerBands(data);

  return {
    sma20: parseFloat(sma20.toFixed(2)),
    rsi: parseFloat(rsi.toFixed(2)),
    macd,
    bollingerBands
  };
};

// RSI Calculation
const calculateRSI = (data) => {
  if (data.length < 2) return 50;

  let gains = 0;
  let losses = 0;
  let gainCount = 0;
  let lossCount = 0;

  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) {
      gains += change;
      gainCount++;
    } else {
      losses -= change;
      lossCount++;
    }
  }

  const avgGain = gainCount > 0 ? gains / gainCount : 0;
  const avgLoss = lossCount > 0 ? losses / lossCount : 0;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

// MACD Calculation (simplified)
const calculateMACD = (data) => {
  if (data.length < 26) {
    return { value: 0, signal: 0, histogram: 0 };
  }

  // Simplified MACD calculation
  const ema12 = calculateEMA(data.slice(0, 12), 12);
  const ema26 = calculateEMA(data.slice(0, 26), 26);
  const macdValue = ema12 - ema26;
  const signal = calculateEMA(data.slice(0, 9).map((_, i) => ({ close: macdValue })), 9); // Simplified signal line
  const histogram = macdValue - signal;

  return {
    value: parseFloat(macdValue.toFixed(4)),
    signal: parseFloat(signal.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4))
  };
};

// EMA Calculation
const calculateEMA = (data, period) => {
  if (data.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = data[0].close;

  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
  }

  return ema;
};

// Bollinger Bands Calculation
const calculateBollingerBands = (data, period = 20) => {
  if (data.length < period) {
    const currentPrice = data.length > 0 ? data[0].close : 0;
    return { upper: currentPrice, middle: currentPrice, lower: currentPrice };
  }

  const slice = data.slice(0, period);
  const middle = slice.reduce((sum, item) => sum + item.close, 0) / period;
  
  const variance = slice.reduce((sum, item) => {
    return sum + Math.pow(item.close - middle, 2);
  }, 0) / period;
  
  const standardDeviation = Math.sqrt(variance);
  const upper = middle + (2 * standardDeviation);
  const lower = middle - (2 * standardDeviation);

  return {
    upper: parseFloat(upper.toFixed(2)),
    middle: parseFloat(middle.toFixed(2)),
    lower: parseFloat(lower.toFixed(2))
  };
};

export default useMarketData;