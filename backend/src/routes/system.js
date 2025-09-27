const express = require('express');
const os = require('os');
const router = express.Router();

router.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const freeMemory = os.freemem();
  const totalMemory = os.totalmem();
  const memoryUsagePercent = (memoryUsage.heapUsed / totalMemory * 100).toFixed(2);
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    memory: {
      used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
      usagePercent: `${memoryUsagePercent}%`
    },
    uptime: process.uptime(),
    loadAverage: os.loadavg()
  });
});

router.get('/stats', (req, res) => {
  res.json({
    activeHandles: process._getActiveHandles().length,
    activeRequests: process._getActiveRequests().length,
    memory: process.memoryUsage(),
    cpu: os.cpus()
  });
});

module.exports = router;