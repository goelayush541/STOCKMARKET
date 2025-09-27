const express = require('express');
const { auth } = require('../middleware/auth');
const DataIngestionService = require('../services/dataIngestion');
const logger = require('../utils/logger');

const router = express.Router();

// Manual data ingestion endpoint
router.post('/ingest/market', auth, async (req, res) => {
  try {
    const { symbol } = req.body;
    const dataIngestion = new DataIngestionService();
    
    const result = await dataIngestion.fetchMarketData(symbol);
    
    res.json({
      message: 'Market data ingested successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error ingesting market data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not ingest market data'
    });
  }
});

router.post('/ingest/news', auth, async (req, res) => {
  try {
    const { query } = req.body;
    const dataIngestion = new DataIngestionService();
    
    const result = await dataIngestion.fetchNewsData(query);
    
    res.json({
      message: 'News data ingested successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error ingesting news data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not ingest news data'
    });
  }
});

// Get data statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const MarketData = require('../models/MarketData');
    const NewsData = require('../models/NewsData');
    const Signal = require('../models/Signals');
    
    const [marketDataCount, newsCount, signalCount] = await Promise.all([
      MarketData.countDocuments(),
      NewsData.countDocuments(),
      Signal.countDocuments()
    ]);
    
    const latestMarketData = await MarketData.findOne()
      .sort({ timestamp: -1 });
    
    const latestNews = await NewsData.findOne()
      .sort({ publishedAt: -1 });
    
    res.json({
      marketData: {
        total: marketDataCount,
        latest: latestMarketData ? latestMarketData.timestamp : null
      },
      news: {
        total: newsCount,
        latest: latestNews ? latestNews.publishedAt : null
      },
      signals: {
        total: signalCount
      }
    });
  } catch (error) {
    logger.error('Error fetching data statistics:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve data statistics'
    });
  }
});

module.exports = router;