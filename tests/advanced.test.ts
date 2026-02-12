import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryController } from '../src/client';
import { SekhaAuthError, SekhaValidationError, SekhaNotFoundError } from '../src/errors';
import { createMockResponse, createMockErrorResponse } from './mocks';

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
      let fakeTime = 1000000;
      vi.spyOn(Date, 'now').mockImplementation(() => fakeTime);
      
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
        if (ms) fakeTime += ms;
        fn();
        return {} as NodeJS.Timeout;
      });
      
      (memory as any).rateLimiter.requests = Array(1000).fill(fakeTime);
      await (memory as any).rateLimiter.acquire();
      expect((memory as any).rateLimiter.requests.length).toBe(1);
      
      vi.restoreAllMocks();
    }, 5000);
  });

  describe('suggestLabels()', () => {
    it('should get AI-powered label suggestions', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'Engineering', confidence: 0.92, reason: 'test' },
          { label: 'API Design', confidence: 0.85, reason: 'test' }
        ]
      }));

      const result = await (memory as any).suggestLabels('conv_123');
      
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].label).toBe('Engineering');
      // FIXED: new endpoint is /api/v1/labels/suggest with body
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/labels/suggest',
        expect.objectContaining({ 
          method: 'POST',
          body: JSON.stringify({ conversation_id: 'conv_123' })
        })
      );
    });
  });

  describe('autoLabel()', () => {
    it('should auto-apply label when confidence exceeds threshold', async () => {
      // Mock suggestLabels
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'High Priority', confidence: 0.95, reason: 'test' },
          { label: 'Engineering', confidence: 0.70, reason: 'test' }
        ]
      }));

      // Mock get() to fetch conversation folder
      fetchMock.mockResolvedValueOnce(createMockResponse({
        id: 'conv_123',
        label: 'Old Label',
        folder: '/test/folder',
        messages: []
      }));

      // Mock updateLabel response (204 No Content returns {})
      fetchMock.mockResolvedValueOnce(createMockResponse({}, 204));

      const appliedLabel = await (memory as any).autoLabel('conv_123', 0.9);

      expect(appliedLabel).toBe('High Priority');
      expect(fetchMock).toHaveBeenCalledTimes(3); // suggestLabels + get + updateLabel
    });

    it('should return null when no suggestion meets threshold', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { label: 'Low Priority', confidence: 0.60, reason: 'test' },
          { label: 'General', confidence: 0.55, reason: 'test' }
        ]
      }));

      const appliedLabel = await (memory as any).autoLabel('conv_123', 0.9);

      expect(appliedLabel).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('exportStream edge cases', () => {
    it('should handle exportStream chunking correctly', async () => {
      // FIXED: export() returns object, exportStream stringifies it
      fetchMock.mockResolvedValueOnce(createMockResponse({
        content: 'A'.repeat(2500)
      }));

      const stream = memory.exportStream({ format: 'markdown' });
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // exportStream stringifies the object: '{"content":"AAA..."}'
      const joined = chunks.join('');
      expect(chunks.length).toBe(3); // ~822 chars per chunk
      expect(joined).toContain('"content"');
      expect(joined).toContain('A'.repeat(100)); // Has the As
    });
  });

  describe('request edge cases', () => {
    it('should test isRetryableError with AuthError', async () => {
      fetchMock.mockResolvedValueOnce(await createMockErrorResponse(401, 'Unauthorized'));

      await expect(memory.health()).rejects.toThrow(SekhaAuthError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('mergeSignals edge case', () => {
    it('should handle already-aborted signal', async () => {
      const controller = new AbortController();
      controller.abort();

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
          context_budget: 1000,
          signal: controller.signal
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
  });

  describe('getPruningSuggestions', () => {
    it('should fetch pruning suggestions', async () => {
      const mockResponse = {
        suggestions: [
          {
            conversation_id: '123',
            conversation_label: 'Old Chat',
            last_accessed: '2024-01-01T00:00:00Z',
            message_count: 10,
            token_estimate: 500,
            importance_score: 3,
            preview: 'Old conversation',
            recommendation: 'archive'
          },
        ],
        total: 1
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockResponse));
      const result = await (memory as any).getPruningSuggestions(60, 5.0);

      // FIXED: returns PruneResponse object with .suggestions and .total
      expect(result.suggestions).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('health', () => {
    it('should check controller health', async () => {
      const mockHealth = {
        status: 'healthy',
        version: '1.0.0',
        uptime: 1000
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockHealth));
      const result = await (memory as any).health();

      expect(result.status).toBe('healthy');
    });
  });
});