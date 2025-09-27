const MarketData = require('../models/MarketData');
const Signal = require('../models/Signals');
const BacktestResult = require('../models/BacktestResult');
const logger = require('../utils/logger');

class BacktestingService {
  constructor() {
    this.transactionCost = 0.001; // 0.1% transaction cost
  }

  async runBacktest(strategyConfig, userId) {
    try {
      const {
        strategyName,
        symbols,
        startDate,
        endDate,
        initialCapital,
        strategyType,
        parameters
      } = strategyConfig;

      // Fetch historical data
      const historicalData = await this.fetchHistoricalData(symbols, startDate, endDate);
      
      // Initialize portfolio
      let portfolio = {
        cash: initialCapital,
        positions: {},
        value: initialCapital,
        history: []
      };

      // Execute strategy
      for (const [timestamp, data] of Object.entries(historicalData)) {
        const signals = await this.generateSignals(data, strategyType, parameters);
        
        // Execute trades based on signals
        portfolio = this.executeTrades(portfolio, signals, data);
        
        // Record portfolio value
        portfolio.value = this.calculatePortfolioValue(portfolio, data);
        portfolio.history.push({
          timestamp: new Date(timestamp),
          value: portfolio.value,
          cash: portfolio.cash,
          positions: { ...portfolio.positions }
        });
      }

      // Calculate performance metrics
      const performance = this.calculatePerformance(portfolio, initialCapital);

      // Save backtest results
      const backtestResult = new BacktestResult({
        userId,
        strategyName,
        strategyConfig,
        performance,
        trades: this.generateTradeHistory(portfolio),
        executedAt: new Date()
      });

      await backtestResult.save();

      return backtestResult;
    } catch (error) {
      logger.error('Error running backtest:', error);
      throw error;
    }
  }

  async fetchHistoricalData(symbols, startDate, endDate) {
    const historicalData = {};
    
    for (const symbol of symbols) {
      const data = await MarketData.find({
        symbol,
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).sort({ timestamp: 1 });
      
      // Group by timestamp
      data.forEach(item => {
        const timestamp = item.timestamp.getTime();
        if (!historicalData[timestamp]) {
          historicalData[timestamp] = {};
        }
        historicalData[timestamp][symbol] = item;
      });
    }
    
    return historicalData;
  }

  async generateSignals(marketData, strategyType, parameters) {
    const signals = [];
    
    // Simplified signal generation - in real implementation, this would be more complex
    for (const symbol in marketData) {
      const data = marketData[symbol];
      
      if (strategyType === 'movingAverageCrossover') {
        const signal = this.maCrossoverStrategy(data, parameters);
        if (signal) signals.push(signal);
      } else if (strategyType === 'rsiMeanReversion') {
        const signal = this.rsiMeanReversionStrategy(data, parameters);
        if (signal) signals.push(signal);
      }
      // Add other strategy types here
    }
    
    return signals;
  }

  maCrossoverStrategy(data, parameters) {
    const { shortPeriod = 10, longPeriod = 20 } = parameters;
    
    // Simplified implementation - would need actual historical data for proper calculation
    if (Math.random() > 0.7) {
      return {
        symbol: data.symbol,
        signalType: Math.random() > 0.5 ? 'BUY' : 'SELL',
        strength: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        confidence: Math.random() * 0.3 + 0.7 // 0.7 to 1.0
      };
    }
    
    return null;
  }

  rsiMeanReversionStrategy(data, parameters) {
    const { oversold = 30, overbought = 70 } = parameters;
    
    // Simplified implementation
    if (Math.random() > 0.7) {
      return {
        symbol: data.symbol,
        signalType: Math.random() > 0.5 ? 'BUY' : 'SELL',
        strength: Math.random() * 0.5 + 0.5,
        confidence: Math.random() * 0.3 + 0.7
      };
    }
    
    return null;
  }

  executeTrades(portfolio, signals, marketData) {
    const newPortfolio = { ...portfolio };
    
    for (const signal of signals) {
      const { symbol, signalType, strength } = signal;
      const currentPrice = marketData[symbol]?.close;
      
      if (!currentPrice) continue;
      
      if (signalType === 'BUY' && newPortfolio.cash > 0) {
        // Determine position size based on signal strength
        const amountToInvest = newPortfolio.cash * strength * 0.1;
        const quantity = amountToInvest / currentPrice;
        
        newPortfolio.cash -= amountToInvest * (1 + this.transactionCost);
        
        if (!newPortfolio.positions[symbol]) {
          newPortfolio.positions[symbol] = {
            quantity: 0,
            entryPrice: 0
          };
        }
        
        newPortfolio.positions[symbol].quantity += quantity;
        // Update average entry price
        newPortfolio.positions[symbol].entryPrice = 
          (newPortfolio.positions[symbol].entryPrice * (newPortfolio.positions[symbol].quantity - quantity) + 
           currentPrice * quantity) / newPortfolio.positions[symbol].quantity;
           
      } else if (signalType === 'SELL' && newPortfolio.positions[symbol]) {
        const position = newPortfolio.positions[symbol];
        const saleValue = position.quantity * currentPrice * (1 - this.transactionCost);
        
        newPortfolio.cash += saleValue;
        delete newPortfolio.positions[symbol];
      }
    }
    
    return newPortfolio;
  }

  calculatePortfolioValue(portfolio, marketData) {
    let totalValue = portfolio.cash;
    
    for (const symbol in portfolio.positions) {
      const position = portfolio.positions[symbol];
      const currentPrice = marketData[symbol]?.close || position.entryPrice;
      totalValue += position.quantity * currentPrice;
    }
    
    return totalValue;
  }

  calculatePerformance(portfolio, initialCapital) {
    const finalValue = portfolio.value;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // Calculate additional metrics (simplified)
    return {
      totalReturn: totalReturn * 100,
      annualizedReturn: totalReturn * 252 * 100, // Assuming 252 trading days
      sharpeRatio: totalReturn > 0 ? totalReturn / 0.1 : 0, // Simplified Sharpe
      maxDrawdown: this.calculateMaxDrawdown(portfolio.history),
      volatility: 15.5, // Placeholder
      winRate: 65.2, // Placeholder
      profitFactor: 1.8, // Placeholder
      finalValue,
      initialCapital
    };
  }

  calculateMaxDrawdown(history) {
    let maxDrawdown = 0;
    let peak = history[0]?.value || 0;
    
    for (const point of history) {
      if (point.value > peak) {
        peak = point.value;
      }
      
      const drawdown = (peak - point.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  generateTradeHistory(portfolio) {
    // Simplified trade history generation
    return [
      {
        timestamp: new Date(),
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 10,
        price: 150.25,
        value: 1502.50
      }
    ];
  }
}

module.exports = BacktestingService;