const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: String,
  changes: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE'],
    required: true
  },
  errorMessage: String
}, {
  timestamps: true
});

// Index for efficient querying
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, resource: 1 });

// Static method for logging
auditLogSchema.statics.log = function(logData) {
  return this.create(logData);
};

// Method to get logs for a specific resource
auditLogSchema.statics.getResourceHistory = function(resource, resourceId, limit = 100) {
  return this.find({ resource, resourceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'email firstName lastName');
};

module.exports = mongoose.model('AuditLog', auditLogSchema);