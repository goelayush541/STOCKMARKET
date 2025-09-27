const express = require('express');
const { adminAuth } = require('../middleware/auth');
const User = require('../models/User');
const Signal = require('../models/Signals');
const BacktestResult = require('../models/BacktestResult');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require admin authentication
router.use(adminAuth);

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      userCount,
      activeUsers,
      signalCount,
      backtestCount
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      Signal.countDocuments(),
      BacktestResult.countDocuments()
    ]);

    res.json({
      users: {
        total: userCount,
        active: activeUsers
      },
      signals: signalCount,
      backtests: backtestCount,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve statistics'
    });
  }
});

// Get user list
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = search ? {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Admin users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve users'
    });
  }
});

// Get audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, action, resource } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (resource) query.resource = resource;

    const logs = await AuditLog.find(query)
      .populate('userId', 'email firstName lastName')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    logger.error('Admin audit logs error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve audit logs'
    });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = 'healthy'; // You would add actual database health check
    
    // Check external services
    const services = {
      database: dbStatus,
      redis: 'healthy', // Add actual Redis health check
      snowflake: 'healthy' // Add actual Snowflake health check
    };

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services
    });
  } catch (error) {
    logger.error('Admin health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Manual signal generation
router.post('/generate-signals', async (req, res) => {
  try {
    const { symbols = [] } = req.body;
    
    // This would trigger manual signal generation
    // Implementation would depend on your signal generation service
    
    res.json({
      message: 'Signal generation started',
      symbols
    });
  } catch (error) {
    logger.error('Admin signal generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not generate signals'
    });
  }
});

module.exports = router;