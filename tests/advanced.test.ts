import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryController } from '../src/client';
import { SekhaAuthError, SekhaValidationError, SekhaNotFoundError } from '../src/errors';
import { mockConfig, createMockResponse, createMockErrorResponse } from './mocks';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('MemoryController - Advanced Coverage', () => {
  let memory: MemoryController;

  beforeEach(() => {
    memory = new MemoryController({
      baseURL: 'http://localhost:8080',
      apiKey: 'sk-test-12345678901234567890123456789012'
    });
    fetchMock.mockClear();
  });

  describe('RateLimiter edge case', () => {
    it('should wait when rate limit exceeded', async () => {
      // Mock Date.now to simulate rate limit being exceeded
      let fakeTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => fakeTime);
      
      // Mock setTimeout to execute immediately
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
        if (ms) fakeTime += ms;
        fn();
        return {} as NodeJS.Timeout;
      });
      
      // Fill up the rate limiter
      (memory as any).rateLimiter.requests = Array(1000).fill(fakeTime);
      
      // Try to acquire - should wait and then succeed
      await (memory as any).rateLimiter.acquire();
      
      // Should have removed old requests and added new one
      expect((memory as any).rateLimiter.requests.length).toBe(1);
      
      vi.restoreAllMocks();
    }, 5000);
  });

  describe('suggestLabels()', () => {
    it('should get AI-powered label suggestions', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'Engineering', confidence: 0.92 },
          { label: 'API Design', confidence: 0.85 }
        ]
      }));

      const suggestions = await (memory as any).suggestLabels('conv_123');
      
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].label).toBe('Engineering');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/suggest-labels',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('autoLabel()', () => {
    it('should auto-apply label when confidence exceeds threshold', async () => {
      // Mock suggestLabels response
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'High Priority', confidence: 0.95 },
          { label: 'Engineering', confidence: 0.70 }
        ]
      }));

      // Mock updateLabel response
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }));

      const appliedLabel = await (memory as any).autoLabel('conv_123', 0.9);

      expect(appliedLabel).toBe('High Priority');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should return null when no suggestion meets threshold', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'Low Priority', confidence: 0.60 },
          { label: 'General', confidence: 0.55 }
        ]
      }));

      const appliedLabel = await (memory as any).autoLabel('conv_123', 0.9);

      expect(appliedLabel).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1); // Only suggestLabels called
    });
  });

  describe('exportStream edge cases', () => {
  it('should handle exportStream chunking correctly', async () => {
    fetchMock.mockResolvedValueOnce(createMockResponse({
      content: 'A'.repeat(2500) // 2500 chars, should create 3 chunks (1024, 1024, 452)
    }));

    const stream = memory.exportStream({ format: 'markdown' });
    const chunks: string[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(3);
    expect(chunks.join('')).toBe('A'.repeat(2500));
  });
});

  describe('request edge cases', () => {
    it('should test isRetryableError with AuthError', async () => {
      fetchMock.mockResolvedValueOnce(await createMockErrorResponse(401, 'Unauthorized'));

      await expect(
        memory.health()
      ).rejects.toThrow(SekhaAuthError);

      // Should only be called once (no retries)
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('mergeSignals edge case', () => {
    it('should handle already-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort(); // Abort immediately

      // Use a method that actually accepts a signal parameter
      fetchMock.mockImplementationOnce(async (_url: string, options: any) => {
        if (options.signal?.aborted) {
          const error = new Error('The operation was aborted');
          (error as any).name = 'AbortError';
          throw error;
        }
        return createMockResponse({});
      });

      await expect(
        memory.assembleContext({
          query: 'test',
          tokenBudget: 1000,
          signal: controller.signal // Pass the aborted signal
        })
      ).rejects.toThrow(/timed out/);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMCPTools()', () => {
    it('should list available MCP tools', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse([
        { name: 'memory_query', description: 'Query memory' },
        { name: 'memory_store', description: 'Store conversation' }
      ]));

      const tools = await (memory as any).getMCPTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('memory_query');
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle non-retryable errors (Auth)', async () => {
      fetchMock.mockRejectedValue(new SekhaAuthError('Invalid key'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaAuthError);

      // Should not retry - check that fetch was called only once
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle non-retryable errors (Validation)', async () => {
      fetchMock.mockRejectedValue(new SekhaValidationError('Invalid data', 'Test validation error'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaValidationError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should handle non-retryable errors (NotFound)', async () => {
      fetchMock.mockRejectedValue(new SekhaNotFoundError('Not found'));

      await expect(
        memory.get('invalid-id')
      ).rejects.toThrow(SekhaNotFoundError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  }); // Close Error handling edge cases

  // These were nested inside Error handling - moved to top level
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

      fetchMock.mockResolvedValue(await createMockResponse(mockSuggestions));
      const result = await (memory as any).getPruningSuggestions(60, 5.0);

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

      fetchMock.mockResolvedValue(await createMockResponse(mockHealth));
      const result = await (memory as any).health();

      expect(result.status).toBe('healthy');
    });
  });
});