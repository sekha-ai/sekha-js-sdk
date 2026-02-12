import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryController } from '../src/client';
import { createMockResponse, createMockErrorResponse, mockConversation } from './mocks';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('MemoryController', () => {
  let memory: MemoryController;

  beforeEach(() => {
    memory = new MemoryController({
      baseURL: 'http://localhost:8080',
      apiKey: 'sk-test-12345678901234567890123456789012',
    });
    fetchMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(memory).toBeInstanceOf(MemoryController);
    });

    it('should throw error for short API key', () => {
      expect(() => {
        new MemoryController({
          baseURL: 'http://localhost:8080',
          apiKey: 'short',
        });
      }).toThrow(/at least 32 characters/);
    });

    it('should throw error for invalid URL', () => {
      expect(() => {
        new MemoryController({
          baseURL: 'not-a-url',
          apiKey: 'sk-test-12345678901234567890123456789012',
        });
      }).toThrow(/valid URL/);
    });
  });

  describe('create()', () => {
    it('should create conversation successfully', async () => {
      const mockResponse = {
        id: 'conv_123',
        label: 'Test',
        folder: '/test',
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await memory.create({
        messages: [{ role: 'user', content: 'Hello' }],
        label: 'Test',
      });

      expect(result.id).toBe('conv_123');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle 401 authentication error', async () => {
      fetchMock.mockResolvedValueOnce(
        await createMockErrorResponse(401, 'Unauthorized')
      );

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(/Unauthorized/);
    });

    it('should handle connection errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow();
    });

    it('should include folder in request', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ ...mockConversation, folder: '/work' })
      );

      await memory.create({
        messages: [],
        label: 'Test',
        folder: '/work',
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.folder).toBe('/work');
    });
  });

  describe('assembleContext()', () => {
    it('should assemble context successfully', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          context: 'Previous conversation about API design',
          tokenCount: 45,
        })
      );

      const result = await memory.assembleContext({
        query: 'How do I design a REST API?',
        tokenBudget: 1000,
      });

      expect(result.context).toContain('API design');
    });

    it('should include labels in request', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ context: 'test', tokenCount: 10 })
      );

      await memory.assembleContext({
        query: 'test',
        tokenBudget: 5000,
        preferredLabels: ['Project:AI', 'Work'],
      });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.preferred_labels).toEqual(['Project:AI', 'Work']);
      expect(body.token_budget).toBe(5000);
    });
  });

  describe('pin()', () => {
    it('should pin conversation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await memory.pin('conv_123');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/pin',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('archive()', () => {
    it('should archive conversation', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await memory.archive('conv_123');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/archive',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('updateLabel()', () => {
    it('should update conversation label', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await memory.updateLabel('conv_123', 'NewLabel');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/label',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ label: 'NewLabel' }),
        })
      );
    });
  });

  describe('search()', () => {
    it('should search conversations', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [
            { id: '1', label: 'Auth', score: 0.95 },
            { id: '2', label: 'API', score: 0.85 },
          ],
        })
      );

      const result = await memory.search('authentication', { limit: 10 });
      expect(result.results).toHaveLength(2);
      expect(result.results[0].score).toBeGreaterThan(result.results[1].score);
    });

    it('should include label filter', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [] })
      );

      await memory.search('test query', { label: 'Work', limit: 5 });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filters).toEqual({ label: 'Work' });
      expect(body.limit).toBe(5);
    });
  });

  describe('getPruningSuggestions()', () => {
    it('should get pruning suggestions', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          suggestions: [
            { conversationId: '1', reason: 'Low importance' },
            { conversationId: '2', reason: 'Very old' },
          ],
        })
      );

      const result = await memory.getPruningSuggestions();
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].reason).toBe('Low importance');
    });
  });

  describe('export()', () => {
    it('should export as markdown', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ content: '# Exported Conversation\n\nContent here' })
      );

      const result = await memory.export({ label: 'Project:AI', format: 'markdown' });
      const content = typeof result === 'string' ? result : JSON.stringify(result);
      expect(content).toContain('# Exported');
    });

    it('should export as json', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ id: 'conv_123', label: 'Test' })
      );

      const result = await memory.export({ label: 'Work', format: 'json' });
      const content = typeof result === 'string' ? result : JSON.stringify(result);
      expect(content).toContain('id');
    });
  });

  describe('exportStream()', () => {
    it('should stream export data', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ content: 'A'.repeat(5000) })
      );

      const stream = memory.exportStream({ format: 'markdown' });
      const chunks: string[] = [];

      for await (const chunk of stream) {
        const parsed = JSON.parse(chunk);
        chunks.push(parsed.content || chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join('')).toBe('A'.repeat(5000));
    });
  });

  describe('retry logic', () => {
    it('should retry on 500 error', async () => {
      fetchMock
        .mockResolvedValueOnce(await createMockErrorResponse(500, 'Server Error'))
        .mockResolvedValueOnce(createMockResponse({ status: 'healthy' }));

      const result = await memory.health();
      expect(result.status).toBe('healthy');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      fetchMock.mockResolvedValue(
        await createMockErrorResponse(500, 'Server Error')
      );

      await expect(memory.health()).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('cancellation', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();

      fetchMock.mockImplementationOnce(async (_url, options: any) => {
        // Simulate checking for abort signal
        if (options.signal?.aborted) {
          const error = new Error('The operation was aborted');
          (error as any).name = 'AbortError';
          throw error;
        }
        return createMockResponse({ status: 'healthy' });
      });

      controller.abort();

      await expect(
        memory.assembleContext({
          query: 'test',
          tokenBudget: 1000,
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });
});