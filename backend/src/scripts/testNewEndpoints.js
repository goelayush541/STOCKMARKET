require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

const testNewEndpoints = async () => {
  try {
    console.log('🧪 Testing New Endpoints...\n');

    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const { token } = loginResponse.data;
    console.log('✅ Login successful');

    // 2. Test user profile endpoint
    console.log('\n2. Testing user profile endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ User profile endpoint working');
    console.log('User:', profileResponse.data.user.email);

    // 3. Test backtest endpoint
    console.log('\n3. Testing backtest endpoint...');
    const backtestResponse = await axios.post(`${BASE_URL}/api/backtest`, {
      strategyName: 'Test Strategy',
      symbols: ['AAPL', 'MSFT'],
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      initialCapital: 100000,
      strategyType: 'movingAverageCrossover',
      parameters: { shortPeriod: 10, longPeriod: 20 }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Backtest endpoint working');
    console.log('Backtest result:', backtestResponse.data.performance.totalReturn + '%');

    console.log('\n🎉 All new endpoints are working correctly!');

  } catch (error) {
    console.error('\n❌ Endpoint test failed:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data.error);
      console.log('Message:', error.response.data.message);
    } else if (error.request) {
      console.log('❌ No response from server');
    } else {
      console.log('Error:', error.message);
    }
  }
};

testNewEndpoints();