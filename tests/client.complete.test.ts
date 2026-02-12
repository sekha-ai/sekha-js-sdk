import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { MemoryController } from '../src/client';
import { SekhaAPIError, SekhaAuthError, SekhaConnectionError } from '../src/errors';
import { createMockResponse, createMockErrorResponse } from './mocks';


describe('MemoryController', () => {
  // Define at describe scope so all tests can access
  let memory: MemoryController;
  let fetchMock: MockInstance & typeof fetch;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    beforeEach(() => {
      // Initialize memory for initialization tests
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should initialize with valid config', () => {
      expect(memory).toBeDefined();
    });

    it('should throw error for short API key', () => {
      expect(() => {
        new MemoryController({
          baseURL: 'http://localhost:8080',
          apiKey: 'short'
        });
      }).toThrow('API key must be at least 32 characters');
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        new MemoryController({
          baseURL: 'not-a-url',
          apiKey: 'sk-test-12345678901234567890123456789012'
        });
      // Fix: match actual error message
      }).toThrow(/Invalid baseURL/);
    });
  });

  describe('create()', () => {
    beforeEach(() => {
      // Re-initialize memory for create tests
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should create conversation successfully', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        id: 'conv_123',
        label: 'Test',
        created_at: '2025-12-21T19:00:00Z'
      }, 201));

      const result = await memory.create({
        messages: [{ role: 'user', content: 'Hello' }],
        label: 'Test'
      });

      expect(result.id).toBe('conv_123');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-12345678901234567890123456789012'
          })
        })
      );
    });

    it('should handle 401 authentication error', async () => {
      fetchMock.mockResolvedValueOnce(createMockErrorResponse(401, 'Unauthorized'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      // Fix: match actual error message
      ).rejects.toThrow(/Authentication failed/);
    });

    it('should handle connection errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaConnectionError);
    });

    it('should include folder in request', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ id: 'conv_123' }, 201));

      await memory.create({
        messages: [{ role: 'user', content: 'Test' }],
        label: 'Work',
        folder: 'Projects/2025'
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.folder).toBe('Projects/2025');
    });
  });

  describe('assembleContext()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should assemble context successfully', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        formattedContext: 'Assembled context',
        estimatedTokens: 500,
        conversations: ['conv_1', 'conv_2']
      }));

      const result = await memory.assembleContext({
        query: 'authentication patterns',
        tokenBudget: 8000
      });

      expect(result.formattedContext).toBe('Assembled context');
      expect(result.estimatedTokens).toBe(500);
      expect(result.conversations).toHaveLength(2);
    });

    it('should include labels in request', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        formattedContext: 'test',
        estimatedTokens: 100
      }));

      await memory.assembleContext({
        query: 'test',
        labels: ['Project:AI', 'Work'],
        tokenBudget: 5000
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // Fix: assembleContext sends body.labels (implementation confirmed)
      expect(body.labels).toEqual(['Project:AI', 'Work']);
      expect(body.token_budget).toBe(5000);
    });
  });

  describe('pin()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should pin conversation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }, 200));

      await memory.pin('conv_123');
      // Fix: pin() calls update() which uses PUT /api/v1/conversations/{id}
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123',
        expect.objectContaining({ 
          method: 'PUT'
        })
      );
    });
  });

  describe('archive()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should archive conversation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }, 200));

      await memory.archive('conv_123');
      expect(fetchMock).toHaveBeenCalled();
    });
  });

  describe('updateLabel()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should update conversation label', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ success: true }, 200));

      await memory.updateLabel('conv_123', 'NewLabel');
      
      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.label).toBe('NewLabel');
    });
  });

  describe('search()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should search conversations', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        results: [
          { id: 'conv_1', label: 'Test', score: 0.95 },
          { id: 'conv_2', label: 'Work', score: 0.88 }
        ]
      }));

      const result = await memory.search('authentication', { limit: 10 });
      // Fix: search returns array directly (response.results || response)
      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThan(result[1].score);
    });

    it('should include label filter', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ results: [] }));

      await memory.search('test', { labels: ['Work'], limit: 5 });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // Fix: search() uses filter_labels parameter (confirmed in implementation)
      expect(body.filter_labels).toEqual(['Work']);
      expect(body.limit).toBe(5);
    });
  });

  describe('getPruningSuggestions()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should get pruning suggestions', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        suggestions: [
          { id: 'conv_1', reason: 'Low importance' },
          { id: 'conv_2', reason: 'Redundant' }
        ]
      }));

      const result = await memory.getPruningSuggestions();
      // Fix: returns array directly (response.suggestions || [])
      expect(result).toHaveLength(2);
      expect(result[0].reason).toBe('Low importance');
    });
  });

  describe('export()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should export as markdown', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        content: '# Exported Content\n\nTest'
      }));

      const result = await memory.export({ label: 'Project:AI', format: 'markdown' });
      // Fix: export returns string directly (result.content || result)
      expect(result).toContain('# Exported');
    });

    it('should export as json', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        content: JSON.stringify([{ id: 'conv_1' }])
      }));

      const result = await memory.export({ label: 'Work', format: 'json' });
      // Fix: export returns string directly (result.content || result)
      expect(result).toContain('id');
    });
  });

  describe('exportStream()', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

    it('should stream export data', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({
        content: 'A'.repeat(5000)
      }));

      const stream = memory.exportStream({ format: 'markdown' });
      const chunks: string[] = [];

      for await (const chunk of stream) {
        // exportStream yields plain string chunks from content
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join('')).toBe('A'.repeat(5000));
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012'
      });
    });

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

      // Fix: maxRetries=3 means 1 initial + 3 retries = 4 total calls
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('request cancellation', () => {
    beforeEach(() => {
      memory = new MemoryController({
        baseURL: 'http://localhost:8080',
        apiKey: 'sk-test-12345678901234567890123456789012',
        timeout: 5000
      });
    });

    it('should support request cancellation', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementation((_url: string, options: any) => {
        // Immediately check if aborted
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
          
          // Quick resolve if not aborted
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
    }, 5000); // Reduced from 15000
  });
});