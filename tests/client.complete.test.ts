import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryController } from '../src/client';
import { SekhaAPIError, SekhaAuthError, SekhaConnectionError } from '../src/errors';


describe('MemoryController', () => {
  let memory: MemoryController;
  let fetchMock: ReturnType<typeof vi.fn>;


  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;
    
    memory = new MemoryController({
      baseURL: 'http://localhost:8080',
      apiKey: 'sk-test-12345678901234567890123456789012'
    });
  });


  afterEach(() => {
    vi.restoreAllMocks();
  });


  describe('Initialization', () => {
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
          apiKey: 'sk-' + 'x'.repeat(32)
        });
      }).toThrow('Invalid baseURL');
    });
  });


  describe('create()', () => {
    it('should create conversation successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'conv_123',
          label: 'Test',
          created_at: '2025-12-21T19:00:00Z'
        })
      });


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
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });


      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaAuthError);
    });


    it('should handle connection errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));


      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaConnectionError);
    });


    it('should include folder in request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 'conv_123' })
      });


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
    it('should assemble context successfully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          formattedContext: 'Assembled context',
          estimatedTokens: 500,
          conversations: ['conv_1', 'conv_2']
        })
      });


      const result = await memory.assembleContext({
        query: 'authentication patterns',
        tokenBudget: 8000
      });


      expect(result.formattedContext).toBe('Assembled context');
      expect(result.estimatedTokens).toBe(500);
      expect(result.conversations).toHaveLength(2);
    });


    it('should include labels in request', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ formattedContext: 'test', estimatedTokens: 100 })
      });


      await memory.assembleContext({
        query: 'test',
        labels: ['Project:AI', 'Work'],
        tokenBudget: 5000
      });


      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.labels).toEqual(['Project:AI', 'Work']);
      expect(body.token_budget).toBe(5000);
    });
  });


  describe('pin()', () => {
    it('should pin conversation', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });


      const result = await memory.pin('conv_123');
      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/pin',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });


  describe('archive()', () => {
    it('should archive conversation', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });


      const result = await memory.archive('conv_123');
      expect(result).toBe(true);
    });
  });


  describe('updateLabel()', () => {
    it('should update conversation label', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });


      const result = await memory.updateLabel('conv_123', 'NewLabel');
      expect(result).toBe(true);


      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.label).toBe('NewLabel');
    });
  });


  describe('search()', () => {
    it('should search conversations', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          results: [
            { id: 'conv_1', label: 'Test', score: 0.95 },
            { id: 'conv_2', label: 'Work', score: 0.88 }
          ]
        })
      });


      const results = await memory.search('authentication', { limit: 10 });
      expect(results).toHaveLength(2);
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });


    it('should include label filter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ results: [] })
      });


      await memory.search('test', { labels: ['Work'], limit: 5 });


      const callArgs = fetchMock.mock.calls[0];
      const url = new URL(callArgs[0]);
      expect(url.searchParams.get('limit')).toBe('5');
    });
  });


  describe('getPruningSuggestions()', () => {
    it('should get pruning suggestions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          suggestions: [
            { id: 'conv_1', reason: 'Low importance' },
            { id: 'conv_2', reason: 'Redundant' }
          ]
        })
      });


      const suggestions = await memory.getPruningSuggestions();
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].reason).toBe('Low importance');
    });
  });


  describe('export()', () => {
    it('should export as markdown', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: '# Exported Content\n\nTest'
        })
      });


      const result = await memory.export({ label: 'Project:AI', format: 'markdown' });
      expect(result).toContain('# Exported');
    });


    it('should export as json', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          conversations: [{ id: 'conv_1' }]
        })
      });


      const result = await memory.export({ label: 'Work', format: 'json' });
      expect(result).toContain('conversations');
    });
  });


  describe('exportStream()', () => {
    it('should stream export data', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      const mockStream = {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[0]) })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[1]) })
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(chunks[2]) })
            .mockResolvedValueOnce({ done: true, value: undefined })
        })
      };


      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: mockStream
      });


      const stream = memory.exportStream({ label: 'Project:AI' });
      const received = [];
      
      for await (const chunk of stream) {
        received.push(chunk);
      }


      expect(received).toEqual(chunks);
    });
  });


  describe('Retry Logic', () => {
    it('should retry on 500 error', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 'conv_123' })
        });


      const result = await memory.create({
        messages: [{ role: 'user', content: 'Test' }],
        label: 'Test'
      });


      expect(result.id).toBe('conv_123');
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });


    it('should fail after max retries', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500 });


      await expect(
        memory.create({ messages: [], label: 'Test' })
      ).rejects.toThrow(SekhaAPIError);


      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });


  describe('AbortController Support', () => {
    it('should support request cancellation', async () => {
      const controller = new AbortController();
      
      fetchMock.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 1000);
        })
      );


      const options = { 
        messages: [], 
        label: 'Test',
        signal: controller.signal 
      };
      
      const promise = memory.create(options);


      controller.abort();


      await expect(promise).rejects.toThrow();
    });
  });
});
