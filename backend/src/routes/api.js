const express = require('express');
const { auth } = require('../middleware/auth'); // Add this import
const router = express.Router();
const Portfolio = require('../models/Portfolio');

// Add the missing function
function getRandomHeadline(sentiment) {
  const positiveHeadlines = [
    'soars after strong earnings report',
    'hits all-time high on positive outlook',
    'gains momentum with new product launch'
  ];
  const negativeHeadlines = [
    'declines on weak guidance',
    'faces regulatory challenges',
    'misses revenue estimates'
  ];
  const neutralHeadlines = [
    'reports quarterly results',
    'announces strategic initiatives',
    'holds annual shareholder meeting'
  ];
  
  const headlines = sentiment === 'positive' ? positiveHeadlines :
                   sentiment === 'negative' ? negativeHeadlines : neutralHeadlines;
  
  return headlines[Math.floor(Math.random() * headlines.length)];
}

// Simple test route (public)
router.get('/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});

// All other routes require authentication
router.use(auth); // Add this middleware to protect all routes below

// Get signals with optional filtering
router.get('/signals', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // For now, return mock data since we might not have real signals yet
    const mockSignals = generateMockSignals(parseInt(limit));
    
    res.json({
      signals: mockSignals,
      pagination: {
        total: 100,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + mockSignals.length < 100
      }
    });
  } catch (error) {
    console.error('Error fetching signals:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve signals'
    });
  }
});

// Get market data for a symbol
router.get('/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1d', limit = 20 } = req.query;
    
    // Generate mock market data
    const mockData = generateMockMarketData(symbol, parseInt(limit));
    
    res.json(mockData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve market data'
    });
  }
});

// Get portfolio data
router.get('/portfolio', async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user._id });
    
    if (!portfolio) {
      // Create a new portfolio if none exists
      const newPortfolio = new Portfolio({
        user: req.user._id,
        balance: 100000,
        initialBalance: 100000,
        positions: []
      });
      
      await newPortfolio.save();
      return res.json(newPortfolio);
    }
    
    // Add calculated values to the response
    const portfolioData = portfolio.toJSON();
    portfolioData.totalValue = portfolio.currentValue;
    portfolioData.totalReturn = portfolio.totalReturnPercent;
    portfolioData.unrealizedPnL = portfolio.unrealizedPnL;
    
    res.json(portfolioData);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve portfolio'
    });
  }
});

// Get news data
router.get('/news', async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;
    
    // Generate mock news data
    const mockNews = generateMockNews(parseInt(limit));
    
    res.json({
      news: mockNews,
      pagination: {
        total: 50,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + mockNews.length < 50
      }
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve news'
    });
  }
});

// Helper function to generate mock signals
function generateMockSignals(limit = 10) {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const signalTypes = ['BUY', 'SELL', 'NEUTRAL'];
  const sources = ['technical', 'news', 'market', 'pattern'];
  
  return Array.from({ length: limit }, (_, i) => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
    const strength = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
    const confidence = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
    
    return {
      _id: `signal_${Date.now()}_${i}`,
      symbol,
      signalType,
      strength,
      confidence,
      source: sources[Math.floor(Math.random() * sources.length)],
      generatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
      explanation: `${signalType} signal for ${symbol} based on ${sources[Math.floor(Math.random() * sources.length)]} analysis`,
      expiration: new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000) // Random time in next 24 hours
    };
  });
}

// Helper function to generate mock market data
function generateMockMarketData(symbol, limit = 20) {
  const basePrice = 100 + Math.random() * 1000;
  let currentPrice = basePrice;
  
  return Array.from({ length: limit }, (_, i) => {
    const priceChange = (Math.random() - 0.5) * 10; // -5 to +5
    currentPrice += priceChange;
    const volume = 1000000 + Math.random() * 9000000;
    
    return {
      symbol: symbol.toUpperCase(),
      timestamp: new Date(Date.now() - i * 5 * 60 * 1000), // 5-minute intervals
      open: currentPrice - Math.random() * 2,
      high: currentPrice + Math.random() * 3,
      low: currentPrice - Math.random() * 3,
      close: currentPrice,
      volume: Math.floor(volume),
      source: 'mock'
    };
  });
}

// Helper function to generate mock news
function generateMockNews(limit = 10) {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const sources = ['Bloomberg', 'Reuters', 'CNBC', 'Wall Street Journal'];
  const sentiments = ['positive', 'negative', 'neutral'];
  
  return Array.from({ length: limit }, (_, i) => {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const sentimentScore = Math.random() * 2 - 1; // -1 to 1
    const sentimentLabel = sentimentScore > 0.3 ? 'positive' : sentimentScore < -0.3 ? 'negative' : 'neutral';
    
    return {
      _id: `news_${Date.now()}_${i}`,
      title: `${symbol} ${getRandomHeadline(sentimentLabel)}`,
      content: `This is a sample news article about ${symbol}. The market has been ${sentimentLabel} recently. Company performance and market trends show interesting developments.`,
      source,
      publishedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Random time in last 24 hours
      url: `https://example.com/news/${Date.now()}-${i}`,
      authors: ['Financial News Team'],
      symbols: [symbol],
      sentimentScore,
      sentimentLabel
    };
  });
}

module.exports = router;