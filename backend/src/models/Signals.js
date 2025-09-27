const mongoose = require('mongoose');

const signalSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  signalType: {
    type: String,
    enum: ['BUY', 'SELL', 'NEUTRAL'],
    required: true
  },
  strength: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'Strength must be between 0 and 1'
    }
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'Confidence must be between 0 and 1'
    }
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['news_sentiment', 'technical_analysis', 'market_pattern', 'manual'],
    default: 'technical_analysis'
  },
  relatedNews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NewsData'
  }],
  relatedMarketData: [{
    timestamp: {
      type: Date,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    volume: {
      type: Number,
      min: 0
    }
  }],
  explanation: {
    type: String,
    required: true,
    maxlength: 1000
  },
  expiration: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from creation
    }
  },
  metadata: {
    rsi: Number,
    movingAverage: Number,
    volumeSpike: Number,
    sentimentScore: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if signal is expired
signalSchema.virtual('isExpired').get(function() {
  return this.expiration < new Date();
});

// Virtual for formatted signal strength
signalSchema.virtual('strengthPercentage').get(function() {
  return Math.round(this.strength * 100);
});

// Virtual for formatted confidence
signalSchema.virtual('confidencePercentage').get(function() {
  return Math.round(this.confidence * 100);
});

// Index for better query performance
signalSchema.index({ symbol: 1, generatedAt: -1 });
signalSchema.index({ signalType: 1, strength: -1 });
signalSchema.index({ source: 1 });
signalSchema.index({ expiration: 1 });
signalSchema.index({ 'metadata.sentimentScore': -1 });

// Static method to find active signals
signalSchema.statics.findActive = function() {
  return this.find({
    expiration: { $gt: new Date() },
    strength: { $gt: 0.6 } // Only signals with strength > 60%
  }).sort({ generatedAt: -1 });
};

// Static method to find signals by symbol
signalSchema.statics.findBySymbol = function(symbol, limit = 50) {
  return this.find({ symbol: symbol.toUpperCase() })
    .sort({ generatedAt: -1 })
    .limit(limit)
    .populate('relatedNews');
};

// Instance method to check if signal is strong
signalSchema.methods.isStrongSignal = function() {
  return this.strength > 0.7 && this.confidence > 0.6;
};

// Instance method to extend expiration
signalSchema.methods.extendExpiration = function(hours = 2) {
  this.expiration = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Pre-save middleware to validate data
signalSchema.pre('save', function(next) {
  // Ensure symbol is uppercase
  this.symbol = this.symbol.toUpperCase();
  
  // Validate that related market data has valid timestamps
  if (this.relatedMarketData && this.relatedMarketData.length > 0) {
    const now = new Date();
    for (const data of this.relatedMarketData) {
      if (data.timestamp > now) {
        return next(new Error('Market data timestamp cannot be in the future'));
      }
    }
  }
  
  next();
});

// Post-save middleware to log signal creation
signalSchema.post('save', function(doc, next) {
  console.log(`New signal created for ${doc.symbol}: ${doc.signalType} with ${doc.strengthPercentage}% strength`);
  next();
});

module.exports = mongoose.model('Signal', signalSchema);