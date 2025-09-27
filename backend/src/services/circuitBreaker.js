class CircuitBreaker {
  constructor() {
    this.states = new Map();
    this.failureThreshold = 5; // 5 failures trip the circuit
    this.resetTimeout = 60000; // 1 minute reset timeout
  }

  async execute(serviceName, operation) {
    const state = this.states.get(serviceName) || { failures: 0, state: 'CLOSED', nextTry: 0 };

    if (state.state === 'OPEN') {
      if (Date.now() > state.nextTry) {
        state.state = 'HALF-OPEN';
      } else {
        throw new Error(`Circuit breaker open for ${serviceName}`);
      }
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (state.state === 'HALF-OPEN') {
        state.state = 'CLOSED';
        state.failures = 0;
      }
      
      this.states.set(serviceName, state);
      return result;
    } catch (error) {
      if (state.state === 'HALF-OPEN') {
        state.state = 'OPEN';
        state.nextTry = Date.now() + this.resetTimeout;
      } else {
        state.failures += 1;
        if (state.failures >= this.failureThreshold) {
          state.state = 'OPEN';
          state.nextTry = Date.now() + this.resetTimeout;
        }
      }
      
      this.states.set(serviceName, state);
      throw error;
    }
  }

  getStatus(serviceName) {
    return this.states.get(serviceName) || { state: 'CLOSED', failures: 0 };
  }
}

module.exports = CircuitBreaker;