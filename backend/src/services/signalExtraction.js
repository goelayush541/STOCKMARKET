const NewsData = require('../models/NewsData');
const MarketData = require('../models/MarketData');
const Signal = require('../models/Signals');
const { connectToSnowflake } = require('../config/snowflake');
const logger = require('../utils/logger');

class SignalExtractionService {
  constructor() {
    this.sentimentThreshold = 0.7;
    this.volumeSpikeThreshold = 2.0; // 2x average volume
  }

  async extractSignalsFromNews() {
    try {
      // Get news with strong sentiment from the last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const impactfulNews = await NewsData.find({
        sentimentScore: { $exists: true, $gt: this.sentimentThreshold },
        publishedAt: { $gte: twentyFourHoursAgo }
      }).sort({ publishedAt: -1 }).limit(100);
      
      const signals = [];
      
      for (const news of impactfulNews) {
        // Extract symbols using more sophisticated pattern matching
        const symbols = this.extractSymbolsFromNews(news);
        
        for (const symbol of symbols) {
          try {
            // Get recent market data for this symbol
            const recentMarketData = await MarketData.find({
              symbol,
              timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            }).sort({ timestamp: -1 });
            
            if (recentMarketData.length > 5) { // Ensure we have enough data
              // Calculate volume spike
              const volumeSpike = this.calculateVolumeSpike(recentMarketData);
              
              // Determine signal type based on sentiment and price movement
              const signalType = this.determineSignalType(news, recentMarketData);
              
              // Calculate confidence score
              const confidence = this.calculateConfidence(news, recentMarketData, volumeSpike);
              
              if (confidence > 0.6) { // Only create signals with sufficient confidence
                const signal = new Signal({
                  symbol,
                  signalType,
                  strength: Math.abs(news.sentimentScore),
                  source: 'news_sentiment',
                  confidence,
                  relatedNews: [news._id],
                  relatedMarketData: recentMarketData.slice(0, 5).map(data => ({
                    timestamp: data.timestamp,
                    price: data.close,
                    volume: data.volume
                  })),
                  explanation: this.generateExplanation(news, recentMarketData, volumeSpike, signalType),
                  expiration: new Date(Date.now() + 2 * 60 * 60 * 1000) // Signal expires in 2 hours
                });
                
                signals.push(signal);
              }
            }
          } catch (error) {
            logger.error(`Error processing symbol ${symbol} for news ${news._id}:`, error);
          }
        }
      }
      
      if (signals.length > 0) {
        await Signal.insertMany(signals);
        logger.info(`Created ${signals.length} new signals from news`);
      }
      
