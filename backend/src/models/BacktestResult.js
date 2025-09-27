const mongoose = require('mongoose');

const backtestResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  strategyName: {
    type: String,
    required: true,
    trim: true
  },
  strategyConfig: {
    symbols: [{
      type: String,
      uppercase: true,
      trim: true
    }],
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    initialCapital: {
      type: Number,
      required: true,
      min: 0
    },
    strategyType: {
      type: String,
      required: true,
      enum: ['movingAverageCrossover', 'rsiMeanReversion', 'newsSentiment', 'custom']
    },
    parameters: mongoose.Schema.Types.Mixed
  },
  performance: {
    totalReturn: {
      type: Number,
      required: true
    },
    annualizedReturn: {
      type: Number,
      required: true
    },
    sharpeRatio: {
      type: Number,
      required: true
    },
    maxDrawdown: {
      type: Number,
      required: true
    },
    volatility: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    profitFactor: {
      type: Number,
      default: 0
    },
    finalValue: {
      type: Number,
      required: true
    },
    initialCapital: {
      type: Number,
      required: true
    }
  },
  trades: [{
    timestamp: {
      type: Date,
      required: true
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true
    },
    action: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL']
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    value: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  equityCurve: [{
    timestamp: {
      type: Date,
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  executedAt: {
    type: Date,
    default: Date.now
  },
  executionTime: {
    type: Number, // milliseconds
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
backtestResultSchema.index({ userId: 1, executedAt: -1 });
backtestResultSchema.index({ strategyType: 1 });
backtestResultSchema.index({ 'performance.totalReturn': -1 });

// Virtual for success status
backtestResultSchema.virtual('isSuccessful').get(function() {
  return this.performance.totalReturn > 0;
});

// Virtual for formatted execution time
backtestResultSchema.virtual('executionTimeFormatted').get(function() {
  if (this.executionTime < 1000) return `${this.executionTime}ms`;
  return `${(this.executionTime / 1000).toFixed(2)}s`;
});

// Static method to find user's backtest results
backtestResultSchema.statics.findByUser = function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ executedAt: -1 })
    .limit(limit);
};

// Static method to find best performing strategies
backtestResultSchema.statics.findBestPerformers = function(limit = 10) {
  return this.find()
    .sort({ 'performance.totalReturn': -1 })
    .limit(limit);
};

// Pre-save middleware to validate data
backtestResultSchema.pre('save', function(next) {
  // Ensure symbols are uppercase
  if (this.strategyConfig.symbols) {
    this.strategyConfig.symbols = this.strategyConfig.symbols.map(sym => sym.toUpperCase());
  }
  
  // Validate date range
  if (this.strategyConfig.startDate >= this.strategyConfig.endDate) {
    return next(new Error('Start date must be before end date'));
  }
  
  next();
});

module.exports = mongoose.model('BacktestResult', backtestResultSchema);