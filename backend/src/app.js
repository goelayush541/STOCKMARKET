// Add these at the top for memory leak protection
require('events').EventEmitter.defaultMaxListeners = 20;
process.setMaxListeners(20);

require('dotenv').config();
const express = require('express');
const { connectToMongoDB } = require('./config/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Add this middleware to prevent memory leaks
app.use((req, res, next) => {
  // Set timeout for requests
  req.setTimeout(10000); // 10 second timeout
  res.setTimeout(10000);
  next();
});

// Enhanced CORS configuration
app.use(require('cors')({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/system', require('./routes/system'));
// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api/backtest', require('./routes/backtest'));
app.use('/api/user', require('./routes/user'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint is working!', timestamp: new Date().toISOString() });
});

// Basic error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Connect to MongoDB
connectToMongoDB();

// Initialize services with better error handling
const initializeServices = async () => {
  try {
    const DataIngestionService = require('./services/dataIngestion');
    const dataIngestion = new DataIngestionService();
    
    // Validate API keys
    const apiKeyIssues = dataIngestion.validateApiKeys();
    if (apiKeyIssues.length > 0) {
      apiKeyIssues.forEach(issue => logger.warn(issue));
    }

    // Simple data ingestion without blocking startup
    setTimeout(async () => {
      try {
        logger.info('Starting background data ingestion...');
        
        // Use mock data for initial setup
        await dataIngestion.fetchNewsData('stock market');
        
        // Try to get real market data, but fallback gracefully
        const symbols = dataIngestion.getAvailableSymbols().slice(0, 2); // Reduced to 2 symbols
        for (const symbol of symbols) {
          try {
            await dataIngestion.fetchMarketData(symbol);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay to 2 seconds
          } catch (error) {
            logger.warn(`Failed to fetch data for ${symbol}:`, error.message);
          }
        }
        
        logger.info('Background data ingestion completed');
      } catch (error) {
        logger.error('Background data ingestion failed:', error);
      }
    }, 3000); // Reduced to 3 seconds wait after startup

  } catch (error) {
    logger.error('Failed to initialize services:', error);
  }
};

// Initialize services
initializeServices();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Add server timeout handling
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Local: http://localhost:${PORT}`);
  logger.info(`Network: http://0.0.0.0:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API test: http://localhost:${PORT}/api/test`);
});

// Handle server timeouts
server.keepAliveTimeout = 120000; // 120 seconds
server.headersTimeout = 120000; // 120 seconds

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    logger.error('Server error:', error);
  }
});

// Handle process warnings
process.on('warning', (warning) => {
  logger.warn('Process warning:', warning);
});

module.exports = app;