import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { MemoryController } from '../src/client';
import { mockConfig, createMockResponse } from './mocks';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global.fetch as any) = mockFetch;

describe('MemoryController - Advanced Features', () => {
  let client: MemoryController;

  beforeEach(() => {
    client = new MemoryController(mockConfig);
    mockFetch.mockClear();
  });

  describe('getPruningSuggestions', () => {
    it('should fetch pruning suggestions', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            conversationId: '123',
            label: 'Old Chat',
            ageDays: 90,
            importanceScore: 3.5,
            reason: 'Low importance and old',
          },
        ],
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockSuggestions));
      const result = await client.getPruningSuggestions(60, 5.0);

      expect(result).toHaveLength(1);
      expect(result[0].ageDays).toBe(90);
    });
  });

  describe('health', () => {
    it('should check controller health', async () => {
      const mockHealth = {
        status: 'healthy',
        version: '1.0.0',
        databaseOk: true,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockHealth));
      const result = await client.health();

      expect(result.status).toBe('healthy');
    });
  });
});
