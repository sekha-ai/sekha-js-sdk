/**
 * Sekha Memory Controller - JavaScript/TypeScript SDK
 * 
 * Official SDK for interacting with Sekha Memory Controller API.
 * Supports both browser and Node.js environments.
 * 
 * @module @sekha/sdk
 */

import {
  MemoryConfig,
  Conversation,
  CreateOptions,
  ListFilter,
  SearchOptions,
  ContextOptions,
  ExportOptions,
  SearchResult,
  QueryResponse,
  FtsSearchRequest,
  FtsSearchResponse,
  ContextAssembly,
  PruningSuggestion,
  PruneResponse,
  LabelSuggestion,
  LabelSuggestResponse,
  SummarizeRequest,
  SummaryResponse,
  HealthStatus,
  Metrics,
  CountResponse,
  ExecutePruneRequest,
  Message,
} from './types';
import {
  SekhaError,
  SekhaNotFoundError,
  SekhaValidationError,
  SekhaAPIError,
  SekhaAuthError,
  SekhaConnectionError,
} from './errors';

/**
 * Rate limiter for client-side request throttling
 */
class RateLimiter {
  private requests: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 1000, windowSec: number = 60) {
    this.limit = limit;
    this.windowMs = windowSec * 1000;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    
    // Remove expired timestamps
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.limit) {
      // Calculate wait time
      const oldestRequest = this.requests[0];
      const waitMs = this.windowMs - (now - oldestRequest);
      
      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
        return this.acquire(); // Retry after waiting
      }
    }

    this.requests.push(now);
  }
}

/**
 * Exponential backoff for retry logic
 */
class ExponentialBackoff {
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly factor: number;

  constructor(baseDelay: number = 500, maxDelay: number = 10000, factor: number = 2) {
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.factor = factor;
  }

  async wait(attempt: number): Promise<void> {
    const delay = Math.min(
      this.baseDelay * Math.pow(this.factor, attempt),
      this.maxDelay
    );
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Main Memory Controller client for Sekha API
 * 
 * @example
 * ```
 * const memory = new MemoryController({
 *   apiKey: 'sk-...',
 *   baseURL: 'http://localhost:8080'
 * });
 * 
 * // Store conversation
 * await memory.store({
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   label: 'Greeting',
 *   folder: '/personal'
 * });
 * 
 * // Search
 * const results = await memory.query('token limits', { limit: 5 });
 * ```
 */
export class MemoryController {
  private config: Required<MemoryConfig>;
  private rateLimiter: RateLimiter;
  private backoff: ExponentialBackoff;

  constructor(config: MemoryConfig) {
    // Validate API key
    if (!config.apiKey || config.apiKey.length < 32) {
      throw new SekhaValidationError(
        'API key must be at least 32 characters',
        'Invalid API key format'
      );
    }

    // Validate URL
    try {
      new URL(config.baseURL);
    } catch {
      throw new SekhaValidationError(
        'Invalid baseURL',
        'baseURL must be a valid URL (e.g., http://localhost:8080 or https://api.sekha-ai.dev)'
      );
    }

    this.config = {
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      defaultLabel: config.defaultLabel ?? '',
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
      rateLimit: config.rateLimit ?? 1000,
    };

    this.rateLimiter = new RateLimiter(this.config.rateLimit, 60);
    this.backoff = new ExponentialBackoff();
  }

  // ============================================
  // Core CRUD Operations
  // ============================================

  /**
   * Store a new conversation
   * 
   * POST /api/v1/conversations
   * 
   * @param options - Conversation data with messages, label, and folder
   * @returns Created conversation with ID
   * 
   * @example
   * ```
   * const conv = await memory.store({
   *   messages: [
   *     { role: 'user', content: 'What is semantic search?' },
   *     { role: 'assistant', content: 'Semantic search...' }
   *   ],
   *   label: 'Learning: Semantic Search',
   *   folder: '/education',
   *   importanceScore: 8
   * });
   * ```
   */
  async store(options: CreateOptions): Promise<Conversation> {
    const { signal, ...bodyOptions } = options;
    return this.request('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(bodyOptions),
      signal,
    });
  }

  /**
   * Alias for store() - matches Python SDK
   */
  async create(options: CreateOptions): Promise<Conversation> {
    return this.store(options);
  }

  /**
   * Get a specific conversation by ID
   * 
   * GET /api/v1/conversations/{id}
   * 
   * @param id - Conversation UUID
   * @returns Full conversation data
   */
  async get(id: string): Promise<Conversation> {
    return this.request(`/api/v1/conversations/${id}`);
  }

  /**
   * Alias for get() - matches existing API
   */
  async getConversation(id: string): Promise<Conversation> {
    return this.get(id);
  }

  /**
   * List conversations with optional filters
   * 
   * GET /api/v1/conversations
   * 
   * @param filter - Filter options (label, folder, status, pagination)
   * @returns Array of conversations
   */
  async list(filter?: ListFilter): Promise<QueryResponse> {
    const params = new URLSearchParams();
    
    if (filter?.label) params.append('label', filter.label);
    if (filter?.folder) params.append('folder', filter.folder);
    if (filter?.pinned !== undefined) params.append('pinned', String(filter.pinned));
    if (filter?.archived !== undefined) params.append('archived', String(filter.archived));
    
    // Support both page/page_size and limit/offset
    if (filter?.page) params.append('page', filter.page.toString());
    if (filter?.page_size) params.append('page_size', filter.page_size.toString());
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.offset) params.append('offset', filter.offset.toString());

    const queryString = params.toString();
    const url = queryString 
      ? `/api/v1/conversations?${queryString}` 
      : '/api/v1/conversations';

    return this.request(url);
  }

