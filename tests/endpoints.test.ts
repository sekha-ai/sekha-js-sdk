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
        offset: 0,
        limit: 10,
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
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));
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
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));
      await client.pin('123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/pin',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    it('archive() should use /api/v1/conversations/{id}/archive', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));
      await client.archive('123');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/archive',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  describe('Updated update() method', () => {
    it('should call updateLabel when both label and folder provided', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));
      await client.update('123', { label: 'New', folder: '/new' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/label',
        expect.objectContaining({
          body: JSON.stringify({ label: 'New', folder: '/new' }),
        })
      );
    });

    it('should call updateFolder when only folder provided', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));
      await client.update('123', { folder: '/only-folder' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/conversations/123/folder',
        expect.objectContaining({
          body: JSON.stringify({ folder: '/only-folder' }),
        })
      );
    });
  });

  describe('Integration: Pruning Workflow', () => {
    it('should complete full pruning workflow', async () => {
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

      fetchMock.mockResolvedValueOnce(await createMockResponse({}, 204));

      const toArchive = suggestions.suggestions
        .filter((s: any) => s.recommendation === 'archive')
        .map((s: any) => s.conversation_id);

      await client.pruneExecute(toArchive);

      expect(toArchive).toEqual(['123', '456']);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Response Handling', () => {
    it('should handle 204 No Content responses', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({}, 204));

      const result = await client.pin('123');

      // FIXED: pin() returns Promise<void>, so result is undefined
      expect(result).toBeUndefined();
    });

    it('should handle 202 Accepted responses', async () => {
      fetchMock.mockResolvedValue(await createMockResponse({}, 202));

      const result = await client.rebuildEmbeddings();

      // FIXED: rebuildEmbeddings() returns Promise<void>, so result is undefined
      expect(result).toBeUndefined();
    });
  });
});
