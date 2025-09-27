const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  entryPrice: {
    type: Number,
    required: true,
    min: 0
  },
  entryDate: {
    type: Date,
    default: Date.now
  },
  currentPrice: {
    type: Number,
    min: 0
  },
  signalType: {
    type: String,
    enum: ['BUY', 'SELL', 'NEUTRAL']
  }
});

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 100000,
    min: 0
  },
  initialBalance: {
    type: Number,
    default: 100000
  },
  positions: [positionSchema],
  performance: {
    totalReturn: {
      type: Number,
      default: 0
    },
    dailyReturn: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 0
    }
  },
  riskProfile: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Add calculated methods to the JSON output
      ret.calculateValue = function() {
        return this.currentValue; // Use the virtual property
      };
      ret.calculateReturn = function() {
        return this.totalReturnPercent; // Use the virtual property
      };
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for current portfolio value
portfolioSchema.virtual('currentValue').get(function() {
  let totalValue = this.balance;
  
  for (const position of this.positions) {
    const currentPrice = position.currentPrice || position.entryPrice;
    totalValue += position.quantity * currentPrice;
  }
  
  return totalValue;
});

// Virtual for total return percentage
portfolioSchema.virtual('totalReturnPercent').get(function() {
  return ((this.currentValue - this.initialBalance) / this.initialBalance) * 100;
});

// Virtual for unrealized P&L
portfolioSchema.virtual('unrealizedPnL').get(function() {
  let totalPnL = 0;
  
  for (const position of this.positions) {
    if (position.currentPrice) {
      const pnl = (position.currentPrice - position.entryPrice) * position.quantity;
      totalPnL += pnl;
    }
  }
  
  return totalPnL;
});

// Virtual for position counts
portfolioSchema.virtual('positionCount').get(function() {
  return this.positions.length;
});

// Method to update position prices (not serialized to JSON)
portfolioSchema.methods.updatePrices = async function(marketPrices) {
  for (const position of this.positions) {
    if (marketPrices[position.symbol]) {
      position.currentPrice = marketPrices[position.symbol];
    }
  }
  
  this.lastUpdated = new Date();
  return this.save();
};

// Method to add a new position (not serialized to JSON)
portfolioSchema.methods.addPosition = function(symbol, quantity, entryPrice, signalType = 'BUY') {
  const existingPosition = this.positions.find(p => p.symbol === symbol);
  
  if (existingPosition) {
    const totalCost = existingPosition.quantity * existingPosition.entryPrice + quantity * entryPrice;
    existingPosition.quantity += quantity;
    existingPosition.entryPrice = totalCost / existingPosition.quantity;
  } else {
    this.positions.push({
      symbol,
      quantity,
      entryPrice,
      entryDate: new Date(),
      signalType
    });
  }
  
  this.balance -= quantity * entryPrice;
  return this.save();
};

module.exports = mongoose.model('Portfolio', portfolioSchema);