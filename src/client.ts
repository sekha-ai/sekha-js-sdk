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
  ContextAssembly,
  PruningSuggestion,
  LabelSuggestion,
  HealthStatus,
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
  // Core Operations
  // ============================================

  /**
   * Store a new conversation
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
    return this.request('/api/v1/conversations', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Alias for store() - matches Python SDK
   */
  async create(options: CreateOptions): Promise<Conversation> {
    return this.store(options);
  }

  /**
   * Search conversations using semantic similarity
   * 
   * @param query - Search query string
   * @param options - Search options (limit, labels, filters)
   * @returns Array of search results with similarity scores
   * 
   * @example
   * ```
   * const results = await memory.query('API design patterns', {
   *   limit: 10,
   *   labels: ['Engineering', 'Architecture']
   * });
   * 
   * results.forEach(result => {
   *   console.log(`${result.label}: ${result.score}`);
   * });
   * ```
   */
  async query(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const body: any = {
      query,
      limit: options?.limit || 10,
    };

    if (options?.labels && options.labels.length > 0) {
      body.filter_labels = options.labels;
    }

    const response = await this.request('/api/v1/search', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    return response.results || response;
  }

  /**
   * Alias for query() - matches existing API
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    return this.query(query, options);
  }

  /**
   * Get a specific conversation by ID
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
   * @param filter - Filter options (label, status, pagination)
   * @returns Array of conversations
   */
  async list(filter?: ListFilter): Promise<Conversation[]> {
    const params = new URLSearchParams();
    
    if (filter?.label) params.append('label', filter.label);
    if (filter?.status) params.append('status', filter.status);
    if (filter?.limit) params.append('limit', filter.limit.toString());
    if (filter?.offset) params.append('offset', filter.offset.toString());

    const queryString = params.toString();
    const url = queryString 
      ? `/api/v1/conversations?${queryString}` 
      : '/api/v1/conversations';

    const response = await this.request(url);
    return response.conversations || response;
  }

  /**
   * Alias for list() - matches existing API
   */
  async listConversations(filter?: ListFilter): Promise<Conversation[]> {
    return this.list(filter);
  }

  /**
   * Update conversation metadata
   * 
   * @param id - Conversation UUID
   * @param updates - Fields to update
   * @returns Updated conversation
   */
  async update(
    id: string,
    updates: {
      label?: string;
      folder?: string;
      importanceScore?: number;
      status?: 'active' | 'archived' | 'pinned';
    }
  ): Promise<Conversation> {
    return this.request(`/api/v1/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Update conversation label
   * 
   * @param id - Conversation UUID
   * @param label - New label
   * @param folder - Optional new folder
   */
  async updateLabel(id: string, label: string, folder?: string): Promise<void> {
    const body: any = { label };
    if (folder) body.folder = folder;

    await this.request(`/api/v1/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * Delete a conversation
   * 
   * @param id - Conversation UUID
   */
  async delete(id: string): Promise<void> {
    await this.request(`/api/v1/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================
  // Advanced Operations
  // ============================================

  /**
   * Pin a conversation (prevents auto-pruning)
   * 
   * @param id - Conversation UUID
   */
  async pin(id: string): Promise<void> {
    await this.update(id, { status: 'pinned' });
  }

  /**
   * Archive a conversation
   * 
   * @param id - Conversation UUID
   */
  async archive(id: string): Promise<void> {
    await this.update(id, { status: 'archived' });
  }

  /**
   * Get pruning suggestions based on age and importance
   * 
   * @param thresholdDays - Age threshold in days
   * @param importanceThreshold - Minimum importance score to keep (1-10)
   * @returns Array of pruning suggestions
   * 
   * @example
   * ```
   * const suggestions = await memory.getPruningSuggestions(60, 5.0);
   * 
   * for (const suggestion of suggestions) {
   *   console.log(`Can prune: ${suggestion.label}`);
   *   console.log(`  Age: ${suggestion.ageDays} days`);
   *   console.log(`  Importance: ${suggestion.importanceScore}/10`);
   *   console.log(`  Reason: ${suggestion.reason}`);
   * }
   * ```
   */
  async getPruningSuggestions(
    thresholdDays: number = 30,
    importanceThreshold: number = 5.0
  ): Promise<PruningSuggestion[]> {
    const response = await this.request('/mcp/tools/memory_prune', {
      method: 'POST',
      body: JSON.stringify({
        threshold_days: thresholdDays,
        importance_threshold: importanceThreshold,
      }),
    });

    return response.suggestions || [];
  }

  /**
   * Get AI-powered label suggestions for a conversation
   * 
   * @param id - Conversation UUID
   * @returns Array of label suggestions with confidence scores
   * 
   * @example
   * ```
   * const suggestions = await memory.suggestLabels(conversationId);
   * 
   * suggestions.forEach(s => {
   *   console.log(`${s.label} (confidence: ${s.confidence})`);
   * });
   * ```
   */
  async suggestLabels(id: string): Promise<LabelSuggestion[]> {
    const response = await this.request(
      `/api/v1/conversations/${id}/suggest-labels`,
      { method: 'POST' }
    );

    return response.suggestions || response;
  }

  /**
   * Auto-apply label if AI confidence exceeds threshold
   * 
   * @param id - Conversation UUID
   * @param threshold - Minimum confidence to auto-apply (0-1)
   * @returns Applied label or null if no suggestion met threshold
   */
  async autoLabel(id: string, threshold: number = 0.7): Promise<string | null> {
    const suggestions = await this.suggestLabels(id);

    for (const suggestion of suggestions) {
      if (suggestion.confidence >= threshold) {
        await this.updateLabel(id, suggestion.label);
        return suggestion.label;
      }
    }

    return null;
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

  /**
   * Assemble context for LLM with token budget
   * 
   * @param options - Context assembly options
   * @returns Formatted context with token estimate
   * 
   * @example
   * ```
   * const context = await memory.assembleContext({
   *   query: 'API design decisions',
   *   tokenBudget: 8000,
   *   labels: ['Engineering']
   * });
   * 
   * console.log(`Context: ${context.formattedContext}`);
   * console.log(`Tokens: ${context.estimatedTokens}`);
   * ```
   */
  async assembleContext(options: ContextOptions): Promise<ContextAssembly> {
    const body: any = {
      query: options.query,
      token_budget: options.tokenBudget || 8000,
    };

    if (options.labels) {
      body.labels = options.labels;
    }

    return this.request('/api/v1/query/smart', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: options.signal,
    });
  }

  /**
   * Export conversations to markdown or JSON
   * 
   * @param options - Export options (label filter, format)
   * @returns Exported content as string
   * 
   * @example
   * ```
   * // Export all conversations as markdown
   * const markdown = await memory.export({ format: 'markdown' });
   * 
   * // Export specific label as JSON
   * const json = await memory.export({ 
   *   label: 'Project:AI', 
   *   format: 'json' 
   * });
   * ```
   */
  async export(options: ExportOptions = {}): Promise<string> {
    const params = new URLSearchParams();
    
    if (options.label) params.append('label', options.label);
    params.append('format', options.format || 'markdown');

    const result = await this.request(`/api/v1/export?${params.toString()}`);
    return result.content || result;
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
        const chunkSize = 1024;

        for (let i = 0; i < content.length; i += chunkSize) {
          yield content.slice(i, Math.min(i + chunkSize, content.length));
        }
      },
    };
  }

  // ============================================
  // Health & Diagnostics
  // ============================================

  /**
   * Check Sekha Controller health
   * 
   * @returns Health status information
   */
  async health(): Promise<HealthStatus> {
    return this.request('/health');
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
