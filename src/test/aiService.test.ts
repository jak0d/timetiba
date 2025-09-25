import { AIServiceClient } from '../services/aiServiceClient';

describe('AI Service Client Tests', () => {
  it('should create an instance', () => {
    const client = new AIServiceClient();
    expect(client).toBeDefined();
  });

  it('should have correct default configuration', () => {
    const client = new AIServiceClient();
    const status = client.getServiceStatus();
    expect(status.isAvailable).toBe(true);
    expect(status.circuitBreakerOpen).toBe(false);
    expect(status.failureCount).toBe(0);
  });

  it('should reset circuit breaker', () => {
    const client = new AIServiceClient();
    client.resetCircuitBreaker();
    const status = client.getServiceStatus();
    expect(status.circuitBreakerOpen).toBe(false);
    expect(status.failureCount).toBe(0);
  });
});