  /**
   * Alias for list() - matches existing API
   */
  async listConversations(filter?: ListFilter): Promise<QueryResponse> {
    return this.list(filter);
  }

  /**
   * Update conversation label and/or folder
   * 
   * PUT /api/v1/conversations/{id}/label
   * 
   * @param id - Conversation UUID
   * @param label - New label
   * @param folder - New folder
   */
  async updateLabel(id: string, label: string, folder: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}/label`, {
      method: 'PUT',
      body: JSON.stringify({ label, folder }),
    });
  }

  /**
   * Update conversation folder only
   * 
   * PUT /api/v1/conversations/{id}/folder
   * 
   * @param id - Conversation UUID  
   * @param folder - New folder path
   */
  async updateFolder(id: string, folder: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}/folder`, {
      method: 'PUT',
      body: JSON.stringify({ folder }),
    });
  }

  /**
   * Generic update for other conversation fields
   * 
   * Note: Use specific methods (updateLabel, updateFolder, pin, archive) when available
   * 
   * @param id - Conversation UUID
   * @param updates - Fields to update
   */
  async update(
    id: string,
    updates: {
      label?: string;
      folder?: string;
      importanceScore?: number;
    }
  ): Promise<void> {
    // Use specific endpoints when available
    if (updates.label !== undefined && updates.folder !== undefined) {
      await this.updateLabel(id, updates.label, updates.folder);
    } else if (updates.folder !== undefined) {
      await this.updateFolder(id, updates.folder);
    }
    // Note: importanceScore update would need additional endpoint
  }

  /**
   * Delete a conversation
   * 
   * DELETE /api/v1/conversations/{id}
   * 
   * @param id - Conversation UUID
   */
  async delete(id: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Count conversations with optional filters
   * 
   * GET /api/v1/conversations/count
   * 
   * @param params - Optional label or folder filter
   * @returns Count of matching conversations
   * 
   * @example
   * ```
   * // Count all conversations
   * const total = await memory.count();
   * 
   * // Count by label
   * const labelCount = await memory.count({ label: 'Engineering' });
   * 
   * // Count by folder
   * const folderCount = await memory.count({ folder: '/work' });
   * ```
   */
  async count(params?: { label?: string; folder?: string }): Promise<CountResponse> {
    const searchParams = new URLSearchParams();
    if (params?.label) searchParams.append('label', params.label);
    if (params?.folder) searchParams.append('folder', params.folder);
    
    const queryString = searchParams.toString();
    const url = queryString 
      ? `/api/v1/conversations/count?${queryString}`
      : '/api/v1/conversations/count';
    
    return this.request(url);
  }

  // ============================================
  // Query & Search Operations
  // ============================================

  /**
   * Search conversations using semantic similarity
   * 
   * POST /api/v1/query (FIXED from /api/v1/search)
   * 
   * @param query - Search query string
   * @param options - Search options (limit, filters)
   * @returns Query response with results and pagination
   * 
   * @example
   * ```
   * const response = await memory.query('API design patterns', {
   *   limit: 10,
   *   filters: { label: 'Engineering' }
   * });
   * 
   * response.results.forEach(result => {
   *   console.log(`${result.label}: ${result.score}`);
   * });
   * ```
   */
  async query(query: string, options?: SearchOptions): Promise<QueryResponse> {
    const body: any = {
      query,
      limit: options?.limit ?? 10,
      offset: options?.offset ?? 0,
    };

    if (options?.filters) {
      body.filters = options.filters;
    }

    return this.request('/api/v1/query', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  }

  /**
   * Alias for query() - matches existing API
   */
  async search(query: string, options?: SearchOptions): Promise<QueryResponse> {
    return this.query(query, options);
  }

  /**
   * Full-text search using SQLite FTS5
   * 
   * POST /api/v1/search/fts
   * 
   * @param query - Search query string
   * @param limit - Maximum results (default 50)
   * @returns Full-text search results
   * 
   * @example
   * ```
   * const results = await memory.searchFTS('kubernetes deployment', 20);
   * results.results.forEach(msg => {
   *   console.log(`${msg.role}: ${msg.content}`);
   * });
   * ```
   */
  async searchFTS(query: string, limit?: number): Promise<FtsSearchResponse> {
    const body: FtsSearchRequest = {
      query,
      limit: limit ?? 50,
    };

    return this.request('/api/v1/search/fts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============================================
  // Advanced Memory Operations
  // ============================================

  /**
   * Assemble context for LLM with token budget
   * 
   * POST /api/v1/context/assemble (FIXED from /api/v1/query/smart)
   * 
   * @param options - Context assembly options
   * @returns Assembled messages with token estimate
   * 
   * @example
   * ```
   * const context = await memory.assembleContext({
   *   query: 'API design decisions',
   *   context_budget: 8000,
   *   preferred_labels: ['Engineering']
   * });
   * 
   * console.log(`Messages: ${context.messages.length}`);
   * console.log(`Tokens: ${context.estimated_tokens}`);
   * ```
   */
  async assembleContext(options: ContextOptions): Promise<ContextAssembly> {
    const body: any = {
      query: options.query,
      context_budget: options.context_budget ?? 8000,
    };

    if (options.preferred_labels) {
      body.preferred_labels = options.preferred_labels;
    }
    if (options.excluded_folders) {
      body.excluded_folders = options.excluded_folders;
    }

    return this.request('/api/v1/context/assemble', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: options.signal,
    });
  }

  /**
   * Generate hierarchical summary of a conversation
   * 
   * POST /api/v1/summarize
   * 
   * @param conversationId - Conversation UUID
   * @param level - Summary level (daily, weekly, monthly)
   * @returns Generated summary
   * 
   * @example
   * ```
   * const summary = await memory.summarize(conversationId, 'weekly');
   * console.log(summary.summary);
   * ```
   */
  async summarize(
    conversationId: string,
    level: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<SummaryResponse> {
    const body: SummarizeRequest = {
      conversation_id: conversationId,
      level,
    };

    return this.request('/api/v1/summarize', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Rebuild embeddings for all messages (async operation)
   * 
   * POST /api/v1/rebuild-embeddings
   * 
   * @returns Accepted (202) - operation runs in background
   * 
   * @example
   * ```
   * await memory.rebuildEmbeddings();
   * console.log('Embedding rebuild started in background');
   * ```
   */
  async rebuildEmbeddings(): Promise<void> {
    await this.request('/api/v1/rebuild-embeddings', {
      method: 'POST',
    });
  }

  // ============================================
  // Status Management Operations
  // ============================================

  /**
   * Pin a conversation (prevents auto-pruning, sets importance to 10)
   * 
   * PUT /api/v1/conversations/{id}/pin (FIXED from generic update)
   * 
   * @param id - Conversation UUID
   */
  async pin(id: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}/pin`, {
      method: 'PUT',
    });
  }

  /**
   * Archive a conversation
   * 
   * PUT /api/v1/conversations/{id}/archive (FIXED from generic update)
   * 
   * @param id - Conversation UUID
   */
  async archive(id: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}/archive`, {
      method: 'PUT',
    });
  }

  // ============================================
  // Pruning Operations
  // ============================================

  /**
   * Get pruning suggestions based on age and importance (dry run)
   * 
   * POST /api/v1/prune/dry-run (FIXED from /mcp/tools/memory_prune)
   * 
   * @param thresholdDays - Age threshold in days
   * @param importanceThreshold - Minimum importance score to keep (1-10)
   * @returns Pruning suggestions
   * 
   * @example
   * ```
   * const suggestions = await memory.getPruningSuggestions(60, 5.0);
   * 
   * for (const suggestion of suggestions.suggestions) {
   *   console.log(`Can prune: ${suggestion.conversation_label}`);
   *   console.log(`  Recommendation: ${suggestion.recommendation}`);
   *   console.log(`  Token savings: ${suggestion.token_estimate}`);
   * }
   * ```
   */
  async getPruningSuggestions(
    thresholdDays: number = 30,
    importanceThreshold: number = 5.0
  ): Promise<PruneResponse> {
    return this.request('/api/v1/prune/dry-run', {
      method: 'POST',
      body: JSON.stringify({
        threshold_days: thresholdDays,
        importance_threshold: importanceThreshold,
      }),
    });
  }

  /**
   * Execute pruning (archive specified conversations)
   * 
   * POST /api/v1/prune/execute
   * 
   * @param conversationIds - Array of conversation UUIDs to archive
   * 
   * @example
   * ```
   * const suggestions = await memory.getPruningSuggestions(60, 5.0);
   * const toArchive = suggestions.suggestions
   *   .filter(s => s.recommendation === 'archive')
   *   .map(s => s.conversation_id);
   * 
   * await memory.pruneExecute(toArchive);
   * console.log(`Archived ${toArchive.length} conversations`);
   * ```
   */
  async pruneExecute(conversationIds: string[]): Promise<void> {
    const body: ExecutePruneRequest = {
      conversation_ids: conversationIds,
    };

    await this.request('/api/v1/prune/execute', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============================================
  // AI-Powered Operations
  // ============================================

  /**
   * Get AI-powered label suggestions for a conversation
   * 
   * POST /api/v1/labels/suggest
   * 
   * @param id - Conversation UUID
   * @returns Label suggestions with confidence scores
   * 
   * @example
   * ```
   * const response = await memory.suggestLabels(conversationId);
   * 
   * response.suggestions.forEach(s => {
   *   console.log(`${s.label} (confidence: ${s.confidence})`);
   *   console.log(`  Reason: ${s.reason}`);
   * });
   * ```
   */
  async suggestLabels(id: string): Promise<LabelSuggestResponse> {
    return this.request('/api/v1/labels/suggest', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: id }),
    });
  }

  /**
   * Auto-apply label if AI confidence exceeds threshold
   * 
   * @param id - Conversation UUID
   * @param threshold - Minimum confidence to auto-apply (0-1)
   * @returns Applied label or null if no suggestion met threshold
   */
  async autoLabel(id: string, threshold: number = 0.7): Promise<string | null> {
    const response = await this.suggestLabels(id);

    for (const suggestion of response.suggestions) {
      if (suggestion.confidence >= threshold) {
        // Get current conversation to preserve folder
        const conv = await this.get(id);
        await this.updateLabel(id, suggestion.label, conv.folder);
        return suggestion.label;
      }
    }

    return null;
  }

  // ============================================
  // Export Operations
  // ============================================

  /**
   * Export conversations to markdown or JSON
   * 
   * Note: Controller uses MCP endpoint /mcp/tools/memory_export for single conversation
   * This implementation may need adjustment based on actual controller behavior
   * 
   * @param options - Export options (label filter, format)
   * @returns Exported content as string
   * 
   * @example
   * ```
   * // Export specific conversation
   * const markdown = await memory.export({ 
   *   conversation_id: id,
   *   format: 'json' 
   * });
   * ```
   */
  async export(options: ExportOptions = {}): Promise<any> {
    // If exporting single conversation, use conversation_id in body
    if (options.conversation_id) {
      const body: any = {
        conversation_id: options.conversation_id,
        format: options.format ?? 'json',
        include_metadata: options.include_metadata ?? true,
      };

      return this.request('/mcp/tools/memory_export', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    }

    // Otherwise use query params for filtering
    const params = new URLSearchParams();
    if (options.label) params.append('label', options.label);
    params.append('format', options.format || 'markdown');

    return this.request(`/api/v1/export?${params.toString()}`);
  }

  /**
   * Export with streaming for large datasets
   * 
   * @param options - Export options
   * @returns Async iterable of content chunks
   * 
   * @example
   * ```
   * const stream = memory.exportStream({ format: 'markdown' });
   * 
   * for await (const chunk of stream) {
   *   process.stdout.write(chunk);
   * }
   * ```
   */
  exportStream(options: ExportOptions = {}): AsyncIterable<string> {
    const self = this;

    return {
      [Symbol.asyncIterator]: async function* () {
        const content = await self.export(options);
        const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
        const chunkSize = 1024;

        for (let i = 0; i < contentStr.length; i += chunkSize) {
          yield contentStr.slice(i, Math.min(i + chunkSize, contentStr.length));
        }
      },
    };
  }

  /**
   * Get full conversation context (alias for get)
   * 
   * @param id - Conversation UUID
   * @returns Full conversation data
   */
  async getContext(id: string): Promise<Conversation> {
    return this.get(id);
  }

  // ============================================
  // Health & Diagnostics
  // ============================================

  /**
   * Check Sekha Controller health
   * 
   * GET /health
   * 
   * @returns Health status information
   */
  async health(): Promise<HealthStatus> {
    return this.request('/health');
  }

  /**
   * Get system metrics
   * 
   * GET /metrics
   * 
   * @returns Metrics data (currently returns "not_implemented")
   */
  async getMetrics(): Promise<Metrics> {
    return this.request('/metrics');
  }

  /**
   * List available MCP tools
   * 
   * @returns Array of MCP tool definitions
   */
  async getMCPTools(): Promise<any[]> {
    return this.request('/mcp/tools');
  }

  // ============================================
  // Internal Request Handler
  // ============================================

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async request(
    endpoint: string,
    options: RequestInit & { retryCount?: number } = {}
  ): Promise<any> {
    const retryCount = options.retryCount || 0;

    // Rate limiting
    await this.rateLimiter.acquire();

    // Build URL
    const url = `${this.config.baseURL}${endpoint}`;

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    // Merge signals if user provided one
    const signal = options.signal
      ? this.mergeSignals([controller.signal, options.signal])
      : controller.signal;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': 'Sekha-JS-SDK/1.0.0',
          ...options.headers,
        },
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
      
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error.name === 'AbortError') {
        throw new SekhaConnectionError(
          `Request timed out after ${this.config.timeout}ms`
        );
      }

      // Retry on network errors
      if (
        retryCount < this.config.maxRetries &&
        this.isRetryableError(error)
      ) {
        await this.backoff.wait(retryCount);
        return this.request(endpoint, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      // Re-throw Sekha errors
      if (error instanceof SekhaError) {
        throw error;
      }

      // Wrap unknown errors
      throw new SekhaConnectionError(`Request failed: ${error.message}`);
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: any;
    
    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : { error: 'Unknown error' };
    } catch {
      errorData = { error: 'Failed to parse error response' };
    }

    const message = errorData.error || errorData.message || 'Unknown error';

    switch (response.status) {
      case 400:
        throw new SekhaValidationError(message, JSON.stringify(errorData));
        
      case 401:
      case 403:
        throw new SekhaAuthError('Authentication failed. Check your API key.');
        
      case 404:
        throw new SekhaNotFoundError(message);
        
      case 429:
        throw new SekhaAPIError(
          'Rate limit exceeded. Please slow down.',
          response.status,
          JSON.stringify(errorData)
        );
        
      default:
        throw new SekhaAPIError(
          message,
          response.status,
          JSON.stringify(errorData)
        );
    }
  }

  /**
   * Check if error is retryable (network errors, timeouts, 5xx)
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof SekhaAuthError) return false;
    if (error instanceof SekhaValidationError) return false;
    if (error instanceof SekhaNotFoundError) return false;
    
    return true;
  }

  /**
   * Merge multiple AbortSignals
   */
  private mergeSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }

    return controller.signal;
  }
}

/**
 * Convenience alias for MemoryController
 * 
 * @example
 * ```
 * import { Sekha } from '@sekha/sdk';
 * 
 * const memory = new Sekha({ apiKey: 'sk-...' });
 * ```
 */
export class Sekha extends MemoryController {}

/**
 * Default export - MemoryController
 */
export default MemoryController;
