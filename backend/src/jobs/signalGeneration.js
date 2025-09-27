const cron = require('node-cron');
const SignalExtractionService = require('../services/signalExtraction');
const logger = require('../utils/logger');

class SignalGenerationJob {
  constructor() {
    this.signalService = new SignalExtractionService();
    this.symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  }

  start() {
    // Run every 15 minutes during market hours
    cron.schedule('*/15 9-16 * * 1-5', async () => {
      try {
        logger.info('Starting signal generation job');
        await this.generateSignals();
        logger.info('Signal generation completed');
      } catch (error) {
        logger.error('Signal generation job failed:', error);
      }
    });

    logger.info('Signal generation job started');
  }

  async generateSignals() {
    try {
      // Generate signals from news
      await this.signalService.extractSignalsFromNews();
      
      // Generate technical signals for each symbol
      for (const symbol of this.symbols) {
        try {
          await this.signalService.extractTechnicalSignals(symbol);
          logger.info(`Technical signals generated for ${symbol}`);
        } catch (error) {
          logger.error(`Failed to generate technical signals for ${symbol}:`, error);
        }
        
        // Add delay to avoid overloading
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      logger.error('Signal generation failed:', error);
      throw error;
    }
  }
}

module.exports = SignalGenerationJob;