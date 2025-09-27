const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.connect();
  }

  connect() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
    });

    process.on('SIGINT', () => {
      this.client.quit();
    });
  }

  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }

  async set(key, value, expireSeconds = 3600) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', expireSeconds, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }

  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    });
  }

  async exists(key) {
    return new Promise((resolve, reject) => {
      this.client.exists(key, (err, reply) => {
        if (err) reject(err);
        else resolve(reply === 1);
      });
    });
  }
}

module.exports = new RedisClient();