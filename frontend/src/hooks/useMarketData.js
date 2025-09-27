import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useMarketData = (symbol, period = '1d') => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      if (!symbol) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const marketData = await api.getMarketData(symbol, period);
        setData(marketData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [symbol, period]);

  return { data, loading, error };
};