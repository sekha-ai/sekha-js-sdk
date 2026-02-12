import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { MemoryController } from '../src/client';
import { SekhaAPIError, SekhaConnectionError } from '../src/errors';
import { createMockResponse, createMockErrorResponse } from './mocks';

describe('MemoryController', () => {
  let memory: MemoryController;
  let fetchMock: MockInstance & typeof fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    memory = new MemoryController({
      baseURL: 'http://localhost:8080',
      apiKey: 'sk-test-12345678901234567890123456789012'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('assembleContext()', () => {
    it('should include preferred_labels in request', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        messages: [],
        estimated_tokens: 100
      }));

      await memory.assembleContext({
        query: 'test',
        preferred_labels: ['Project:AI', 'Work'],
        context_budget: 5000
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // FIXED: uses preferred_labels parameter
      expect(body.preferred_labels).toEqual(['Project:AI', 'Work']);
      expect(body.context_budget).toBe(5000);
    });
  });

  describe('pin()', () => {
    it('should pin conversation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}, 200));

      await memory.pin('conv_123');
      // FIXED: uses /api/v1/conversations/{id}/pin endpoint
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/pin',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('search()', () => {
    it('should search conversations', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        results: [
          { id: 'conv_1', label: 'Test', score: 0.95 },
          { id: 'conv_2', label: 'Work', score: 0.88 }
        ],
        total: 2,
        offset: 0,
        limit: 10
      }));

      const result = await memory.search('authentication', { limit: 10 });
      // FIXED: returns QueryResponse object
      expect(result.results).toHaveLength(2);
      expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    });

    it('should include filters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ results: [], total: 0 }));

      await memory.search('test', { filters: { label: 'Work' }, limit: 5 });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // FIXED: uses filters object (not filter_labels array)
      expect(body.filters).toEqual({ label: 'Work' });
      expect(body.limit).toBe(5);
      expect(body.offset).toBe(0);
    });
  });

  describe('getPruningSuggestions()', () => {
    it('should get pruning suggestions', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { conversation_id: 'conv_1', recommendation: 'archive' },
          { conversation_id: 'conv_2', recommendation: 'keep' }
        ],
        total: 2
      }));

      const result = await memory.getPruningSuggestions();
      // FIXED: returns PruneResponse object
      expect(result.suggestions).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('export()', () => {
    it('should export as object', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        conversations: [{ id: 'conv_1' }],
        format: 'json'
      }));

      const result = await memory.export({ label: 'Project:AI', format: 'json' });
      // FIXED: returns object
      expect(result.conversations).toBeDefined();
    });
  });

  describe('exportStream()', () => {
    it('should stream export data', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        content: 'A'.repeat(5000)
      }));

      const stream = memory.exportStream({ format: 'markdown' });
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // FIXED: exportStream stringifies object result
      const joined = chunks.join('');
      expect(chunks.length).toBeGreaterThan(1);
      expect(joined).toContain('content'); // Has JSON structure
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 error', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockErrorResponse(500, 'Server Error'))
        .mockResolvedValueOnce(createMockErrorResponse(500, 'Server Error'))
        .mockResolvedValueOnce(createMockResponse({ id: 'conv_123' }, 201));

      const result = await memory.create({
        messages: [{ role: 'user', content: 'Test' }],
        label: 'Test'
      });

      expect(result.id).toBe('conv_123');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      fetchMock.mockResolvedValue(createMockErrorResponse(500, 'Server Error'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaAPIError);

      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('request cancellation', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementation((_url: string, options: any) => {
        if (options.signal?.aborted) {
          const error = new Error('The operation was aborted');
          (error as any).name = 'AbortError';
          return Promise.reject(error);
        }

        return new Promise((resolve, reject) => {
          const abortHandler = () => {
            const error = new Error('The operation was aborted');
            (error as any).name = 'AbortError';
            reject(error);
          };
          
          options.signal?.addEventListener('abort', abortHandler, { once: true });
          
          setTimeout(() => {
            options.signal?.removeEventListener('abort', abortHandler);
            if (!options.signal?.aborted) {
              resolve(createMockResponse({}));
            }
          }, 100);
        });
      });

      const createPromise = memory.create({
        messages: [],
        label: 'Test',
        signal: controller.signal
      });

      controller.abort();

      await expect(createPromise).rejects.toThrow(SekhaConnectionError);
      expect(fetchMock).toHaveBeenCalled();
    }, 5000);
  });
});