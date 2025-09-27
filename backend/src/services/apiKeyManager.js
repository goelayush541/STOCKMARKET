class ApiKeyManager {
  constructor() {
    this.keys = new Map();
    this.rotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  async rotateKey(serviceName) {
    const newKey = this.generateKey();
    const expiresAt = Date.now() + this.rotationInterval;
    
    // Store old key for graceful transition
    const oldKey = this.keys.get(serviceName);
    if (oldKey) {
      this.keys.set(`${serviceName}_old`, {
        key: oldKey.key,
        expiresAt: Date.now() + 3600000 // Valid for 1 more hour
      });
    }

    this.keys.set(serviceName, { key: newKey, expiresAt });
    
    // Update the external service with the new key
    await this.updateServiceKey(serviceName, newKey);
    
    return newKey;
  }

  getKey(serviceName) {
    const keyData = this.keys.get(serviceName);
    if (!keyData || keyData.expiresAt < Date.now()) {
      throw new Error(`No valid key found for ${serviceName}`);
    }
    return keyData.key;
  }

  generateKey() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  async updateServiceKey(serviceName, newKey) {
    // Implementation would vary based on the service
    // For example, update environment variables or config files
    process.env[`${serviceName.toUpperCase()}_API_KEY`] = newKey;
  }

  startAutoRotation() {
    setInterval(() => {
      for (const serviceName of this.keys.keys()) {
        if (!serviceName.endsWith('_old')) {
          this.rotateKey(serviceName).catch(console.error);
        }
      }
    }, this.rotationInterval);
  }
}

module.exports = ApiKeyManager;