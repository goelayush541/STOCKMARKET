import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

export const useSignals = (filters = {}) => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const fetchSignals = async () => {
      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      try {
        setLoading(true);
        setError(null);
        
        const data = await api.getSignals(filters);
        setSignals(data);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Request was aborted');
          return;
        }
        
        console.error('Error fetching signals:', err);
        setError(err.message);
        
        // Fallback to mock data if API is down
        if (err.message.includes('Network error') || err.message.includes('Failed to fetch')) {
          setSignals(generateMockSignals(filters.limit || 10));
          setError('Using mock data (server unavailable)');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters]);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await api.getSignals(filters);
      setSignals(data);
    } catch (err) {
      console.error('Error refreshing signals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { signals, loading, error, refresh };
};

// Fallback mock data generator
function generateMockSignals(limit = 10) {
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const signalTypes = ['BUY', 'SELL', 'NEUTRAL'];
  
  return Array.from({ length: limit }, (_, i) => ({
    _id: `mock_signal_${Date.now()}_${i}`,
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    signalType: signalTypes[Math.floor(Math.random() * signalTypes.length)],
    strength: Math.random() * 0.5 + 0.5,
    confidence: Math.random() * 0.3 + 0.7,
    source: 'mock',
    generatedAt: new Date(),
    explanation: 'Mock data - server connection issue',
    expiration: new Date(Date.now() + 2 * 60 * 60 * 1000)
  }));
}