const NewsData = require('../models/NewsData');
const logger = require('../utils/logger');

class NLPProcessingService {
  constructor() {
    this.connection = null;
  }

  async analyzeSentimentWithCortex() {
    try {
      // Get recent news that hasn't been processed
      const unprocessedNews = await NewsData.find({ 
        sentimentScore: { $exists: false } 
      }).limit(10); // Reduced limit for testing
      
      logger.info(`Found ${unprocessedNews.length} unprocessed news items`);

      for (const news of unprocessedNews) {
        try {
          // Simulate sentiment analysis since we don't have real Snowflake credentials
          const sentimentResult = this.simulateSentimentAnalysis(news.content);
          
          news.sentimentScore = sentimentResult.score;
          news.sentimentLabel = sentimentResult.label;
          news.keyPhrases = this.extractKeyPhrases(news.content);
          
          await news.save();
          logger.info(`Processed news: ${news.title.substring(0, 50)}...`);
          
        } catch (error) {
          logger.error(`Error processing news ${news._id}:`, error);
          // Continue with next news item
        }
      }
      
      return { success: true, processed: unprocessedNews.length };
      
    } catch (error) {
      logger.error('Error in NLP processing:', error);
      return { success: false, error: error.message };
    }
  }

  // Simulate sentiment analysis (replace with actual Snowflake Cortex when credentials are available)
  simulateSentimentAnalysis(content) {
    // Simple sentiment analysis simulation
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'profit', 'growth', 'success'];
    const negativeWords = ['bad', 'poor', 'negative', 'loss', 'decline', 'failure', 'problem'];
    
    const text = content.toLowerCase();
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      positiveCount += (text.match(regex) || []).length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      negativeCount += (text.match(regex) || []).length;
    });
    
    const total = positiveCount + negativeCount;
    let score = 0;
    
    if (total > 0) {
      score = (positiveCount - negativeCount) / total;
    }
    
    let label = 'neutral';
    if (score > 0.3) label = 'positive';
    if (score < -0.3) label = 'negative';
    
    return { score, label };
  }

  extractKeyPhrases(content) {
    // Simple key phrase extraction simulation
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = ['the', 'and', 'is', 'in', 'to', 'of', 'for', 'with', 'on', 'at'];
    const meaningfulWords = words.filter(word => 
      word.length > 4 && !stopWords.includes(word) && !/\d/.test(word)
    );
    
    // Get top 5 most frequent words
    const wordCount = {};
    meaningfulWords.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}

module.exports = NLPProcessingService;