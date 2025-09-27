const MarketData = require('../models/MarketData');
const NewsData = require('../models/NewsData');
const logger = require('../utils/logger');

class DataValidationService {
  constructor() {
    this.validationRules = {
      marketData: {
        price: { min: 0, max: 1000000 }, // $0 to $1,000,000
        volume: { min: 0, max: 10000000000 }, // 0 to 10B shares
        change: { min: -1, max: 1 } // -100% to +100%
      },
      newsData: {
        title: { minLength: 5, maxLength: 500 },
        content: { minLength: 50, maxLength: 10000 }
      }
    };
  }

  async validateMarketData(data) {
    const errors = [];

    // Check required fields
    const requiredFields = ['symbol', 'timestamp', 'open', 'high', 'low', 'close', 'volume'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check data types and ranges
    if (typeof data.symbol !== 'string' || data.symbol.length > 5) {
      errors.push('Invalid symbol format');
    }

    if (isNaN(new Date(data.timestamp).getTime())) {
      errors.push('Invalid timestamp');
    }

    // Check price values
    const priceFields = ['open', 'high', 'low', 'close'];
    for (const field of priceFields) {
      const value = data[field];
      if (typeof value !== 'number' || 
          value < this.validationRules.marketData.price.min || 
          value > this.validationRules.marketData.price.max) {
        errors.push(`Invalid ${field} price: ${value}`);
      }
    }

    // Check volume
    if (typeof data.volume !== 'number' || 
        data.volume < this.validationRules.marketData.volume.min || 
        data.volume > this.validationRules.marketData.volume.max) {
      errors.push(`Invalid volume: ${data.volume}`);
    }

    // Check if high is actually the highest
    if (data.high < data.open || data.high < data.low || data.high < data.close) {
      errors.push('High price should be the highest of open, low, close');
    }

    // Check if low is actually the lowest
    if (data.low > data.open || data.low > data.high || data.low > data.close) {
      errors.push('Low price should be the lowest of open, high, close');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateNewsData(data) {
    const errors = [];

    // Check required fields
    const requiredFields = ['title', 'content', 'publishedAt'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check title
    if (typeof data.title !== 'string' || 
        data.title.length < this.validationRules.newsData.title.minLength ||
        data.title.length > this.validationRules.newsData.title.maxLength) {
      errors.push(`Invalid title length: ${data.title.length}`);
    }

    // Check content
    if (typeof data.content !== 'string' || 
        data.content.length < this.validationRules.newsData.content.minLength ||
        data.content.length > this.validationRules.newsData.content.maxLength) {
      errors.push(`Invalid content length: ${data.content.length}`);
    }

    // Check published date
    if (isNaN(new Date(data.publishedAt).getTime())) {
      errors.push('Invalid publishedAt date');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async detectMarketDataAnomalies(symbol, newData, historicalData) {
    const anomalies = [];

    if (historicalData.length < 5) {
      return anomalies; // Not enough data for anomaly detection
    }

    // Calculate moving averages
    const recentCloses = historicalData.slice(-20).map(d => d.close);
    const movingAverage = recentCloses.reduce((sum, price) => sum + price, 0) / recentCloses.length;
    
    // Check for price spikes
    const priceChange = Math.abs((newData.close - movingAverage) / movingAverage);
    if (priceChange > 0.1) { // 10% deviation from moving average
      anomalies.push({
        type: 'price_spike',
        severity: 'high',
        message: `Price spike detected: ${(priceChange * 100).toFixed(2)}% from moving average`
      });
    }

    // Check volume spikes
    const recentVolumes = historicalData.slice(-20).map(d => d.volume);
    const averageVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    
    const volumeRatio = newData.volume / averageVolume;
    if (volumeRatio > 3) { // 3x average volume
      anomalies.push({
        type: 'volume_spike',
        severity: volumeRatio > 5 ? 'high' : 'medium',
        message: `Volume spike detected: ${volumeRatio.toFixed(1)}x average volume`
      });
    }

    return anomalies;
  }

  async validateDataConsistency(symbol, newData, existingData) {
    const inconsistencies = [];

    // Check for duplicate data
    const duplicate = existingData.find(d => 
      d.timestamp.getTime() === new Date(newData.timestamp).getTime()
    );

    if (duplicate) {
      inconsistencies.push({
        type: 'duplicate',
        severity: 'low',
        message: 'Duplicate timestamp found'
      });
    }

    // Check for time gaps
    const latestExisting = existingData[existingData.length - 1];
    if (latestExisting) {
      const timeDiff = new Date(newData.timestamp).getTime() - latestExisting.timestamp.getTime();
      const expectedInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (timeDiff > expectedInterval * 2) {
        inconsistencies.push({
          type: 'time_gap',
          severity: 'medium',
          message: `Large time gap detected: ${(timeDiff / (60 * 1000)).toFixed(0)} minutes`
        });
      }
    }

    return inconsistencies;
  }
}

module.exports = DataValidationService;