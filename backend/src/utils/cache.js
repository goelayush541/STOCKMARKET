const redis = require('../config/redis');
const logger = require('./logger');

class Cache {
  constructor(defaultTTL = 3600) {
    this.defaultTTL = defaultTTL;
  }

  async get(key) {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, ttl);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    try {
      const cached = await this.get(key);
      
      if (cached !== null) {
        return cached;
      }
      
      const freshData = await fetchFunction();
      
      if (freshData !== null && freshData !== undefined) {
        await this.set(key, freshData, ttl);
      }
      
      return freshData;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      return await fetchFunction();
    }
  }

  async clearPattern(pattern) {
    try {
      // Note: This requires Redis SCAN command support
      // In a real implementation, you'd use SCAN to find keys matching pattern
      logger.warn('Pattern-based cache clearing not fully implemented');
      return true;
    } catch (error) {
      logger.error(`Cache clearPattern error for pattern ${pattern}:`, error);
      return false;
    }
  }
}

module.exports = new Cache();