      return { success: true, signals: signals.length };
    } catch (error) {
      logger.error('Error extracting signals from news:', error);
      throw error;
    }
  }

  extractSymbolsFromNews(news) {
    // More sophisticated symbol extraction
    const symbolPattern = /\b([A-Z]{2,5})\b/g;
    const symbols = new Set();
    
    // Extract from title and content
    const text = `${news.title} ${news.content}`;
    let match;
    
    while ((match = symbolPattern.exec(text)) !== null) {
      // Filter out common words that match symbol pattern
      const commonWords = ['IPO', 'CEO', 'CFO', 'ETF', 'USD', 'SEC', 'AI'];
      if (!commonWords.includes(match[1])) {
        symbols.add(match[1]);
      }
    }
    
    return Array.from(symbols);
  }

  calculateVolumeSpike(marketData) {
    if (marketData.length < 10) return 1; // Not enough data
    
    const recentVolume = marketData[0].volume;
    const averageVolume = marketData.slice(1, 10).reduce((sum, data) => sum + data.volume, 0) / 9;
    
    return recentVolume / averageVolume;
  }

  determineSignalType(news, marketData) {
    const priceChange = ((marketData[0].close - marketData[1].close) / marketData[1].close) * 100;
    
    if (news.sentimentLabel === 'positive' && priceChange > 0) {
      return 'BUY';
    } else if (news.sentimentLabel === 'positive' && priceChange < 0) {
      return 'BUY'; // Potential buying opportunity despite recent drop
    } else if (news.sentimentLabel === 'negative' && priceChange < 0) {
      return 'SELL';
    } else if (news.sentimentLabel === 'negative' && priceChange > 0) {
      return 'SELL'; // Potential overbought situation
    }
    
    return 'NEUTRAL';
  }

  calculateConfidence(news, marketData, volumeSpike) {
    let confidence = Math.abs(news.sentimentScore) * 0.6;
    
    // Increase confidence if there's a volume spike
    if (volumeSpike > this.volumeSpikeThreshold) {
      confidence += 0.2;
    }
    
    // Increase confidence if price movement aligns with sentiment
    const priceChange = ((marketData[0].close - marketData[1].close) / marketData[1].close) * 100;
    if ((news.sentimentLabel === 'positive' && priceChange > 0) || 
        (news.sentimentLabel === 'negative' && priceChange < 0)) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  generateExplanation(news, marketData, volumeSpike, signalType) {
    const priceChange = ((marketData[0].close - marketData[1].close) / marketData[1].close) * 100;
    
    return `Strong ${news.sentimentLabel} sentiment detected in news: "${news.title}". 
            Price ${priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange).toFixed(2)}% 
            with ${volumeSpike > 1.5 ? 'high' : 'normal'} trading volume. 
            This suggests a ${signalType} opportunity.`;
  }

  async extractTechnicalSignals(symbol, period = '1d') {
    // Implementation for technical analysis based on market data
    // This would include patterns like RSI, moving averages, etc.
    try {
      const marketData = await MarketData.find({
        symbol,
        timestamp: { $gte: new Date(Date.now() - this.getPeriodMillis(period)) }
      }).sort({ timestamp: 1 });
      
      if (marketData.length < 20) {
        return []; // Not enough data for technical analysis
      }
      
      const technicalSignals = [];
      
      // Calculate RSI
      const rsi = this.calculateRSI(marketData);
      if (rsi < 30) {
        technicalSignals.push({
          type: 'OVERSOLD',
          strength: (30 - rsi) / 30,
          confidence: 0.7
        });
      } else if (rsi > 70) {
        technicalSignals.push({
          type: 'OVERBOUGHT',
          strength: (rsi - 70) / 30,
          confidence: 0.7
        });
      }
      
      // Check for moving average crossover
      const maCrossover = this.checkMovingAverageCrossover(marketData);
      if (maCrossover) {
        technicalSignals.push(maCrossover);
      }
      
      // Convert technical signals to trading signals
      const signals = technicalSignals.map(techSignal => {
        let signalType = 'NEUTRAL';
        if (techSignal.type === 'OVERSOLD' || techSignal.type === 'BULLISH_CROSSOVER') {
          signalType = 'BUY';
        } else if (techSignal.type === 'OVERBOUGHT' || techSignal.type === 'BEARISH_CROSSOVER') {
          signalType = 'SELL';
        }
        
        return new Signal({
          symbol,
          signalType,
          strength: techSignal.strength,
          source: 'technical_analysis',
          confidence: techSignal.confidence,
          explanation: `Technical indicator: ${techSignal.type}`,
          expiration: new Date(Date.now() + 4 * 60 * 60 * 1000) // Technical signals expire in 4 hours
        });
      });
      
      if (signals.length > 0) {
        await Signal.insertMany(signals);
      }
      
      return signals;
    } catch (error) {
      logger.error(`Error extracting technical signals for ${symbol}:`, error);
      return [];
    }
  }

  calculateRSI(marketData, period = 14) {
    if (marketData.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = marketData[i].close - marketData[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  checkMovingAverageCrossover(marketData) {
    if (marketData.length < 21) return null;
    
    // Calculate 10-day and 20-day moving averages
    let sma10 = 0;
    let sma20 = 0;
    
    for (let i = 0; i < 10; i++) {
      sma10 += marketData[i].close;
    }
    sma10 /= 10;
    
    for (let i = 0; i < 20; i++) {
      sma20 += marketData[i].close;
    }
    sma20 /= 20;
    
    // Get previous values for comparison
    let prevSma10 = 0;
    let prevSma20 = 0;
    
    for (let i = 1; i <= 10; i++) {
      prevSma10 += marketData[i].close;
    }
    prevSma10 /= 10;
    
    for (let i = 1; i <= 20; i++) {
      prevSma20 += marketData[i].close;
    }
    prevSma20 /= 20;
    
    // Check for crossover
    if (prevSma10 < prevSma20 && sma10 > sma20) {
      return {
        type: 'BULLISH_CROSSOVER',
        strength: 0.8,
        confidence: 0.75
      };
    } else if (prevSma10 > prevSma20 && sma10 < sma20) {
      return {
        type: 'BEARISH_CROSSOVER',
        strength: 0.8,
        confidence: 0.75
      };
    }
    
    return null;
  }

  getPeriodMillis(period) {
    const periods = {
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1m': 30 * 24 * 60 * 60 * 1000
    };
    
    return periods[period] || periods['1d'];
  }
}

module.exports = SignalExtractionService;