const nodemailer = require('nodemailer');
const User = require('../models/User');
const Signal = require('../models/Signals');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.transporter = null;
    this.initEmailTransport();
  }

  initEmailTransport() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email transport verification failed:', error);
        } else {
          logger.info('Email transport is ready to send messages');
        }
      });
    } else {
      logger.warn('Email alerts disabled: SMTP configuration missing');
    }
  }

  async checkAndSendAlerts() {
    try {
      // Get recent strong signals
      const recentSignals = await Signal.find({
        strength: { $gt: 0.8 },
        generatedAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      });

      if (recentSignals.length === 0) {
        return;
      }

      // Get users who want alerts
      const users = await User.find({
        'preferences.alerts.email': true,
        isVerified: true
      });

      for (const user of users) {
        await this.sendUserAlerts(user, recentSignals);
      }

      logger.info(`Sent alerts to ${users.length} users for ${recentSignals.length} signals`);
    } catch (error) {
      logger.error('Error sending alerts:', error);
    }
  }

  async sendUserAlerts(user, signals) {
    try {
      // Filter signals based on user preferences
      const userSymbols = user.preferences.defaultSymbols || [];
      const relevantSignals = signals.filter(signal => 
        userSymbols.length === 0 || userSymbols.includes(signal.symbol)
      );

      if (relevantSignals.length === 0) {
        return;
      }

      // Send email alert
      if (this.transporter) {
        await this.sendEmailAlert(user, relevantSignals);
      }

      // Here you would add other alert types (push, SMS, etc.)
      
    } catch (error) {
      logger.error(`Error sending alerts to user ${user.email}:`, error);
    }
  }

  async sendEmailAlert(user, signals) {
    const signalList = signals.map(signal => 
      `- ${signal.symbol}: ${signal.signalType} (Strength: ${(signal.strength * 100).toFixed(0)}%, ` +
      `Confidence: ${(signal.confidence * 100).toFixed(0)}%)`
    ).join('\n');

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `Trading Signals Alert - ${new Date().toLocaleDateString()}`,
      html: `
        <h2>New Trading Signals Detected</h2>
        <p>Hello ${user.firstName},</p>
        <p>The following trading signals have been identified:</p>
        <pre>${signalList}</pre>
        <p>Login to your dashboard to view detailed analysis.</p>
        <hr>
        <p><small>This is an automated message. Please do not reply.</small></p>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Email alert sent to ${user.email}`);
    } catch (error) {
      logger.error(`Failed to send email to ${user.email}:`, error);
    }
  }

  async sendManualAlert(userId, message, alertType = 'email') {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      switch (alertType) {
        case 'email':
          if (this.transporter) {
            await this.transporter.sendMail({
              from: process.env.SMTP_USER,
              to: user.email,
              subject: 'Manual Alert',
              text: message
            });
          }
          break;
        // Add other alert types here
        default:
          logger.warn(`Unsupported alert type: ${alertType}`);
      }
    } catch (error) {
      logger.error('Error sending manual alert:', error);
      throw error;
    }
  }
}

module.exports = AlertService;