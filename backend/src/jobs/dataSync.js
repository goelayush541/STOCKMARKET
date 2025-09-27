const cron = require('node-cron');
const DataIngestionService = require('../services/dataIngestion');
const logger = require('../utils/logger');

class DataSyncJob {
  constructor() {
    this.dataIngestion = new DataIngestionService();
    this.symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  }

  start() {
    // Run every 5 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
    cron.schedule('*/5 9-16 * * 1-5', async () => {
      try {
        logger.info('Starting market data sync job');
        await this.syncMarketData();
        logger.info('Market data sync completed');
      } catch (error) {
        logger.error('Market data sync job failed:', error);
      }
    });

    // Run every hour for news data
    cron.schedule('0 * * * *', async () => {
      try {
        logger.info('Starting news data sync job');
        await this.syncNewsData();
        logger.info('News data sync completed');
      } catch (error) {
        logger.error('News data sync job failed:', error);
      }
    });

    logger.info('Data sync jobs started');
  }

  async syncMarketData() {
    for (const symbol of this.symbols) {
      try {
        await this.dataIngestion.fetchMarketData(symbol);
        logger.info(`Market data synced for ${symbol}`);
      } catch (error) {
        logger.error(`Failed to sync market data for ${symbol}:`, error);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async syncNewsData() {
    try {
      await this.dataIngestion.fetchNewsData('stock market');
      
      // Also fetch news for specific symbols
      for (const symbol of this.symbols) {
        await this.dataIngestion.fetchNewsData(symbol);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      logger.error('Failed to sync news data:', error);
    }
  }
}

module.exports = DataSyncJob;