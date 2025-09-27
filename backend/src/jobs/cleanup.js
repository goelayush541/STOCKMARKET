const cron = require('node-cron');
const MarketData = require('../models/MarketData');
const NewsData = require('../models/NewsData');
const Signal = require('../models/Signals');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class CleanupJob {
  constructor() {
    this.retentionPeriods = {
      marketData: 365 * 24 * 60 * 60 * 1000, // 1 year
      newsData: 90 * 24 * 60 * 60 * 1000, // 90 days
      signals: 30 * 24 * 60 * 60 * 1000, // 30 days
      auditLogs: 180 * 24 * 60 * 60 * 1000 // 180 days
    };
  }

  start() {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting cleanup job');
        await this.cleanupOldData();
        logger.info('Cleanup job completed');
      } catch (error) {
        logger.error('Cleanup job failed:', error);
      }
    });

    logger.info('Cleanup job started');
  }

  async cleanupOldData() {
    const now = new Date();
    
    try {
      // Cleanup old market data
      const marketDataThreshold = new Date(now - this.retentionPeriods.marketData);
      const marketDataResult = await MarketData.deleteMany({
        timestamp: { $lt: marketDataThreshold }
      });
      logger.info(`Cleaned up ${marketDataResult.deletedCount} market data records`);

      // Cleanup old news data
      const newsDataThreshold = new Date(now - this.retentionPeriods.newsData);
      const newsDataResult = await NewsData.deleteMany({
        publishedAt: { $lt: newsDataThreshold }
      });
      logger.info(`Cleaned up ${newsDataResult.deletedCount} news data records`);

      // Cleanup old signals
      const signalsThreshold = new Date(now - this.retentionPeriods.signals);
      const signalsResult = await Signal.deleteMany({
        generatedAt: { $lt: signalsThreshold }
      });
      logger.info(`Cleaned up ${signalsResult.deletedCount} signal records`);

      // Cleanup old audit logs
      const auditLogsThreshold = new Date(now - this.retentionPeriods.auditLogs);
      const auditLogsResult = await AuditLog.deleteMany({
        timestamp: { $lt: auditLogsThreshold }
      });
      logger.info(`Cleaned up ${auditLogsResult.deletedCount} audit log records`);

    } catch (error) {
      logger.error('Data cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = CleanupJob;