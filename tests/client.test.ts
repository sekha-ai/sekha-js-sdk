import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryController } from '../src/client';
import { mockConfig, mockConversation, createMockResponse, createMockErrorResponse } from './mocks';
import { SekhaNotFoundError, SekhaValidationError, SekhaAPIError } from '../src/errors';

// Properly typed mock fetch
const mockFetch = vi.fn() as any;
(global.fetch as any) = mockFetch;

describe('MemoryController', () => {
  let client: MemoryController;

  beforeEach(() => {
    client = new MemoryController(mockConfig);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeDefined();
      expect((client as any).config.baseURL).toBe(mockConfig.baseURL);
      expect((client as any).config.timeout).toBe(30000);
    });

    it('should override default timeout', () => {
      const customClient = new MemoryController({ ...mockConfig, timeout: 5000 });
      expect((customClient as any).config.timeout).toBe(5000);
    });
  });

  describe('create', () => {
    it('should create a conversation', async () => {
      mockFetch.mockResolvedValue(await createMockResponse(mockConversation, 201));

      const result = await client.create({
        messages: mockConversation.messages,
        label: mockConversation.label,
      });

      expect(result).toEqual(mockConversation);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle validation error', async () => {
      mockFetch.mockResolvedValue(await createMockErrorResponse(400, 'Invalid conversation data'));

      await expect(client.create({ messages: [], label: '' }))
        .rejects.toThrow(SekhaValidationError);
    });
  });

  describe('getConversation', () => {
    it('should retrieve a conversation', async () => {
      mockFetch.mockResolvedValue(await createMockResponse(mockConversation));

      const result = await client.getConversation(mockConversation.id);

      expect(result).toEqual(mockConversation);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should throw not found error', async () => {
      mockFetch.mockResolvedValue(await createMockErrorResponse(404, 'Not found'));

      await expect(client.getConversation('invalid-id'))
        .rejects.toThrow(SekhaNotFoundError);
    });
  });

  describe('listConversations', () => {
    it('should list all conversations', async () => {
      // Updated to match controller's QueryResponse format
      const mockResponse = {
        results: [mockConversation],
        total: 1,
        page: 1,
        page_size: 10,
      };
      mockFetch.mockResolvedValue(await createMockResponse(mockResponse));

      const results = await client.listConversations();

      expect(results.results).toHaveLength(1);
      expect(results.results[0]).toEqual(mockConversation);
      expect(results.total).toBe(1);
    });

    it('should apply filters', async () => {
      const mockResponse = {
        results: [mockConversation],
        total: 1,
        page: 1,
        page_size: 10,
      };
      mockFetch.mockResolvedValue(await createMockResponse(mockResponse));

      await client.listConversations({ label: 'Test' });

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('label=Test');
    });

    it('should support pagination', async () => {
      const mockResponse = {
        results: [mockConversation],
        total: 50,
        page: 2,
        page_size: 10,
      };
      mockFetch.mockResolvedValue(await createMockResponse(mockResponse));

      const results = await client.listConversations({ page: 2, page_size: 10 });

      expect(results.page).toBe(2);
      expect(results.total).toBe(50);
    });
  });

  describe('updateLabel', () => {
    it('should update conversation label and folder', async () => {
      // Updated to use 204 No Content
      mockFetch.mockResolvedValue(await createMockResponse(null, 204));

      await client.updateLabel(mockConversation.id, 'New Label', '/folder');

      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/conversations/');
      expect(callArgs[0]).toContain('/label');
    });
  });

  describe('pin', () => {
    it('should pin a conversation', async () => {
      // Updated to use 204 No Content
      mockFetch.mockResolvedValue(await createMockResponse(null, 204));

      await client.pin(mockConversation.id);

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/conversations/');
      expect(callUrl).toContain('/pin');
    });
  });

  describe('archive', () => {
    it('should archive a conversation', async () => {
      // Updated to use 204 No Content
      mockFetch.mockResolvedValue(await createMockResponse(null, 204));

      await client.archive(mockConversation.id);

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/conversations/');
      expect(callUrl).toContain('/archive');
    });
  });

  describe('delete', () => {
    it('should delete a conversation', async () => {
      mockFetch.mockResolvedValue(await createMockResponse(null, 204));

      await client.delete(mockConversation.id);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('search/query', () => {
    it('should perform semantic search', async () => {
      // Updated to match controller's QueryResponse format
      const mockResponse = {
        results: [{
          conversation_id: mockConversation.id,
          message_id: '456',
          score: 0.95,
          content: 'test content',
          label: 'Test',
          folder: '/test',
          timestamp: '2025-01-01T00:00:00Z',
          metadata: {},
        }],
        total: 1,
        page: 1,
        page_size: 10,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockResponse));

      const results = await client.search('test query');

      expect(results.results).toHaveLength(1);
      expect(results.results[0].score).toBe(0.95);
      expect(results.total).toBe(1);
    });

    it('should use correct endpoint /api/v1/query', async () => {
      const mockResponse = {
        results: [],
        total: 0,
        page: 1,
        page_size: 10,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockResponse));

      await client.query('test');

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v1/query');
      expect(callUrl).not.toContain('/api/v1/search');
    });
  });

  describe('assembleContext', () => {
    it('should assemble context for LLM', async () => {
      // Updated to match controller's ContextAssembly format
      const mockContext = {
        messages: [
          { role: 'user' as const, content: 'Previous question' },
          { role: 'assistant' as const, content: 'Previous answer' },
        ],
        estimated_tokens: 1500,
        conversations_used: 2,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockContext));

      const result = await client.assembleContext({
        query: 'test',
        context_budget: 8000,
      });

      expect(result.messages).toHaveLength(2);
      expect(result.estimated_tokens).toBe(1500);
    });

    it('should use correct endpoint /api/v1/context/assemble', async () => {
      const mockContext = {
        messages: [],
        estimated_tokens: 0,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockContext));

      await client.assembleContext({ query: 'test' });

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/api/v1/context/assemble');
      expect(callUrl).not.toContain('/api/v1/query/smart');
    });
  });

  describe('export', () => {
    it('should export as markdown', async () => {
      const mockExport = {
        content: '# Export\n\n## Conversation',
        format: 'markdown',
        conversationCount: 1,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockExport));

      const result = await client.export({ label: 'Test', format: 'markdown' });

      expect(result.content).toBe(mockExport.content);
    });

    it('should export as JSON', async () => {
      const mockExport = {
        content: '[{"id": "123"}]',
        format: 'json',
        conversationCount: 1,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockExport));

      const result = await client.export({ format: 'json' });

      expect(result.content).toBe(mockExport.content);
    });

    it('should export single conversation via conversation_id', async () => {
      const mockExport = {
        success: true,
        data: { conversation: mockConversation },
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockExport));

      const result = await client.export({ conversation_id: '123', format: 'json' });

      expect(result.success).toBe(true);
      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain('/mcp/tools/memory_export');
    });

    it('should handle invalid format error', async () => {
      mockFetch.mockResolvedValue(await createMockErrorResponse(400, 'Invalid format'));

      await expect(client.export({ format: 'invalid' as any }))
        .rejects.toThrow(SekhaValidationError);
    });
  });

  describe('exportStream', () => {
    it('should stream export content', async () => {
      const mockExport = {
        content: 'A'.repeat(5000),
        format: 'markdown',
        conversationCount: 1,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockExport));

      const stream = client.exportStream({ format: 'markdown' });
      const chunks: string[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.join('')).toContain('A');
    });
  });

  describe('timeout handling', () => {
    it('should have correct timeout configuration', () => {
      const customClient = new MemoryController({ ...mockConfig, timeout: 5000 });
      expect((customClient as any).config.timeout).toBe(5000);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(client.getConversation('123'))
        .rejects.toThrow();

      try {
        await client.getConversation('123');
      } catch (error) {
        expect((error as Error).message).toContain('Network error');
      }
    }, 15000); // Increase timeout to 15 seconds

    it('should handle API errors with status codes', async () => {
      mockFetch.mockResolvedValue(await createMockErrorResponse(500, 'Internal server error'));

      await expect(client.getConversation('123'))
        .rejects.toThrow(SekhaAPIError);
    }, 15000); // Increase timeout to 15 seconds
  });

  describe('health', () => {
    it('should check health status', async () => {
      const mockHealth = {
        status: 'healthy',
        version: '1.0.0',
        uptime_seconds: 3600,
      };

      mockFetch.mockResolvedValue(await createMockResponse(mockHealth));

      const result = await client.health();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
    });
  });
});