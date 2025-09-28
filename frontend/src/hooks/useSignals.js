import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

export const useSignals = (filters = {}) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Memoize the mock data generator to prevent recreation on every render
  const generateMockSignals = useCallback((limit = 10) => {
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
    const signalTypes = ['BUY', 'SELL', 'NEUTRAL'];
    const sources = ['technical', 'news', 'market', 'pattern'];
    
    return Array.from({ length: limit }, (_, i) => ({
      _id: `mock_signal_${Date.now()}_${i}`,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
      strength: Math.random() * 0.5 + 0.5,
      confidence: Math.random() * 0.3 + 0.7,
      source: sources[Math.floor(Math.random() * sources.length)],
      generatedAt: new Date(),
      explanation: 'Mock data - server connection issue',
      expiration: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isMock: true // Flag to identify mock data
    }));
  }, []);

  // Memoize the fetch function to prevent unnecessary recreations
  const fetchSignals = useCallback(async (currentFilters, abortSignal) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getSignals(currentFilters);
      
      // Handle different response formats
      let signalsData = [];
      if (Array.isArray(data)) {
        signalsData = data;
      } else if (data && Array.isArray(data.signals)) {
        signalsData = data.signals;
      } else if (data && data.pagination && Array.isArray(data.pagination.signals)) {
        signalsData = data.pagination.signals;
      }
      
      if (!abortSignal?.aborted) {
        setSignals(signalsData);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Signal fetch request was aborted');
        return;
      }
      
      console.error('Error fetching signals:', err);
      
      if (!abortSignal?.aborted) {
        setError(err.message);
        
        // Fallback to mock data for specific error types
        if (err.message.includes('Network error') || 
            err.message.includes('Failed to fetch') || 
            err.message.includes('Cannot connect to server')) {
          const mockSignals = generateMockSignals(currentFilters.limit || 10);
          setSignals(mockSignals);
          setError('Using mock data (server unavailable)');
        } else {
          setSignals([]);
        }
      }
    } finally {
      if (!abortSignal?.aborted) {
        setLoading(false);
      }
    }
  }, [generateMockSignals]);

  useEffect(() => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    fetchSignals(filters, abortSignal);

    // Cleanup function to abort request if component unmounts or filters change
    return () => {
      if (abortControllerRef.current && !abortSignal.aborted) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters, fetchSignals]);

  const refresh = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getSignals(filters);
      
      // Handle different response formats
      let signalsData = [];
      if (Array.isArray(data)) {
        signalsData = data;
      } else if (data && Array.isArray(data.signals)) {
        signalsData = data.signals;
      }
      
      if (!abortSignal.aborted) {
        setSignals(signalsData);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Refresh request was aborted');
        return;
      }
      
      console.error('Error refreshing signals:', err);
      if (!abortSignal.aborted) {
        setError(err.message);
        
        // Fallback to mock data
        if (err.message.includes('Network error') || 
            err.message.includes('Failed to fetch')) {
          const mockSignals = generateMockSignals(filters.limit || 10);
          setSignals(mockSignals);
          setError('Using mock data (server unavailable)');
        }
      }
    } finally {
      if (!abortSignal.aborted) {
        setLoading(false);
      }
    }
  }, [filters, generateMockSignals]);

  // Function to manually add a signal (useful for testing)
  const addSignal = useCallback((signalData) => {
    const newSignal = {
      _id: `manual_${Date.now()}`,
      symbol: signalData.symbol,
      signalType: signalData.signalType || 'NEUTRAL',
      strength: signalData.strength || 0.5,
      confidence: signalData.confidence || 0.7,
      source: signalData.source || 'manual',
      generatedAt: new Date(),
      explanation: signalData.explanation || 'Manually added signal',
      expiration: new Date(Date.now() + 2 * 60 * 60 * 1000),
      isManual: true
    };
    
    setSignals(prev => [newSignal, ...prev]);
  }, []);

  // Function to remove a signal by ID
  const removeSignal = useCallback((signalId) => {
    setSignals(prev => prev.filter(signal => signal._id !== signalId));
  }, []);

  // Function to clear all signals
  const clearSignals = useCallback(() => {
    setSignals([]);
  }, []);

  // Function to filter signals by type
  const filterByType = useCallback((signalType) => {
    return signals.filter(signal => signal.signalType === signalType);
  }, [signals]);

  // Function to filter signals by strength threshold
  const filterByStrength = useCallback((minStrength = 0.7) => {
    return signals.filter(signal => signal.strength >= minStrength);
  }, [signals]);

  // Function to filter signals by symbol
  const filterBySymbol = useCallback((symbol) => {
    return signals.filter(signal => signal.symbol === symbol.toUpperCase());
  }, [signals]);

  // Function to get active signals (not expired)
  const getActiveSignals = useCallback(() => {
    const now = new Date();
    return signals.filter(signal => 
      !signal.expiration || new Date(signal.expiration) > now
    );
  }, [signals]);

  // Function to get expired signals
  const getExpiredSignals = useCallback(() => {
    const now = new Date();
    return signals.filter(signal => 
      signal.expiration && new Date(signal.expiration) <= now
    );
  }, [signals]);

  // Function to get statistics
  const getStats = useCallback(() => {
    const total = signals.length;
    const buySignals = signals.filter(s => s.signalType === 'BUY').length;
    const sellSignals = signals.filter(s => s.signalType === 'SELL').length;
    const neutralSignals = signals.filter(s => s.signalType === 'NEUTRAL').length;
    const averageStrength = signals.reduce((sum, s) => sum + s.strength, 0) / total || 0;
    const averageConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / total || 0;
    const strongSignals = signals.filter(s => s.strength > 0.7).length;
    const activeSignals = getActiveSignals().length;
    const expiredSignals = getExpiredSignals().length;

    return {
      total,
      buySignals,
      sellSignals,
      neutralSignals,
      averageStrength: parseFloat(averageStrength.toFixed(2)),
      averageConfidence: parseFloat(averageConfidence.toFixed(2)),
      strongSignals,
      activeSignals,
      expiredSignals,
      buyPercentage: total > 0 ? parseFloat((buySignals / total * 100).toFixed(1)) : 0,
      sellPercentage: total > 0 ? parseFloat((sellSignals / total * 100).toFixed(1)) : 0
    };
  }, [signals, getActiveSignals, getExpiredSignals]);

  // Function to update a signal
  const updateSignal = useCallback((signalId, updates) => {
    setSignals(prev => prev.map(signal => 
      signal._id === signalId ? { ...signal, ...updates, updatedAt: new Date() } : signal
    ));
  }, []);

  // Function to mark signal as read/unread
  const markSignalAsRead = useCallback((signalId) => {
    updateSignal(signalId, { isRead: true });
  }, [updateSignal]);

  const markSignalAsUnread = useCallback((signalId) => {
    updateSignal(signalId, { isRead: false });
  }, [updateSignal]);

  // Function to get unread signals count
  const getUnreadCount = useCallback(() => {
    return signals.filter(signal => !signal.isRead).length;
  }, [signals]);

  // Function to export signals as CSV
  const exportToCSV = useCallback(() => {
    if (signals.length === 0) return '';
    
    const headers = ['Symbol', 'Type', 'Strength', 'Confidence', 'Source', 'Generated At', 'Explanation'];
    const csvRows = signals.map(signal => [
      signal.symbol,
      signal.signalType,
      signal.strength,
      signal.confidence,
      signal.source,
      new Date(signal.generatedAt).toLocaleString(),
      `"${signal.explanation.replace(/"/g, '""')}"` // Escape quotes in explanation
    ]);
    
    return [headers, ...csvRows].map(row => row.join(',')).join('\n');
  }, [signals]);

  return { 
    // Core state
    signals, 
    loading, 
    error, 
    
    // Core actions
    refresh,
    addSignal,
    removeSignal,
    clearSignals,
    updateSignal,
    
    // Filtering functions
    filterByType,
    filterByStrength,
    filterBySymbol,
    getActiveSignals,
    getExpiredSignals,
    
    // Utility functions
    getStats,
    markSignalAsRead,
    markSignalAsUnread,
    getUnreadCount,
    exportToCSV
  };
};

export default useSignals;