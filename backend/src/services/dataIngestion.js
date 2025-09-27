const axios = require('axios');
const MarketData = require('../models/MarketData');
const NewsData = require('../models/NewsData');
const logger = require('../utils/logger');

class DataIngestionService {
  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    this.newsApiKey = process.env.NEWS_API_KEY || 'demo';
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  async fetchMarketData(symbol) {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        logger.info(`Fetching market data for ${symbol} (attempt ${retries + 1})`);
        
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${this.alphaVantageKey}`;
        
        const response = await axios.get(url, {
          timeout: 10000, // 10 second timeout
          headers: {
            'User-Agent': 'FinancialSignalsApp/1.0'
          }
        });

        // Check if we got a valid response
        if (!response.data) {
          throw new Error('Empty response from Alpha Vantage');
        }

        // Check for API error messages
        if (response.data['Error Message']) {
          throw new Error(`Alpha Vantage error: ${response.data['Error Message']}`);
        }

        if (response.data['Note']) {
          logger.warn(`Alpha Vantage rate limit note: ${response.data['Note']}`);
          // Wait before retrying due to rate limit
          await this.sleep(this.retryDelay);
          retries++;
          continue;
        }

        // Get the time series data - handle different possible response structures
        const timeSeriesKey = Object.keys(response.data).find(key => 
          key.includes('Time Series') || key.includes('time series')
        );

        if (!timeSeriesKey) {
          logger.warn(`No time series data found in response for ${symbol}`);
          return { success: false, error: 'No time series data found', count: 0 };
        }

        const timeSeries = response.data[timeSeriesKey];

        if (!timeSeries || typeof timeSeries !== 'object') {
          logger.warn(`Invalid time series data for ${symbol}`);
          return { success: false, error: 'Invalid time series data', count: 0 };
        }

        const marketDataEntries = [];
        
        for (const [timestamp, data] of Object.entries(timeSeries)) {
          try {
            marketDataEntries.push({
              symbol: symbol.toUpperCase(),
              timestamp: new Date(timestamp),
              open: parseFloat(data['1. open']) || 0,
              high: parseFloat(data['2. high']) || 0,
              low: parseFloat(data['3. low']) || 0,
              close: parseFloat(data['4. close']) || 0,
              volume: parseInt(data['5. volume']) || 0
            });
          } catch (parseError) {
            logger.warn(`Error parsing data for ${symbol} at ${timestamp}:`, parseError);
          }
        }

        if (marketDataEntries.length === 0) {
          logger.warn(`No valid market data entries for ${symbol}`);
          return { success: false, error: 'No valid data entries', count: 0 };
        }

        // Save to database
        await MarketData.insertMany(marketDataEntries, { ordered: false });
        
        logger.info(`Successfully saved ${marketDataEntries.length} market data entries for ${symbol}`);
        return { success: true, count: marketDataEntries.length };

      } catch (error) {
        retries++;
        
        if (retries >= this.maxRetries) {
          logger.error(`Failed to fetch market data for ${symbol} after ${this.maxRetries} attempts:`, error.message);
          return { 
            success: false, 
            error: error.message,
            count: 0 
          };
        }

        logger.warn(`Retry ${retries}/${this.maxRetries} for ${symbol} after error:`, error.message);
        await this.sleep(this.retryDelay * retries); // Exponential backoff
      }
    }
  }

  async fetchNewsData(query = 'stock market') {
    try {
      logger.info(`Fetching news data for query: ${query}`);
      
      // For now, use mock data since we might not have News API access
      // In production, you would use the actual News API
      const mockNews = this.generateMockNewsData(query);
      
      await NewsData.insertMany(mockNews);
      
      logger.info(`Successfully saved ${mockNews.length} news articles`);
      return { success: true, count: mockNews.length };

    } catch (error) {
      logger.error('Error fetching news data:', error);
      
      // Fallback to mock data
      try {
        const mockNews = this.generateMockNewsData(query);
        await NewsData.insertMany(mockNews);
        
        logger.info(`Used fallback mock news data: ${mockNews.length} articles`);
        return { success: true, count: mockNews.length };
      } catch (fallbackError) {
        logger.error('Fallback news data also failed:', fallbackError);
        return { success: false, error: fallbackError.message, count: 0 };
      }
    }
  }

  generateMockNewsData(query) {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
    const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal', 'Financial Times'];
    const sentiments = ['positive', 'negative', 'neutral'];
    
    const newsEntries = [];
    const articleCount = 5 + Math.floor(Math.random() * 10); // 5-15 articles

    for (let i = 0; i < articleCount; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      const sentimentScore = Math.random() * 2 - 1; // -1 to 1
      const sentimentLabel = sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral';

      newsEntries.push({
        title: `${symbol} ${this.getRandomHeadline(sentimentLabel)}`,
        content: `This is a sample news article about ${symbol}. The market has been ${sentimentLabel} recently. ${query} trends show interesting developments.`,
        source: source,
        publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24 hours
        url: `https://example.com/news/${Date.now()}-${i}`,
        authors: ['Financial News Team'],
        symbols: [symbol],
        sentimentScore: sentimentScore,
        sentimentLabel: sentimentLabel,
        keyPhrases: [symbol, query, 'market', 'trends']
      });
    }

    return newsEntries;
  }

  getRandomHeadline(sentiment) {
    const positiveHeadlines = [
      'soars after strong earnings report',
      'hits all-time high on positive outlook',
      'gains momentum with new product launch',
      'outperforms market expectations',
      'receives bullish analyst upgrade'
    ];

    const negativeHeadlines = [
      'declines on weak guidance',
      'faces regulatory challenges',
      'misses revenue estimates',
      'cut to sell rating by analysts',
      'volatility concerns weigh on stock'
    ];

    const neutralHeadlines = [
      'reports quarterly results',
      'announces strategic initiatives',
      'holds annual shareholder meeting',
      'issues market update',
      'maintains current guidance'
    ];

    const headlines = sentiment === 'positive' ? positiveHeadlines :
                     sentiment === 'negative' ? negativeHeadlines : neutralHeadlines;

    return headlines[Math.floor(Math.random() * headlines.length)];
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to get available symbols
  getAvailableSymbols() {
    return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'JNJ', 'V'];
  }

  // Method to validate API keys
  validateApiKeys() {
    const issues = [];
    
    if (!process.env.ALPHA_VANTAGE_API_KEY || process.env.ALPHA_VANTAGE_API_KEY === 'demo') {
      issues.push('ALPHA_VANTAGE_API_KEY not set or using demo key (rate limited)');
    }
    
    if (!process.env.NEWS_API_KEY || process.env.NEWS_API_KEY === 'demo') {
      issues.push('NEWS_API_KEY not set, using mock data');
    }
    
    return issues;
  }
}

module.exports = DataIngestionService;