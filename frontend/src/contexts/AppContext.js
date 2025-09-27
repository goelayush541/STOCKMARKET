import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const AppContext = createContext();

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SIGNALS':
      // Handle different response formats and ensure array
      const signals = Array.isArray(action.payload) ? action.payload : 
                     action.payload?.signals ? action.payload.signals : 
                     action.payload?.data ? action.payload.data : [];
      return { ...state, signals };
    case 'SET_MARKET_DATA':
      return { ...state, marketData: action.payload };
    case 'SET_NEWS':
      // Handle different response formats and ensure array
      const news = Array.isArray(action.payload) ? action.payload : 
                  action.payload?.news ? action.payload.news : 
                  action.payload?.data ? action.payload.data : [];
      return { ...state, news };
    case 'SET_USER_PREFERENCES':
      return { ...state, userPreferences: action.payload };
    case 'SET_PORTFOLIO':
      return { ...state, portfolio: action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    case 'REMOVE_ALERT':
      return { ...state, alerts: state.alerts.filter(alert => alert.id !== action.payload) };
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };
    case 'SET_BACKTEST_RESULTS':
      return { ...state, backtestResults: action.payload };
    default:
      return state;
  }
};

const initialState = {
  loading: false,
  error: null,
  signals: [],
  marketData: {},
  news: [],
  userPreferences: null,
  portfolio: null,
  backtestResults: null,
  alerts: []
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { user, isAuthenticated } = useAuth();

  // Load user preferences when user authenticates
  const loadUserPreferences = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.getUserProfile();
      // Handle both direct preferences object and nested user.preferences
      const preferences = response.preferences || response.user?.preferences || null;
      dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences });
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      // Set default preferences if API fails
      dispatch({ 
        type: 'SET_USER_PREFERENCES', 
        payload: {
          alerts: { email: true, push: false },
          defaultSymbols: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
          riskTolerance: 'medium'
        }
      });
    }
  }, [isAuthenticated]);

  // Load initial data when user authenticates
  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Load data in parallel for better performance
      const [signalsData, newsData, portfolioData] = await Promise.all([
        api.getSignals({ limit: 20 }),
        api.getNews({ limit: 10 }),
        api.getPortfolio()
      ]);
      
      dispatch({ type: 'SET_SIGNALS', payload: signalsData });
      dispatch({ type: 'SET_NEWS', payload: newsData });
      dispatch({ type: 'SET_PORTFOLIO', payload: portfolioData });
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      
      // Set empty data as fallback
      dispatch({ type: 'SET_SIGNALS', payload: [] });
      dispatch({ type: 'SET_NEWS', payload: [] });
      dispatch({ type: 'SET_PORTFOLIO', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [isAuthenticated]);

  // Load market data for specific symbol
  const loadMarketData = useCallback(async (symbol, period = '1d') => {
    try {
      const marketData = await api.getMarketData(symbol, period);
      dispatch({ 
        type: 'SET_MARKET_DATA', 
        payload: {
          ...state.marketData,
          [symbol]: marketData
        }
      });
      return marketData;
    } catch (error) {
      console.error(`Error loading market data for ${symbol}:`, error);
      throw error;
    }
  }, [state.marketData]);

  // Refresh signals data
  const refreshSignals = useCallback(async () => {
    try {
      const signalsData = await api.getSignals({ limit: 20 });
      dispatch({ type: 'SET_SIGNALS', payload: signalsData });
      return signalsData;
    } catch (error) {
      console.error('Error refreshing signals:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Refresh news data
  const refreshNews = useCallback(async () => {
    try {
      const newsData = await api.getNews({ limit: 10 });
      dispatch({ type: 'SET_NEWS', payload: newsData });
      return newsData;
    } catch (error) {
      console.error('Error refreshing news:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Refresh portfolio data
  const refreshPortfolio = useCallback(async () => {
    try {
      const portfolioData = await api.getPortfolio();
      dispatch({ type: 'SET_PORTFOLIO', payload: portfolioData });
      return portfolioData;
    } catch (error) {
      console.error('Error refreshing portfolio:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, []);

  // Run backtest
  const runBacktest = useCallback(async (config) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const results = await api.runBacktest(config);
      dispatch({ type: 'SET_BACKTEST_RESULTS', payload: results });
      return results;
    } catch (error) {
      console.error('Error running backtest:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Update user preferences
  const updatePreferences = useCallback(async (updates) => {
    try {
      const response = await api.updateUserProfile(updates);
      const preferences = response.preferences || response.user?.preferences || updates;
      dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences });
      return { success: true, preferences };
    } catch (error) {
      console.error('Error updating preferences:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  }, []);

  // Add alert
  const addAlert = useCallback((alert) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const alertWithId = { ...alert, id };
    
    dispatch({ type: 'ADD_ALERT', payload: alertWithId });
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_ALERT', payload: id });
    }, 5000);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    dispatch({ type: 'CLEAR_ALERTS' });
  }, []);

  // Effect to load data when user changes
  useEffect(() => {
    if (isAuthenticated) {
      loadUserPreferences();
      loadInitialData();
    } else {
      // Reset state when user logs out
      dispatch({ type: 'SET_SIGNALS', payload: [] });
      dispatch({ type: 'SET_NEWS', payload: [] });
      dispatch({ type: 'SET_PORTFOLIO', payload: null });
      dispatch({ type: 'SET_USER_PREFERENCES', payload: null });
      dispatch({ type: 'SET_BACKTEST_RESULTS', payload: null });
    }
  }, [isAuthenticated, loadUserPreferences, loadInitialData]);

  // Effect to handle global errors and show alerts
  useEffect(() => {
    if (state.error) {
      addAlert({
        type: 'error',
        message: state.error,
        title: 'Error'
      });
    }
  }, [state.error, addAlert]);

  const value = {
    // State
    ...state,
    
    // Actions
    loadInitialData,
    refreshSignals,
    refreshNews,
    refreshPortfolio,
    loadMarketData,
    runBacktest,
    updatePreferences,
    addAlert,
    clearError,
    clearAlerts
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};