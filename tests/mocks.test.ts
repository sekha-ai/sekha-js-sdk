import { describe, it, expect } from 'vitest';
import { createMockResponse, createMockErrorResponse, mockConfig, mockConversation } from './mocks';

describe('Mock Helpers', () => {
  describe('createMockResponse', () => {
    it('should create a successful response with all methods', async () => {
      const testData = { message: 'test' };
      const response = await createMockResponse(testData, 200);
      
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      
      const jsonResult = await response.json();
      expect(jsonResult).toEqual(testData);
      
      const response2 = await createMockResponse(testData, 200);
      const textResult = await response2.text();
      expect(textResult).toBe(JSON.stringify(testData));
      
      const response3 = await createMockResponse(testData, 200);
      const bufferResult = await response3.arrayBuffer();
      expect(bufferResult).toBeInstanceOf(ArrayBuffer);
    });
  });
  
  describe('createMockErrorResponse', () => {
    it('should create an error response with all methods', async () => {
      const response = await createMockErrorResponse(500, 'Server Error');
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      
      const jsonResult = await response.json();
      expect(jsonResult).toEqual({ error: 'Server Error', code: 500 });
    });
  });
  
  describe('Mock Data', () => {
    it('should export mockConfig with correct values', () => {
      expect(mockConfig.baseURL).toBe('http://localhost:8080');
      expect(mockConfig.apiKey).toBe('sk-test-12345678901234567890123456789012');
    });
    
    it('should export mockConversation with correct structure', () => {
      expect(mockConversation.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockConversation.label).toBe('Test Conversation');
    });
  });
});