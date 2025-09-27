const mongoose = require('mongoose');

const marketDataSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  open: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Open price cannot be negative'
    }
  },
  high: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= this.open && v >= this.low;
      },
      message: 'High price must be >= open and low prices'
    }
  },
  low: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v <= this.open && v <= this.high;
      },
      message: 'Low price must be <= open and high prices'
    }
  },
  close: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= this.low && v <= this.high;
      },
      message: 'Close price must be between low and high prices'
    }
  },
  volume: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= 0;
      },
      message: 'Volume cannot be negative'
    }
  },
  source: {
    type: String,
    default: 'Alpha Vantage',
    enum: ['Alpha Vantage', 'Manual Entry', 'Other API']
  },
  interval: {
    type: String,
    default: '5min',
    enum: ['1min', '5min', '15min', '30min', '60min', 'daily']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index for efficient symbol+timestamp queries
marketDataSchema.index({ symbol: 1, timestamp: -1 });
marketDataSchema.index({ timestamp: 1 });

// Virtual for price change
marketDataSchema.virtual('priceChange').get(function() {
  return this.close - this.open;
});

// Virtual for price change percentage
marketDataSchema.virtual('priceChangePercent').get(function() {
  if (this.open === 0) return 0;
  return ((this.close - this.open) / this.open) * 100;
});

// Virtual for typical price (average of high, low, close)
marketDataSchema.virtual('typicalPrice').get(function() {
  return (this.high + this.low + this.close) / 3;
});

// Virtual for price range
marketDataSchema.virtual('priceRange').get(function() {
  return this.high - this.low;
});

// Virtual for formatted timestamp
marketDataSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Static method to get latest data for a symbol
marketDataSchema.statics.getLatest = function(symbol) {
  return this.findOne({ symbol: symbol.toUpperCase() })
    .sort({ timestamp: -1 });
};

// Static method to get historical data for a symbol
marketDataSchema.statics.getHistory = function(symbol, startDate, endDate, limit = 100) {
  const query = { symbol: symbol.toUpperCase() };
  
  if (startDate && endDate) {
    query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to get data within a time range
marketDataSchema.statics.getByTimeRange = function(symbol, hours = 24) {
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    symbol: symbol.toUpperCase(),
    timestamp: { $gte: startTime }
  }).sort({ timestamp: 1 });
};

// Pre-save validation to ensure data consistency
marketDataSchema.pre('save', function(next) {
  // Ensure symbol is uppercase
  this.symbol = this.symbol.toUpperCase();
  
  // Validate that high is the highest and low is the lowest
  if (this.high < Math.max(this.open, this.close, this.low)) {
    return next(new Error('High price must be the highest value'));
  }
  
  if (this.low > Math.min(this.open, this.close, this.high)) {
    return next(new Error('Low price must be the lowest value'));
  }
  
  // Validate timestamp is not in the future
  if (this.timestamp > new Date()) {
    return next(new Error('Timestamp cannot be in the future'));
  }
  
  next();
});

// Post-save middleware to update related signals (if any)
marketDataSchema.post('save', function(doc, next) {
  // This could be used to update any signals that reference this market data
  console.log(`Market data saved for ${doc.symbol} at ${doc.timestamp}`);
  next();
});

module.exports = mongoose.model('MarketData', marketDataSchema);