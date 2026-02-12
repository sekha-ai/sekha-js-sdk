import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryController } from '../src/client';
import { mockConfig, createMockResponse, createMockErrorResponse } from './mocks';

describe('API Endpoint Fixes', () => {
  let client: MemoryController;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new MemoryController(mockConfig);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  describe('Fixed Endpoint Paths', () => {
    it('query() should use /api/v1/query (not /api/v1/search)', async () => {
      const mockResults = {
        results: [{
          conversation_id: '123',
          message_id: '456',
          score: 0.95,
          content: 'test',
          label: 'Test',
          folder: '/test',
          timestamp: '2025-01-01T00:00:00Z',
          metadata: {},
        }],
        total: 1,
        page: 1,
        page_size: 10,
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockResults));

      await client.query('test query', { limit: 10 });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test query', limit: 10, offset: 0 }),
        })
      );
    });

    it('assembleContext() should use /api/v1/context/assemble (not /api/v1/query/smart)', async () => {
      const mockContext = {
        messages: [{ role: 'user', content: 'test' }],
        estimated_tokens: 100,
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockContext));

      await client.assembleContext({
        query: 'test',
        context_budget: 8000,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/context/assemble',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'test', context_budget: 8000 }),
        })
      );
    });

    it('getPruningSuggestions() should use /api/v1/prune/dry-run (not /mcp/tools/memory_prune)', async () => {
      const mockSuggestions = {
        suggestions: [{
          conversation_id: '123',
          conversation_label: 'Old Chat',
          last_accessed: '2024-01-01T00:00:00Z',
          message_count: 10,
          token_estimate: 500,
          importance_score: 3,
          preview: 'Old conversation',
          recommendation: 'archive',
        }],
        total: 1,
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockSuggestions));

      await client.getPruningSuggestions(30, 5.0);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/prune/dry-run',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            threshold_days: 30,
            importance_threshold: 5.0,
          }),
        })
      );
    });

    it('updateLabel() should use /api/v1/conversations/{id}/label', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.updateLabel('123', 'New Label', '/folder');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/label',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ label: 'New Label', folder: '/folder' }),
        })
      );
    });

    it('pin() should use /api/v1/conversations/{id}/pin', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.pin('123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/pin',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('archive() should use /api/v1/conversations/{id}/archive', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.archive('123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/archive',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('New Endpoint: count()', () => {
    it('should count all conversations without filters', async () => {
      const mockCount = { count: 42, label: null, folder: null };
      fetchMock.mockResolvedValue(await createMockResponse(mockCount));

      const result = await client.count();

      expect(result.count).toBe(42);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/count',
        expect.anything()
      );
    });

    it('should count conversations by label', async () => {
      const mockCount = { count: 10, label: 'Engineering', folder: null };
      fetchMock.mockResolvedValue(await createMockResponse(mockCount));

      const result = await client.count({ label: 'Engineering' });

      expect(result.count).toBe(10);
      expect(result.label).toBe('Engineering');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/count?label=Engineering',
        expect.anything()
      );
    });

    it('should count conversations by folder', async () => {
      const mockCount = { count: 5, label: null, folder: '/work' };
      fetchMock.mockResolvedValue(await createMockResponse(mockCount));

      const result = await client.count({ folder: '/work' });

      expect(result.count).toBe(5);
      expect(result.folder).toBe('/work');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/count?folder=%2Fwork',
        expect.anything()
      );
    });

    it('should handle error responses', async () => {
      fetchMock.mockResolvedValue(await createMockErrorResponse(500, 'Database error'));

      await expect(client.count()).rejects.toThrow();
    });
  });

  describe('New Endpoint: searchFTS()', () => {
    it('should perform full-text search with default limit', async () => {
      const mockResults = {
        results: [{
          id: 'msg-123',
          conversation_id: 'conv-456',
          role: 'user',
          content: 'kubernetes deployment config',
          timestamp: '2025-01-01T00:00:00Z',
          rank: 0.95,
        }],
        total: 1,
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockResults));

      const result = await client.searchFTS('kubernetes deployment');

      expect(result.results.length).toBe(1);
      expect(result.total).toBe(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/search/fts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'kubernetes deployment', limit: 50 }),
        })
      );
    });

    it('should perform full-text search with custom limit', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({ results: [], total: 0 }));

      await client.searchFTS('test', 10);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/search/fts',
        expect.objectContaining({
          body: JSON.stringify({ query: 'test', limit: 10 }),
        })
      );
    });

    it('should handle empty results', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({ results: [], total: 0 }));

      const result = await client.searchFTS('nonexistent');

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('New Endpoint: rebuildEmbeddings()', () => {
    it('should trigger embedding rebuild (async operation)', async () => {
      // Controller returns 202 Accepted for async operations
      fetchMock.mockResolvedValue(
        await createMockResponse(null, 202)
      );

      await client.rebuildEmbeddings();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/rebuild-embeddings',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle successful rebuild initiation', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await expect(client.rebuildEmbeddings()).resolves.not.toThrow();
    });

    it('should handle server errors', async () => {
      fetchMock.mockResolvedValue(await createMockErrorResponse(500, 'Server error'));

      await expect(client.rebuildEmbeddings()).rejects.toThrow();
    });
  });

  describe('New Endpoint: summarize()', () => {
    it('should generate daily summary', async () => {
      const mockSummary = {
        conversation_id: '123',
        level: 'daily',
        summary: 'Daily summary of conversation',
        generated_at: '2025-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockSummary));

      const result = await client.summarize('123', 'daily');

      expect(result.summary).toBe('Daily summary of conversation');
      expect(result.level).toBe('daily');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/summarize',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ conversation_id: '123', level: 'daily' }),
        })
      );
    });

    it('should generate weekly summary', async () => {
      const mockSummary = {
        conversation_id: '123',
        level: 'weekly',
        summary: 'Weekly summary',
        generated_at: '2025-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockSummary));

      const result = await client.summarize('123', 'weekly');

      expect(result.level).toBe('weekly');
    });

    it('should generate monthly summary', async () => {
      const mockSummary = {
        conversation_id: '123',
        level: 'monthly',
        summary: 'Monthly summary',
        generated_at: '2025-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockSummary));

      const result = await client.summarize('123', 'monthly');

      expect(result.level).toBe('monthly');
    });

    it('should default to daily level', async () => {
      const mockSummary = {
        conversation_id: '123',
        level: 'daily',
        summary: 'Default daily summary',
        generated_at: '2025-01-01T00:00:00Z',
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockSummary));

      await client.summarize('123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/summarize',
        expect.objectContaining({
          body: JSON.stringify({ conversation_id: '123', level: 'daily' }),
        })
      );
    });
  });

  describe('New Endpoint: pruneExecute()', () => {
    it('should execute pruning for specified conversations', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      const idsToArchive = ['123', '456', '789'];
      await client.pruneExecute(idsToArchive);

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/prune/execute',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ conversation_ids: idsToArchive }),
        })
      );
    });

    it('should handle empty array', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.pruneExecute([]);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ conversation_ids: [] }),
        })
      );
    });

    it('should handle errors during execution', async () => {
      fetchMock.mockResolvedValue(await createMockErrorResponse(500, 'Pruning failed'));

      await expect(client.pruneExecute(['123'])).rejects.toThrow();
    });
  });

  describe('New Endpoint: getMetrics()', () => {
    it('should fetch system metrics', async () => {
      const mockMetrics = { metrics: 'not_implemented' };
      fetchMock.mockResolvedValue(await createMockResponse(mockMetrics));

      const result = await client.getMetrics();

      expect(result.metrics).toBe('not_implemented');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/metrics',
        expect.anything()
      );
    });

    it('should handle future metrics structure', async () => {
      const mockMetrics = {
        metrics: 'implemented',
        request_count: 1000,
        avg_response_time: 50,
      };

      fetchMock.mockResolvedValue(await createMockResponse(mockMetrics));

      const result = await client.getMetrics();

      expect(result.metrics).toBe('implemented');
      expect(result.request_count).toBe(1000);
    });
  });

  describe('New Endpoint: updateFolder()', () => {
    it('should update conversation folder', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.updateFolder('123', '/new/folder');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/folder',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ folder: '/new/folder' }),
        })
      );
    });

    it('should handle folder paths with special characters', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.updateFolder('123', '/work/project #1/docs');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/folder',
        expect.objectContaining({
          body: JSON.stringify({ folder: '/work/project #1/docs' }),
        })
      );
    });

    it('should handle errors', async () => {
      fetchMock.mockResolvedValue(await createMockErrorResponse(404, 'Conversation not found'));

      await expect(client.updateFolder('nonexistent', '/folder')).rejects.toThrow();
    });
  });

  describe('Updated update() method', () => {
    it('should call updateLabel when both label and folder provided', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.update('123', { label: 'New', folder: '/new' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/label',
        expect.objectContaining({
          body: JSON.stringify({ label: 'New', folder: '/new' }),
        })
      );
    });

    it('should call updateFolder when only folder provided', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      await client.update('123', { folder: '/only-folder' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/folder',
        expect.objectContaining({
          body: JSON.stringify({ folder: '/only-folder' }),
        })
      );
    });

    it('should handle importanceScore update gracefully', async () => {
      // Note: importanceScore update not yet implemented in controller
      await expect(
        client.update('123', { importanceScore: 8 })
      ).resolves.not.toThrow();
    });
  });

  describe('Integration: Pruning Workflow', () => {
    it('should complete full pruning workflow', async () => {
      // Step 1: Get suggestions
      const mockSuggestions = {
        suggestions: [
          {
            conversation_id: '123',
            conversation_label: 'Old Chat 1',
            last_accessed: '2024-01-01T00:00:00Z',
            message_count: 10,
            token_estimate: 500,
            importance_score: 2,
            preview: 'Old conversation',
            recommendation: 'archive',
          },
          {
            conversation_id: '456',
            conversation_label: 'Old Chat 2',
            last_accessed: '2024-02-01T00:00:00Z',
            message_count: 5,
            token_estimate: 250,
            importance_score: 3,
            preview: 'Another old conversation',
            recommendation: 'archive',
          },
        ],
        total: 2,
      };

      fetchMock.mockResolvedValueOnce(await createMockResponse(mockSuggestions));

      const suggestions = await client.getPruningSuggestions(60, 5.0);

      expect(suggestions.suggestions.length).toBe(2);
      expect(suggestions.total).toBe(2);

      // Step 2: Execute pruning
      fetchMock.mockResolvedValueOnce(await createMockResponse(null, 204));

      const toArchive = suggestions.suggestions
        .filter(s => s.recommendation === 'archive')
        .map(s => s.conversation_id);

      await client.pruneExecute(toArchive);

      expect(toArchive).toEqual(['123', '456']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Handling', () => {
    it('should handle 204 No Content responses', async () => {
      fetchMock.mockResolvedValue(await createMockResponse(null, 204));

      const result = await client.pin('123');

      expect(result).toBeNull();
    });

    it('should handle 202 Accepted responses', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({ status: 'accepted' }, 202));

      const result = await client.rebuildEmbeddings();

      // Should not throw, but result will be parsed response
      expect(result).toBeDefined();
    });
  });
});
