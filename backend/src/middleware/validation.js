const { body, query, param, validationResult } = require('express-validator');
const constants = require('../utils/constants');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Failed',
      message: 'Invalid input data',
      code: constants.ERROR_CODES.VALIDATION_ERROR,
      details: errors.array()
    });
  }
  
  next();
};

// Common validation rules
const symbolValidation = param('symbol')
  .isUppercase()
  .isLength({ min: 1, max: 5 })
  .withMessage('Symbol must be 1-5 uppercase letters');

const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Must be a valid email address');

const passwordValidation = body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain uppercase, lowercase, number and special character');

// Validation chains for different routes
const validateSignup = [
  emailValidation,
  passwordValidation,
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  handleValidationErrors
];

const validateLogin = [
  emailValidation,
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const validateMarketDataRequest = [
  symbolValidation,
  query('period')
    .optional()
    .isIn(['1h', '1d', '1w', '1m'])
    .withMessage('Period must be one of: 1h, 1d, 1w, 1m'),
  handleValidationErrors
];

const validateBacktestRequest = [
  body('symbols')
    .isArray({ min: 1, max: 10 })
    .withMessage('Must provide 1-10 symbols'),
  body('symbols.*')
    .isUppercase()
    .isLength({ min: 1, max: 5 })
    .withMessage('Each symbol must be 1-5 uppercase letters'),
  body('startDate').isISO8601().withMessage('Start date must be valid ISO date'),
  body('endDate').isISO8601().withMessage('End date must be valid ISO date'),
  body('initialCapital').isFloat({ min: 100 }).withMessage('Initial capital must be at least 100'),
  body('strategyType')
    .isIn(['movingAverageCrossover', 'rsiMeanReversion', 'newsSentiment'])
    .withMessage('Invalid strategy type'),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateMarketDataRequest,
  validateBacktestRequest,
  handleValidationErrors
};