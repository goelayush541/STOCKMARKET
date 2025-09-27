const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');
const constants = require('../utils/constants');
const logger = require('../utils/logger');

// Redis store for rate limiting
const redisStore = {
  incr: async (key, cb) => {
    try {
      const exists = await redis.exists(key);
      
      if (!exists) {
        await redis.set(key, 1, 60); // 1 minute TTL
        cb(null, 1, 60);
      } else {
        const count = await redis.get(key);
        const newCount = parseInt(count) + 1;
        await redis.set(key, newCount, 60);
        cb(null, newCount, 60);
      }
    } catch (err) {
      cb(err);
    }
  }
};

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
    code: constants.ERROR_CODES.RATE_LIMIT
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).json(options.message);
  },
  store: redisStore
});

// Auth rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    code: constants.ERROR_CODES.RATE_LIMIT
  },
  skip: (req) => req.method !== 'POST' || !req.path.includes('/auth/login'),
  store: redisStore
});

// API-specific rate limiters
const marketDataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: constants.API_RATE_LIMITS.MARKET_DATA,
  message: {
    error: 'Market data rate limit exceeded',
    message: 'Please wait before requesting more market data',
    code: constants.ERROR_CODES.RATE_LIMIT
  },
  skip: (req) => !req.path.includes('/market-data'),
  store: redisStore
});

const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: constants.API_RATE_LIMITS.NEWS,
  message: {
    error: 'News data rate limit exceeded',
    message: 'Please wait before requesting more news data',
    code: constants.ERROR_CODES.RATE_LIMIT
  },
  skip: (req) => !req.path.includes('/news'),
  store: redisStore
});

module.exports = {
  generalLimiter,
  authLimiter,
  marketDataLimiter,
  newsLimiter
};