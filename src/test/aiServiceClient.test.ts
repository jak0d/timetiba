import { AIServiceClient } from '../services/aiServiceClient';

describe('AIServiceClient', () => {
  it('should create an instance', () => {
    const client = new AIServiceClient();
    expect(client).toBeDefined();
  });
});