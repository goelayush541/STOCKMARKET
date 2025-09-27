const Signal = require('../models/Signals');
const Portfolio = require('../models/Portfolio');
const logger = require('../utils/logger');

class RiskManagementService {
  constructor() {
    this.maxPositionSize = 0.1; // Max 10% of portfolio in a single position
    this.maxDailyLoss = 0.05; // Max 5% daily loss
    this.stopLossPercentage = 0.03; // 3% stop loss
    this.takeProfitPercentage = 0.06; // 6% take profit
  }

  async validateSignal(signal, userId) {
    try {
      // Check if signal is expired
      if (signal.expiration && new Date() > signal.expiration) {
        return { valid: false, reason: 'Signal expired' };
      }

      // Check if we already have a similar recent signal
      const recentSimilarSignals = await Signal.find({
        symbol: signal.symbol,
        signalType: signal.signalType,
        generatedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      });

      if (recentSimilarSignals.length > 0) {
        return { valid: false, reason: 'Similar signal recently generated' };
      }

      // Check portfolio constraints if user ID is provided
      if (userId) {
        const portfolio = await Portfolio.findOne({ user: userId });
        if (portfolio) {
          const position = portfolio.positions.find(p => p.symbol === signal.symbol);
          
          // Check if we already have a position in this symbol
          if (position && position.signalType !== signal.signalType) {
            return { 
              valid: false, 
              reason: 'Conflicting position already exists' 
            };
          }

          // Check position size limits
          if (this.wouldExceedPositionSize(signal, portfolio)) {
            return { 
              valid: false, 
              reason: 'Would exceed maximum position size' 
            };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating signal:', error);
      return { valid: false, reason: 'Validation error' };
    }
  }

  wouldExceedPositionSize(signal, portfolio) {
    // This is a simplified calculation - in reality, you'd need current market prices
    const proposedInvestment = portfolio.balance * this.maxPositionSize;
    const currentPosition = portfolio.positions.find(p => p.symbol === signal.symbol);
    
    if (currentPosition) {
      return currentPosition.investment + proposedInvestment > 
             portfolio.balance * this.maxPositionSize * 2; // Allow doubling down in some cases
    }
    
    return false;
  }

  calculatePositionSize(portfolio, signal, currentPrice) {
    const riskAmount = portfolio.balance * this.maxDailyLoss;
    const priceDifference = signal.signalType === 'BUY' 
      ? currentPrice * this.stopLossPercentage 
      : currentPrice * this.stopLossPercentage;
    
    const positionSize = riskAmount / priceDifference;
    const maxPositionSize = portfolio.balance * this.maxPositionSize / currentPrice;
    
    return Math.min(positionSize, maxPositionSize);
  }

  async calculatePortfolioRisk(portfolio, marketPrices) {
    let totalRisk = 0;
    let diversificationScore = 0;
    
    for (const position of portfolio.positions) {
      const currentPrice = marketPrices[position.symbol] || position.entryPrice;
      const unrealizedPnl = (currentPrice - position.entryPrice) * position.quantity;
      const positionValue = currentPrice * position.quantity;
      
      // Calculate risk contribution
      const riskContribution = positionValue / portfolio.balance;
      totalRisk += riskContribution;
      
      // Update diversification score
      diversificationScore += Math.pow(riskContribution, 2);
    }
    
    diversificationScore = 1 - Math.sqrt(diversificationScore); // Herfindahl index
    
    return {
      totalRisk,
      diversificationScore,
      maxDrawdown: await this.calculateMaxDrawdown(portfolio),
      valueAtRisk: await this.calculateValueAtRisk(portfolio, marketPrices)
    };
  }

  async calculateMaxDrawdown(portfolio) {
    // Implementation would require historical portfolio values
    // Simplified for this example
    return 0.12; // 12% max drawdown
  }

  async calculateValueAtRisk(portfolio, marketPrices, confidenceLevel = 0.95, timeHorizon = 1) {
    // Simplified VaR calculation using historical simulation
    // In a real implementation, you'd use historical returns data
    let varAmount = 0;
    
    for (const position of portfolio.positions) {
      const positionValue = marketPrices[position.symbol] * position.quantity;
      // Assume 2% daily volatility for simplicity
      const volatility = 0.02 * Math.sqrt(timeHorizon);
      const zScore = this.getZScore(confidenceLevel);
      const positionVar = positionValue * zScore * volatility;
      varAmount += positionVar;
    }
    
    return varAmount;
  }

  getZScore(confidenceLevel) {
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };
    
    return zScores[confidenceLevel] || 1.645;
  }
}

module.exports = RiskManagementService;