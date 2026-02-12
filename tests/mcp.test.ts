import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MCPClient, createMCPClient } from '../src/mcp';
import { SekhaValidationError, SekhaAuthError, SekhaNotFoundError, SekhaAPIError, SekhaConnectionError } from '../src/errors';

const mockMCPConfig = {
  baseURL: 'http://localhost:8080',
  mcpApiKey: 'mcp-test-key-1234567890',
  timeout: 30000,
  maxRetries: 3,
};

const createMockMCPResponse = async (data: any, status: number = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      success: true,
      data,
    }),
    text: async () => JSON.stringify({ success: true, data }),
  } as Response;
};

const createMockMCPErrorResponse = async (status: number, error: string) => {
  return {
    ok: false,
    status,
    json: async () => ({
      success: false,
      error,
    }),
    text: async () => JSON.stringify({ success: false, error }),
  } as Response;
};

describe('MCPClient', () => {
  let client: MCPClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new MCPClient(mockMCPConfig);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      expect(client).toBeDefined();
      expect((client as any).config.baseURL).toBe(mockMCPConfig.baseURL);
      expect((client as any).config.mcpApiKey).toBe(mockMCPConfig.mcpApiKey);
    });

    it('should throw on invalid URL', () => {
      expect(() => new MCPClient({
        baseURL: 'not-a-url',
        mcpApiKey: 'test-key-123456',
      })).toThrow(SekhaValidationError);
    });

    it('should throw on missing API key', () => {
      expect(() => new MCPClient({
        baseURL: 'http://localhost:8080',
        mcpApiKey: '',
      })).toThrow(SekhaValidationError);
    });

    it('should throw on short API key', () => {
      expect(() => new MCPClient({
        baseURL: 'http://localhost:8080',
        mcpApiKey: 'short',
      })).toThrow(SekhaValidationError);
    });

    it('should fallback to apiKey if mcpApiKey not provided', () => {
      const client2 = new MCPClient({
        baseURL: 'http://localhost:8080',
        apiKey: 'fallback-key-123456',
      });

      expect((client2 as any).config.mcpApiKey).toBe('fallback-key-123456');
    });

    it('should use default timeout and maxRetries', () => {
      const client2 = new MCPClient({
        baseURL: 'http://localhost:8080',
        mcpApiKey: 'test-key-123456',
      });

      expect((client2 as any).config.timeout).toBe(30000);
      expect((client2 as any).config.maxRetries).toBe(3);
    });
  });

  describe('memoryStore', () => {
    it('should store a conversation successfully', async () => {
      const mockResponse = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        label: 'Test Label',
        folder: '/test',
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockResponse));

      const result = await client.memoryStore({
        label: 'Test Label',
        folder: '/test',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        importance_score: 7,
      });

      expect(result.success).toBe(true);
      expect(result.data?.conversation_id).toBe(mockResponse.conversation_id);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/mcp/tools/memory_store',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockMCPConfig.mcpApiKey}`,
          }),
        })
      );
    });

    it('should handle MCP-level failure', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(400, 'Invalid message format'));

      await expect(client.memoryStore({
        label: 'Test',
        folder: '/test',
        messages: [],
      })).rejects.toThrow();
    });
  });

  describe('memorySearch', () => {
    it('should perform semantic search', async () => {
      const mockResults = {
        query: 'kubernetes',
        total_results: 2,
        limit: 10,
        results: [
          {
            conversation_id: '123',
            message_id: '456',
            score: 0.95,
            content: 'kubernetes deployment',
            label: 'DevOps',
            folder: '/work',
            timestamp: '2025-01-01T00:00:00Z',
            metadata: {},
          },
          {
            conversation_id: '789',
            message_id: '012',
            score: 0.85,
            content: 'kubernetes configuration',
            label: 'DevOps',
            folder: '/work',
            timestamp: '2025-01-02T00:00:00Z',
            metadata: {},
          },
        ],
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockResults));

      const result = await client.memorySearch({
        query: 'kubernetes',
        limit: 10,
        filters: { label: 'DevOps' },
      });

      expect(result.success).toBe(true);
      expect(result.data?.total_results).toBe(2);
      expect(result.data?.results.length).toBe(2);
    });

    it('should handle empty search results', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        query: 'nonexistent',
        total_results: 0,
        limit: 10,
        results: [],
      }));

      const result = await client.memorySearch({ query: 'nonexistent' });

      expect(result.data?.results).toEqual([]);
      expect(result.data?.total_results).toBe(0);
    });

    it('should support pagination', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        query: 'test',
        total_results: 100,
        limit: 20,
        results: [],
      }));

      await client.memorySearch({
        query: 'test',
        limit: 20,
        offset: 40,
      });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.limit).toBe(20);
      expect(callBody.offset).toBe(40);
    });
  });

  describe('memoryGetContext', () => {
    it('should get conversation context', async () => {
      const mockContext = {
        conversation_id: '123',
        label: 'Engineering Notes',
        status: 'active',
        folder: '/work',
        importance_score: 8,
        word_count: 1500,
        session_count: 3,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-05T00:00:00Z',
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockContext));

      const result = await client.memoryGetContext('123');

      expect(result.success).toBe(true);
      expect(result.data?.label).toBe('Engineering Notes');
      expect(result.data?.importance_score).toBe(8);
      expect(result.data?.status).toBe('active');
    });

    it('should handle non-existent conversation', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(404, 'Conversation not found'));

      await expect(client.memoryGetContext('nonexistent')).rejects.toThrow(SekhaNotFoundError);
    });
  });

  describe('memoryUpdate', () => {
    it('should update conversation fields', async () => {
      const mockUpdate = {
        conversation_id: '123',
        updated_fields: ['label', 'folder', 'importance_score'],
        message: 'Successfully updated conversation',
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockUpdate));

      const result = await client.memoryUpdate({
        conversation_id: '123',
        label: 'New Label',
        folder: '/new/folder',
        importance_score: 9,
      });

      expect(result.success).toBe(true);
      expect(result.data?.updated_fields).toContain('label');
      expect(result.data?.updated_fields).toContain('folder');
      expect(result.data?.updated_fields).toContain('importance_score');
    });

    it('should update only label', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        conversation_id: '123',
        updated_fields: ['label'],
        message: 'Updated label only',
      }));

      await client.memoryUpdate({
        conversation_id: '123',
        label: 'Only Label',
      });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.label).toBe('Only Label');
      expect(callBody.folder).toBeUndefined();
    });

    it('should handle validation errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(400, 'Invalid importance score'));

      await expect(client.memoryUpdate({
        conversation_id: '123',
        importance_score: 15, // Invalid (max is 10)
      })).rejects.toThrow();
    });
  });

  describe('memoryPrune', () => {
    it('should get pruning suggestions with default params', async () => {
      const mockPrune = {
        threshold_days: 30,
        importance_threshold: 5.0,
        total_suggestions: 5,
        estimated_token_savings: 12500,
        suggestions: [
          {
            conversation_id: '123',
            conversation_label: 'Old Chat 1',
            last_accessed: '2024-01-01T00:00:00Z',
            message_count: 10,
            token_estimate: 2500,
            importance_score: 2,
            preview: 'Old conversation',
            recommendation: 'archive',
          },
        ],
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockPrune));

      const result = await client.memoryPrune();

      expect(result.success).toBe(true);
      expect(result.data?.total_suggestions).toBe(5);
      expect(result.data?.estimated_token_savings).toBe(12500);
      expect(result.data?.suggestions.length).toBeGreaterThan(0);
    });

    it('should use custom thresholds', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        threshold_days: 60,
        importance_threshold: 7.0,
        total_suggestions: 2,
        estimated_token_savings: 5000,
        suggestions: [],
      }));

      await client.memoryPrune({
        threshold_days: 60,
        importance_threshold: 7.0,
      });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.threshold_days).toBe(60);
      expect(callBody.importance_threshold).toBe(7.0);
    });

    it('should handle no suggestions case', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        threshold_days: 30,
        importance_threshold: 5.0,
        total_suggestions: 0,
        estimated_token_savings: 0,
        suggestions: [],
      }));

      const result = await client.memoryPrune();

      expect(result.data?.total_suggestions).toBe(0);
      expect(result.data?.suggestions).toEqual([]);
    });
  });

  describe('memoryExport', () => {
    it('should export conversation as JSON', async () => {
      const mockExport = {
        conversation: {
          id: '123',
          label: 'Test',
          folder: '/test',
          status: 'active',
        },
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi!' },
        ],
        format: 'json',
        include_metadata: true,
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockExport));

      const result = await client.memoryExport({
        conversation_id: '123',
        format: 'json',
        include_metadata: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.format).toBe('json');
      expect(result.data?.messages.length).toBe(2);
      expect(result.data?.include_metadata).toBe(true);
    });

    it('should export as markdown', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        conversation: {},
        messages: [],
        format: 'markdown',
        include_metadata: false,
      }));

      const result = await client.memoryExport({
        conversation_id: '123',
        format: 'markdown',
        include_metadata: false,
      });

      expect(result.data?.format).toBe('markdown');
    });

    it('should use default format and metadata settings', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({
        conversation: {},
        messages: [],
        format: 'json',
        include_metadata: true,
      }));

      await client.memoryExport({ conversation_id: '123' });

      const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(callBody.format).toBe('json');
      expect(callBody.include_metadata).toBe(true);
    });
  });

  describe('memoryStats', () => {
    it('should get global stats', async () => {
      const mockStats = {
        total_conversations: 150,
        average_importance: 6.5,
        folders: ['/work', '/personal', '/education'],
        labels: ['Engineering', 'Personal', 'Learning'],
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockStats));

      const result = await client.memoryStats();

      expect(result.success).toBe(true);
      expect(result.data?.total_conversations).toBe(150);
      expect(result.data?.folders).toHaveLength(3);
      expect(result.data?.labels).toHaveLength(3);
    });

    it('should get stats by folder', async () => {
      const mockStats = {
        total_conversations: 50,
        average_importance: 7.2,
        folders: ['/work'],
        labels: ['Engineering', 'DevOps'],
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockStats));

      const result = await client.memoryStats({ folder: '/work' });

      expect(result.data?.total_conversations).toBe(50);
      expect(result.data?.folders).toEqual(['/work']);
    });

    it('should get stats by label', async () => {
      const mockStats = {
        total_conversations: 30,
        average_importance: 8.0,
        folders: ['/work', '/education'],
        labels: ['Engineering'],
      };

      fetchMock.mockResolvedValue(await createMockMCPResponse(mockStats));

      const result = await client.memoryStats({ label: 'Engineering' });

      expect(result.data?.total_conversations).toBe(30);
      expect(result.data?.labels).toEqual(['Engineering']);
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 authentication errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(401, 'Invalid API key'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaAuthError);
    });

    it('should handle 403 authorization errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(403, 'Access denied'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaAuthError);
    });

    it('should handle 404 not found errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(404, 'Resource not found'));

      await expect(client.memoryGetContext('nonexistent')).rejects.toThrow(SekhaNotFoundError);
    });

    it('should handle 429 rate limit errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(429, 'Rate limit exceeded'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaAPIError);
    });

    it('should handle 500 server errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(500, 'Internal server error'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaAPIError);
    });

    it('should handle network errors with retry', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      fetchMock.mockRejectedValueOnce(new Error('Network error'));
      fetchMock.mockResolvedValue(await createMockMCPResponse({ total_conversations: 1, average_importance: 5 }));

      const result = await client.memoryStats();

      expect(fetchMock).toHaveBeenCalledTimes(3); // 2 failures + 1 success
      expect(result.success).toBe(true);
    }, 15000);

    it('should throw after max retries exhausted', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaConnectionError);

      expect(fetchMock).toHaveBeenCalledTimes(4); // Initial + 3 retries
    }, 20000);

    it('should not retry on validation errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(400, 'Validation failed'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaValidationError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on auth errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(401, 'Unauthorized'));

      await expect(client.memoryStats()).rejects.toThrow(SekhaAuthError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });

    it('should not retry on not found errors', async () => {
      fetchMock.mockResolvedValue(await createMockMCPErrorResponse(404, 'Not found'));

      await expect(client.memoryGetContext('123')).rejects.toThrow(SekhaNotFoundError);

      expect(fetchMock).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('createMCPClient', () => {
    it('should create MCP client from MemoryConfig', () => {
      const memoryConfig = {
        baseURL: 'http://localhost:8080',
        apiKey: 'test-key-123456',
        timeout: 5000,
        maxRetries: 2,
      };

      const mcpClient = createMCPClient(memoryConfig);

      expect(mcpClient).toBeInstanceOf(MCPClient);
      expect((mcpClient as any).config.baseURL).toBe(memoryConfig.baseURL);
      expect((mcpClient as any).config.timeout).toBe(5000);
      expect((mcpClient as any).config.maxRetries).toBe(2);
    });
  });

  describe('Request Headers', () => {
    it('should include correct authorization header', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({ total_conversations: 0, average_importance: 0 }));

      await client.memoryStats();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockMCPConfig.mcpApiKey}`,
          }),
        })
      );
    });

    it('should include user agent', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({ total_conversations: 0, average_importance: 0 }));

      await client.memoryStats();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'Sekha-JS-SDK-MCP/1.0.0',
          }),
        })
      );
    });

    it('should include content type', async () => {
      fetchMock.mockResolvedValue(await createMockMCPResponse({ total_conversations: 0, average_importance: 0 }));

      await client.memoryStats();

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });
});
