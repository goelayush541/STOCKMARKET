module.exports = {
  SIGNAL_TYPES: {
    BUY: 'BUY',
    SELL: 'SELL',
    NEUTRAL: 'NEUTRAL'
  },
  
  SENTIMENT_LABELS: {
    POSITIVE: 'positive',
    NEGATIVE: 'negative',
    NEUTRAL: 'neutral'
  },
  
  RISK_TOLERANCE: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  },
  
  ALERT_TYPES: {
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms'
  },
  
  MARKET_DATA_SOURCES: {
    ALPHA_VANTAGE: 'Alpha Vantage',
    NEWS_API: 'News API',
    MANUAL: 'Manual Entry'
  },
  
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT: 'RATE_LIMIT',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  },
  
  CACHE_KEYS: {
    MARKET_DATA: (symbol) => `market:${symbol}`,
    NEWS_DATA: (query) => `news:${query}`,
    SIGNALS: (symbol) => `signals:${symbol}`,
    USER: (userId) => `user:${userId}`
  },
  
  DEFAULT_SYMBOLS: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'],
  
  API_RATE_LIMITS: {
    MARKET_DATA: 5, // requests per minute
    NEWS: 1, // requests per minute
    SIGNALS: 10 // requests per minute
  }
};