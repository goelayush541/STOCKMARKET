const express = require('express');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Run backtest
router.post('/', auth, async (req, res) => {
  try {
    const { strategyName, symbols, startDate, endDate, initialCapital, strategyType, parameters } = req.body;
    
    // Validate required fields
    if (!strategyName || !symbols || !startDate || !endDate || !initialCapital || !strategyType) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'strategyName, symbols, startDate, endDate, initialCapital, and strategyType are required'
      });
    }
    
    // Generate mock backtest results
    const backtestResult = generateMockBacktestResult(
      strategyName, symbols, startDate, endDate, initialCapital, strategyType, parameters
    );
    
    res.json(backtestResult);
  } catch (error) {
    console.error('Error running backtest:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not run backtest'
    });
  }
});

// Get backtest results by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Generate mock backtest result
    const backtestResult = generateMockBacktestResultById(id);
    
    res.json(backtestResult);
  } catch (error) {
    console.error('Error fetching backtest result:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Could not retrieve backtest result'
    });
  }
});

// Helper function to generate mock backtest results
function generateMockBacktestResult(strategyName, symbols, startDate, endDate, initialCapital, strategyType, parameters) {
  const totalReturn = (Math.random() * 50) - 10; // -10% to +40%
  const finalValue = initialCapital * (1 + totalReturn / 100);
  
  return {
    id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    strategyName,
    strategyConfig: {
      symbols,
      startDate,
      endDate,
      initialCapital,
      strategyType,
      parameters: parameters || {}
    },
    performance: {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualizedReturn: parseFloat((totalReturn * 1.5).toFixed(2)),
      sharpeRatio: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      maxDrawdown: parseFloat((Math.random() * 15 + 5).toFixed(2)),
      volatility: parseFloat((Math.random() * 10 + 5).toFixed(2)),
      winRate: parseFloat((Math.random() * 30 + 50).toFixed(2)),
      profitFactor: parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)),
      finalValue: parseFloat(finalValue.toFixed(2)),
      initialCapital: parseFloat(initialCapital.toFixed(2))
    },
    trades: generateMockTrades(symbols),
    equityCurve: generateMockEquityCurve(initialCapital, totalReturn),
    executedAt: new Date().toISOString(),
    executionTime: Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
  };
}

function generateMockBacktestResultById(id) {
  const strategies = ['Moving Average Crossover', 'RSI Mean Reversion', 'MACD Strategy', 'Bollinger Bands'];
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  
  return {
    id,
    strategyName: strategies[Math.floor(Math.random() * strategies.length)],
    strategyConfig: {
      symbols: [symbols[Math.floor(Math.random() * symbols.length)]],
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      initialCapital: 100000,
      strategyType: 'movingAverageCrossover',
      parameters: { shortPeriod: 10, longPeriod: 20 }
    },
    performance: {
      totalReturn: parseFloat((Math.random() * 50 - 10).toFixed(2)),
      annualizedReturn: parseFloat((Math.random() * 75 - 15).toFixed(2)),
      sharpeRatio: parseFloat((Math.random() * 2 + 0.5).toFixed(2)),
      maxDrawdown: parseFloat((Math.random() * 15 + 5).toFixed(2)),
      volatility: parseFloat((Math.random() * 10 + 5).toFixed(2)),
      winRate: parseFloat((Math.random() * 30 + 50).toFixed(2)),
      profitFactor: parseFloat((Math.random() * 1.5 + 0.5).toFixed(2)),
      finalValue: 115000,
      initialCapital: 100000
    },
    trades: generateMockTrades(['AAPL']),
    equityCurve: generateMockEquityCurve(100000, 15),
    executedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    executionTime: 2345
  };
}

function generateMockTrades(symbols) {
  const trades = [];
  const tradeCount = Math.floor(Math.random() * 20) + 10; // 10-30 trades
  
  for (let i = 0; i < tradeCount; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const price = 100 + Math.random() * 500;
    const quantity = Math.floor(Math.random() * 100) + 10;
    const value = price * quantity;
    
    trades.push({
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      symbol,
      action,
      quantity,
      price: parseFloat(price.toFixed(2)),
      value: parseFloat(value.toFixed(2)),
      result: Math.random() > 0.4 ? 'WIN' : 'LOSS'
    });
  }
  
  return trades;
}

function generateMockEquityCurve(initialCapital, totalReturn) {
  const points = [];
  const pointCount = 100;
  const finalValue = initialCapital * (1 + totalReturn / 100);
  
  for (let i = 0; i < pointCount; i++) {
    const progress = i / (pointCount - 1);
    const volatility = Math.sin(progress * Math.PI) * 0.1;
    const value = initialCapital + (finalValue - initialCapital) * progress + volatility * initialCapital;
    
    points.push({
      timestamp: new Date(Date.now() - (pointCount - i) * 86400000).toISOString(),
      value: parseFloat(value.toFixed(2))
    });
  }
  
  return points;
}

module.exports = router;