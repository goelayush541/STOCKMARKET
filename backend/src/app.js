// Memory leak protection and performance optimizations
require('events').EventEmitter.defaultMaxListeners = 20;
process.setMaxListeners(20);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectToMongoDB } = require('./config/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Production CORS configuration
const corsOptions = {
  origin: [
    'https://financial-signals-frontend.vercel.app',
    'https://financial-signals-frontend-git-main-yourusername.vercel.app', 
    'https://financial-signals-frontend-yourusername.vercel.app',
    'http://localhost:3000',
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Security and performance middleware
app.use((req, res, next) => {
  // Set timeout for requests to prevent hanging
  req.setTimeout(30000, () => {
    logger.warn(`Request timeout: ${req.method} ${req.url}`);
  });
  
  res.setTimeout(30000, () => {
    logger.warn(`Response timeout: ${req.method} ${req.url}`);
  });
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  next();
});

// Body parsing middleware with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Import and use routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/backtest', require('./routes/backtest'));
app.use('/api', require('./routes/api'));

// System routes (if exists)
try {
  app.use('/api/system', require('./routes/system'));
} catch (error) {
  logger.info('System routes not found, skipping...');
}

// Health check endpoint with detailed info
app.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const healthInfo = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
  
  res.status(200).json(healthInfo);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Financial Signals Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      user: '/api/user',
      signals: '/api/signals',
      backtest: '/api/backtest',
      marketData: '/api/market-data/:symbol'
    }
  });
});

// Rate limiting middleware (basic implementation)
const requestCounts = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip);
  // Remove requests outside the current window
  const recentRequests = requests.filter(time => time > windowStart);
  requestCounts.set(ip, recentRequests);
  
  // Check if over limit (100 requests per minute)
  if (recentRequests.length >= 100) {
    logger.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
  
  // Add current request
  recentRequests.push(now);
  next();
});

// Clean up old request counts periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - 60000;
  
  for (const [ip, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(time => time > windowStart);
    if (recentRequests.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, recentRequests);
    }
  }
}, 30000); // Clean every 30 seconds

// 404 handler - must be after all routes
app.use('*', (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api/test',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/verify',
      'GET /api/user/profile',
      'GET /api/signals',
      'POST /api/backtest',
      'GET /api/market-data/:symbol',
      'GET /api/news'
    ]
  });
});

// Global error handler - must be last
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.message === 'Invalid JSON') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid JSON in request body'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong. Please try again later.',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Connect to MongoDB
connectToMongoDB();

// Initialize services function
const initializeServices = async () => {
  try {
    const DataIngestionService = require('./services/dataIngestion');
    const dataIngestion = new DataIngestionService();
    
    // Validate API keys
    const apiKeyIssues = dataIngestion.validateApiKeys();
    if (apiKeyIssues.length > 0) {
      apiKeyIssues.forEach(issue => logger.warn(issue));
    }

    // Production data ingestion (more conservative)
    if (process.env.NODE_ENV === 'production') {
      setTimeout(async () => {
        try {
          logger.info('🚀 Starting production data ingestion...');
          
          // Only fetch essential data in production
          await dataIngestion.fetchNewsData('stock market');
          logger.info('✅ News data ingestion completed');
          
          // Fetch market data for top symbols with longer delays
          const symbols = dataIngestion.getAvailableSymbols().slice(0, 3);
          for (const symbol of symbols) {
            try {
              await dataIngestion.fetchMarketData(symbol);
              await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
              logger.info(`✅ Market data fetched for ${symbol}`);
            } catch (error) {
              logger.warn(`⚠️ Failed to fetch data for ${symbol}:`, error.message);
            }
          }
          
          logger.info('🎉 Production data ingestion completed');
        } catch (error) {
          logger.error('❌ Production data ingestion failed:', error.message);
        }
      }, 10000); // Wait 10 seconds in production
    } else {
      // Development data ingestion
      setTimeout(async () => {
        try {
          logger.info('🔧 Starting development data ingestion...');
          await dataIngestion.fetchNewsData('stock market');
          logger.info('✅ Development data ingestion completed');
        } catch (error) {
          logger.error('❌ Development data ingestion failed:', error);
        }
      }, 3000); // Wait 3 seconds in development
    }

  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
  }
};

// Initialize services
initializeServices();

// Error handling for uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  // In production, we might want to exit and let the process manager restart
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  return () => {
    logger.info(`🛑 ${signal} received. Starting graceful shutdown...`);
    
    // Close server first
    server.close((err) => {
      if (err) {
        logger.error('Error closing server:', err);
        process.exit(1);
      }
      
      logger.info('✅ HTTP server closed');
      
      // Close MongoDB connection
      mongoose.connection.close(false, () => {
        logger.info('✅ MongoDB connection closed');
        logger.info('👋 Graceful shutdown completed');
        process.exit(0);
      });
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('🕐 Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };
};

process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('⚠️ Process warning:', warning);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Local: http://localhost:${PORT}`);
  logger.info(`🌐 Network: http://0.0.0.0:${PORT}`);
  logger.info(`❤️ Health check: http://localhost:${PORT}/health`);
  logger.info(`🧪 API test: http://localhost:${PORT}/api/test`);
});

// Server timeout configurations
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000; // 120 seconds

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('❌ Server error:', error);
    process.exit(1);
  }
});

// For Vercel serverless functions
module.exports = app;

// Only listen if not in Vercel environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  // Server is already started above
}