const prometheus = require('prom-client');

class PerformanceMonitor {
  constructor() {
    this.collectDefaultMetrics = prometheus.collectDefaultMetrics;
    this.collectDefaultMetrics({ timeout: 5000 });

    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.signalGenerationDuration = new prometheus.Histogram({
      name: 'signal_generation_duration_seconds',
      help: 'Duration of signal generation process',
      labelNames: ['signal_type'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    this.apiErrors = new prometheus.Counter({
      name: 'api_errors_total',
      help: 'Total number of API errors',
      labelNames: ['endpoint', 'error_code']
    });
  }

  startRequestTimer(method, route) {
    const end = this.httpRequestDuration.startTimer({ method, route });
    return end;
  }

  recordSignalGenerationTime(signalType, duration) {
    this.signalGenerationDuration.observe({ signal_type: signalType }, duration);
  }

  incrementErrorCounter(endpoint, errorCode) {
    this.apiErrors.inc({ endpoint, error_code: errorCode });
  }

  async getMetrics() {
    return prometheus.register.metrics();
  }
}

module.exports = PerformanceMonitor;