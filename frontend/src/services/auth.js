const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Login failed:', data);
        throw new Error(data.message || `Login failed: ${response.status}`);
      }

      console.log('Login successful, token received');
      this.token = data.token;
      localStorage.setItem('token', data.token);
      
      return { user: data.user, token: data.token };
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      
      throw new Error(error.message || 'Could not login');
    }
  }

  async register(userData) {
    try {
      console.log('Attempting registration for:', userData.email);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', data);
        throw new Error(data.message || `Registration failed: ${response.status}`);
      }

      console.log('Registration successful');
      this.token = data.token;
      localStorage.setItem('token', data.token);
      
      return { user: data.user, token: data.token };
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please check if the backend is running.');
      }
      
      throw new Error(error.message || 'Could not register');
    }
  }

  async verifyToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Token verification failed:', data);
        throw new Error(data.message || 'Token verification failed');
      }

      return data;
    } catch (error) {
      console.error('Token verification error:', error);
      throw error;
    }
  }

  logout() {
    console.log('Logging out user');
    this.token = null;
    localStorage.removeItem('token');
  }

  isAuthenticated() {
    return !!this.token;
  }

  getToken() {
    return this.token;
  }
}

export const authService = new AuthService();
export default authService;