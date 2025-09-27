import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
      return { ...state, signals: action.payload };
    case 'SET_MARKET_DATA':
      return { ...state, marketData: action.payload };
    case 'SET_NEWS':
      return { ...state, news: action.payload };
    case 'SET_USER_PREFERENCES':
      return { ...state, userPreferences: action.payload };
    case 'ADD_ALERT':
      return { ...state, alerts: [...state.alerts, action.payload] };
    case 'REMOVE_ALERT':
      return { ...state, alerts: state.alerts.filter(alert => alert.id !== action.payload) };
    case 'CLEAR_ALERTS':
      return { ...state, alerts: [] };
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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserPreferences();
      loadInitialData();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    try {
      const preferences = await api.getUserProfile();
      dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences });
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const [signals, news] = await Promise.all([
        api.getSignals(),
        api.getNews({ limit: 10 })
      ]);
      
      dispatch({ type: 'SET_SIGNALS', payload: signals });
      dispatch({ type: 'SET_NEWS', payload: news });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updatePreferences = async (updates) => {
    try {
      const updatedPreferences = await api.updateUserProfile(updates);
      dispatch({ type: 'SET_USER_PREFERENCES', payload: updatedPreferences });
      return { success: true };
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      return { success: false, error: error.message };
    }
  };

  const addAlert = (alert) => {
    const id = Date.now().toString();
    dispatch({ type: 'ADD_ALERT', payload: { ...alert, id } });
    
    // Auto-remove alert after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_ALERT', payload: id });
    }, 5000);
  };

  const clearError = () => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const value = {
    ...state,
    loadInitialData,
    updatePreferences,
    addAlert,
    clearError
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};