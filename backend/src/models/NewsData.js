const mongoose = require('mongoose');

const newsDataSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  source: {
    type: String,
    required: true,
    default: 'News API'
  },
  publishedAt: {
    type: Date,
    required: true,
    index: true
  },
  url: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  authors: [{
    type: String,
    trim: true
  }],
  symbols: [{
    type: String,
    uppercase: true,
    trim: true
  }],
  sentimentScore: {
    type: Number,
    min: -1,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= -1 && v <= 1;
      },
      message: 'Sentiment score must be between -1 and 1'
    }
  },
  sentimentLabel: {
    type: String,
    enum: ['positive', 'negative', 'neutral', null],
    default: null
  },
  keyPhrases: [{
    type: String,
    trim: true
  }],
  relevanceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  categories: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted published date
newsDataSchema.virtual('publishedFormatted').get(function() {
  return this.publishedAt.toLocaleString();
});

// Virtual for sentiment emoji
newsDataSchema.virtual('sentimentEmoji').get(function() {
  if (this.sentimentLabel === 'positive') return '😊';
  if (this.sentimentLabel === 'negative') return '😞';
  return '😐';
});

// Index for better query performance
newsDataSchema.index({ publishedAt: -1 });
newsDataSchema.index({ symbols: 1 });
newsDataSchema.index({ sentimentScore: -1 });
newsDataSchema.index({ source: 1 });
newsDataSchema.index({ 'categories': 1 });

// Static method to find recent news
newsDataSchema.statics.findRecent = function(limit = 20) {
  return this.find()
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to find news by symbol
newsDataSchema.statics.findBySymbol = function(symbol, limit = 10) {
  return this.find({ symbols: symbol.toUpperCase() })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Static method to find positive sentiment news
newsDataSchema.statics.findPositiveNews = function(minScore = 0.7, limit = 10) {
  return this.find({ 
    sentimentScore: { $gte: minScore },
    sentimentLabel: 'positive'
  })
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Pre-save middleware to extract symbols from content
newsDataSchema.pre('save', function(next) {
  if (this.isModified('content') && (!this.symbols || this.symbols.length === 0)) {
    // Simple symbol extraction from content (uppercase words of length 2-5)
    const symbolRegex = /\b[A-Z]{2,5}\b/g;
    const foundSymbols = this.content.match(symbolRegex) || [];
    
    // Filter out common words that might match symbol pattern
    const commonWords = ['IPO', 'CEO', 'CFO', 'ETF', 'USD', 'SEC', 'AI', 'IT'];
    this.symbols = [...new Set(foundSymbols.filter(sym => !commonWords.includes(sym)))];
  }
  
  // Auto-determine sentiment label based on score
  if (this.sentimentScore !== undefined && this.sentimentScore !== null) {
    if (this.sentimentScore > 0.3) {
      this.sentimentLabel = 'positive';
    } else if (this.sentimentScore < -0.3) {
      this.sentimentLabel = 'negative';
    } else {
      this.sentimentLabel = 'neutral';
    }
  }
  
  next();
});

module.exports = mongoose.model('NewsData', newsDataSchema);