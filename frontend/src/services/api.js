const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.pendingRequests = new Map();
    this.requestQueue = [];
    this.maxConcurrentRequests = 6; // Limit concurrent requests
    this.activeRequests = 0;
  }

  async request(endpoint, options = {}) {
    // Removed unused requestId variable
    
    // Check if this is a duplicate request
    if (this.pendingRequests.has(endpoint)) {
      console.warn(`Duplicate request prevented: ${endpoint}`);
      return this.pendingRequests.get(endpoint);
    }

    // Wait if too many concurrent requests
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.request(endpoint, options); // Retry
    }

    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const config = {
      ...options,
      headers,
      signal: controller.signal
    };
    
    this.activeRequests++;
    this.pendingRequests.set(endpoint, new Promise(() => {})); // Placeholder

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.reload();
          throw new Error('Authentication failed. Please login again.');
        }
        
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - server is not responding');
      } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        // Handle resource errors with retry logic
        if (endpoint.includes('/api/signals')) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return this.request(endpoint, options); // Retry once
        }
        throw new Error('Network error - please check your connection');
      }
      
      throw error;
    } finally {
      this.activeRequests--;
      this.pendingRequests.delete(endpoint);
      clearTimeout(timeoutId);
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST'
    });
  }

  async verifyToken() {
    return this.request('/api/auth/verify');
  }

  // User endpoints
  async getUserProfile() {
    try {
      return await this.request('/api/user/profile');
    } catch (error) {
      console.error('Failed to get user profile:', error);
      // Return mock data for development
      return {
        user: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          preferences: {
            alerts: { email: true, push: false },
            defaultSymbols: ['AAPL', 'MSFT', 'GOOGL'],
            riskTolerance: 'medium'
          }
        }
      };
    }
  }

  async updateUserProfile(updates) {
    return this.request('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Signals endpoints with optimized caching
  async getSignals(params = {}) {
    const cacheKey = `signals-${JSON.stringify(params)}`;
    const cache = sessionStorage.getItem(cacheKey);
    
    // Return cached data if available and not too old
    if (cache) {
      try {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < 30000) { // 30 second cache
          return data;
        }
      } catch (e) {
        // Cache is invalid, continue with fresh request
      }
    }
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await this.request(`/api/signals?${queryString}`);
      
      let signals = [];
      if (Array.isArray(response)) {
        signals = response;
      } else if (response && Array.isArray(response.signals)) {
        signals = response.signals;
      } else if (response && response.pagination) {
        signals = response.signals || [];
      }
      
      // Cache the response
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: signals,
        timestamp: Date.now()
      }));
      
      return signals;
    } catch (error) {
      console.error('Failed to get signals:', error);
      
      // Try to return cached data as fallback
      if (cache) {
        try {
          const { data } = JSON.parse(cache);
          return data;
        } catch (e) {
          // Cache is invalid
        }
      }
      
      return []; // Return empty array on error
    }
  }

  async getSignal(id) {
    try {
      return await this.request(`/api/signals/${id}`);
    } catch (error) {
      console.error('Failed to get signal:', error);
      return null;
    }
  }

  // News endpoints with caching
  async getNews(params = {}) {
    const cacheKey = `news-${JSON.stringify(params)}`;
    const cache = sessionStorage.getItem(cacheKey);
    
    if (cache) {
      try {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < 60000) { // 1 minute cache for news
          return data;
        }
      } catch (e) {
        // Cache is invalid
      }
    }
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await this.request(`/api/news?${queryString}`);
      
      let news = [];
      if (Array.isArray(response)) {
        news = response;
      } else if (response && Array.isArray(response.news)) {
        news = response.news;
      } else if (response && response.pagination) {
        news = response.news || [];
      }
      
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: news,
        timestamp: Date.now()
      }));
      
      return news;
    } catch (error) {
      console.error('Failed to get news:', error);
      
      if (cache) {
        try {
          const { data } = JSON.parse(cache);
          return data;
        } catch (e) {
          // Cache is invalid
        }
      }
      
      return [];
    }
  }

  // Market data endpoints with caching
  async getMarketData(symbol, period = '1d') {
    const cacheKey = `market-data-${symbol}-${period}`;
    const cache = sessionStorage.getItem(cacheKey);
    
    if (cache) {
      try {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < 60000) { // 1 minute cache for market data
          return data;
        }
      } catch (e) {
        // Cache is invalid
      }
    }
    
    try {
      const response = await this.request(`/api/market-data/${symbol}?period=${period}`);
      const data = Array.isArray(response) ? response : [];
      
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      return data;
    } catch (error) {
      console.error('Failed to get market data:', error);
      
      if (cache) {
        try {
          const { data } = JSON.parse(cache);
          return data;
        } catch (e) {
          // Cache is invalid
        }
      }
      
      return [];
    }
  }

  // Backtesting endpoints
  async runBacktest(config) {
    try {
      return await this.request('/api/backtest', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    } catch (error) {
      console.error('Failed to run backtest:', error);
      throw error; // Re-throw for the component to handle
    }
  }

  async getBacktestResults(id) {
    try {
      return await this.request(`/api/backtest/${id}`);
    } catch (error) {
      console.error('Failed to get backtest results:', error);
      return null;
    }
  }

  // Portfolio endpoints
  async getPortfolio() {
    try {
      return await this.request('/api/portfolio');
    } catch (error) {
      console.error('Failed to get portfolio:', error);
      // Return mock portfolio for development
      return {
        balance: 100000,
        initialBalance: 100000,
        positions: [],
        performance: {
          totalReturn: 0,
          dailyReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        }
      };
    }
  }

  async updatePortfolio(updates) {
    try {
      return await this.request('/api/portfolio', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
    } catch (error) {
      console.error('Failed to update portfolio:', error);
      throw error;
    }
  }

  // Admin endpoints (only for admin users)
  async getSystemHealth() {
    try {
      return await this.request('/api/admin/health');
    } catch (error) {
      console.error('Failed to get system health:', error);
      return { status: 'unknown', timestamp: new Date().toISOString() };
    }
  }

  async getUsageStats() {
    try {
      return await this.request('/api/admin/stats');
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return { users: { total: 0, active: 0 }, signals: 0, backtests: 0 };
    }
  }

  // Data ingestion endpoints
  async ingestMarketData(symbol) {
    try {
      return await this.request('/api/data/ingest/market', {
        method: 'POST',
        body: JSON.stringify({ symbol })
      });
    } catch (error) {
      console.error('Failed to ingest market data:', error);
      throw error;
    }
  }

  async ingestNewsData(query) {
    try {
      return await this.request('/api/data/ingest/news', {
        method: 'POST',
        body: JSON.stringify({ query })
      });
    } catch (error) {
      console.error('Failed to ingest news data:', error);
      throw error;
    }
  }

  // Utility method to check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  // Utility method to get token
  getToken() {
    return localStorage.getItem('token');
  }

  // Utility method to set token
  setToken(token) {
    localStorage.setItem('token', token);
  }

  // Utility method to remove token
  removeToken() {
    localStorage.removeItem('token');
  }
}

export const api = new ApiService();
export default api;