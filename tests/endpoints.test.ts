import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryController } from '../src/client';
import { createMockResponse, createMockErrorResponse } from './mocks';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('API Endpoint Fixes', () => {
  let client: MemoryController;

  beforeEach(() => {
    client = new MemoryController({
      baseURL: 'http://localhost:8080',
      apiKey: 'sk-test-12345678901234567890123456789012',
    });
    fetchMock.mockClear();
  });

  describe('Semantic Query', () => {
    it('query() should use /api/v1/query (not /api/v1/search)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          results: [{ id: '1', relevanceScore: 0.92 }],
        })
      );

      await client.query({ query: 'test', limit: 10 });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/query',
        expect.any(Object)
      );
    });
  });

  describe('Context Assembly', () => {
    it('assembleContext() should use /api/v1/context/assemble (not /api/v1/query/smart)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ context: 'assembled', tokenCount: 100 })
      );

      await client.assembleContext({ query: 'test', tokenBudget: 1000 });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/context/assemble',
        expect.any(Object)
      );
    });
  });

  describe('Pruning', () => {
    it('getPruningSuggestions() should use /api/v1/prune/dry-run (not /mcp/tools/memory_prune)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ suggestions: [] })
      );

      await client.getPruningSuggestions();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/prune/dry-run',
        expect.any(Object)
      );
    });
  });

  describe('Conversation Metadata', () => {
    it('updateLabel() should use /api/v1/conversations/{id}/label', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.updateLabel('conv_123', 'NewLabel');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/label',
        expect.any(Object)
      );
    });

    it('pin() should use /api/v1/conversations/{id}/pin', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.pin('conv_123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/pin',
        expect.any(Object)
      );
    });

    it('archive() should use /api/v1/conversations/{id}/archive', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.archive('conv_123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/archive',
        expect.any(Object)
      );
    });
  });

  describe('Count API', () => {
    it('should count all conversations without filters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ count: 42 }));

      const result = await client.count();

      expect(result).toEqual({ count: 42 });
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/count',
        expect.objectContaining({ method: 'POST', body: '{}' })
      );
    });

    it('should count conversations by label', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ count: 10 }));

      await client.count({ label: 'Work' });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.label).toBe('Work');
    });

    it('should count conversations by folder', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({ count: 5 }));

      await client.count({ folder: '/projects' });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.folder).toBe('/projects');
    });

    it('should handle error responses', async () => {
      fetchMock.mockResolvedValueOnce(
        await createMockErrorResponse(400, 'Bad Request')
      );

      await expect(client.count()).rejects.toThrow();
    });
  });

  describe('Full-text Search', () => {
    it('should perform full-text search with default limit', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [{ id: '1' }] })
      );

      await client.search('test query');

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toBe('test query');
      expect(body.limit).toBe(20); // Default
    });

    it('should perform full-text search with custom limit', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [] })
      );

      await client.search('test', { limit: 50 });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.limit).toBe(50);
    });

    it('should handle empty results', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [] })
      );

      const result = await client.search('nonexistent');
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Embedding Rebuild', () => {
    it('should trigger embedding rebuild (async operation)', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ status: 'started', jobId: 'job_123' })
      );

      const result = await client.rebuildEmbeddings();
      expect(result.status).toBe('started');
    });

    it('should handle successful rebuild initiation', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ status: 'started' })
      );

      await expect(client.rebuildEmbeddings()).resolves.toBeDefined();
    });

    it('should handle server errors', async () => {
      fetchMock.mockResolvedValueOnce(
        await createMockErrorResponse(500, 'Internal Server Error')
      );

      await expect(client.rebuildEmbeddings()).rejects.toThrow();
    });
  });

  describe('Analytics', () => {
    it('should generate daily summary', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ level: 'daily', summary: 'Test' })
      );

      await client.generateSummary({ level: 'daily' });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.level).toBe('daily');
    });

    it('should generate weekly summary', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ level: 'weekly' })
      );

      await client.generateSummary({ level: 'weekly' });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.level).toBe('weekly');
    });

    it('should generate monthly summary', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ level: 'monthly' })
      );

      await client.generateSummary({ level: 'monthly' });

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.level).toBe('monthly');
    });

    it('should default to daily level', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ level: 'daily' })
      );

      await client.generateSummary();

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.level).toBe('daily');
    });
  });

  describe('Prune Execution', () => {
    it('should execute pruning for specified conversations', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ deleted: 2 })
      );

      await client.executePrune(['conv_1', 'conv_2']);

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.conversation_ids).toEqual(['conv_1', 'conv_2']);
    });

    it('should handle empty array', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ deleted: 0 })
      );

      const result = await client.executePrune([]);
      expect(result.deleted).toBe(0);
    });

    it('should handle errors during execution', async () => {
      fetchMock.mockResolvedValueOnce(
        await createMockErrorResponse(400, 'Invalid IDs')
      );

      await expect(client.executePrune(['invalid'])).rejects.toThrow();
    });
  });

  describe('Metrics', () => {
    it('should fetch system metrics', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          totalConversations: 100,
          totalMessages: 500,
          storageUsed: '10MB',
        })
      );

      const result = await client.getMetrics();
      expect(result.totalConversations).toBe(100);
    });

    it('should handle future metrics structure', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          totalConversations: 200,
          newField: 'future value',
        })
      );

      const result = await client.getMetrics();
      expect(result.totalConversations).toBe(200);
    });
  });

  describe('Folder Management', () => {
    it('should update conversation folder', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.updateFolder('conv_123', '/new/path');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/conv_123/folder',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ folder: '/new/path' }),
        })
      );
    });

    it('should handle folder paths with special characters', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.updateFolder('conv_123', '/projects/AI & ML');

      const callArgs = fetchMock.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.folder).toBe('/projects/AI & ML');
    });

    it('should handle errors', async () => {
      fetchMock.mockResolvedValueOnce(
        await createMockErrorResponse(404, 'Not Found')
      );

      await expect(
        client.updateFolder('invalid', '/path')
      ).rejects.toThrow();
    });
  });

  describe('Comprehensive Update', () => {
    it('should call updateLabel when both label and folder provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.update('conv_123', { label: 'NewLabel', folder: '/new' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/label'),
        expect.any(Object)
      );
    });

    it('should call updateFolder when only folder provided', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      await client.update('conv_123', { folder: '/new' });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/folder'),
        expect.any(Object)
      );
    });

    it('should handle importanceScore update gracefully', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse({}));

      // importanceScore is not supported but shouldn't throw
      await expect(
        client.update('conv_123', { importanceScore: 8.5 } as any)
      ).resolves.not.toThrow();
    });
  });

  describe('Pruning Workflow', () => {
    it('should complete full pruning workflow', async () => {
      // Step 1: Get suggestions
      fetchMock.mockResolvedValueOnce(
        createMockResponse({
          suggestions: [
            { conversationId: 'conv_1', reason: 'Old' },
            { conversationId: 'conv_2', reason: 'Low importance' },
          ],
        })
      );

      const suggestions = await client.getPruningSuggestions();
      expect(suggestions.suggestions).toHaveLength(2);

      // Step 2: Execute prune
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ deleted: 2 })
      );

      const ids = suggestions.suggestions.map((s: any) => s.conversationId);
      const result = await client.executePrune(ids);
      expect(result.deleted).toBe(2);
    });
  });

  describe('Response Handling', () => {
    it('should handle 204 No Content responses', async () => {
      const response = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: async () => ({}),
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        clone: () => response,
        body: null,
        bodyUsed: false,
        formData: async () => new FormData(),
        type: 'basic',
        url: '',
      } as Response;

      fetchMock.mockResolvedValueOnce(response);

      const result = await client.pin('123');

      expect(result).toEqual({});
    });

    it('should handle 202 Accepted responses', async () => {
      const response = {
        ok: true,
        status: 202,
        statusText: 'Accepted',
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => ({ status: 'processing' }),
        text: async () => JSON.stringify({ status: 'processing' }),
        arrayBuffer: async () => new ArrayBuffer(0),
        blob: async () => new Blob(),
        clone: () => response,
        body: null,
        bodyUsed: false,
        formData: async () => new FormData(),
        type: 'basic',
        url: '',
      } as Response;

      fetchMock.mockResolvedValueOnce(response);

      const result = await client.rebuildEmbeddings();

      // Should not throw, but result will be parsed response
      expect(result).toBeDefined();
    });
  });
});