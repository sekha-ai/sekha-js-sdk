/**
 * MCP (Model Context Protocol) Client for Sekha
 * 
 * Direct access to MCP tools endpoints for advanced use cases.
 * Most users should use MemoryController instead.
 * 
 * @module @sekha/sdk/mcp
 */

import { Message, MemoryConfig } from './types';
import {
  SekhaError,
  SekhaNotFoundError,
  SekhaValidationError,
  SekhaAPIError,
  SekhaAuthError,
  SekhaConnectionError,
} from './errors';

// ============================================
// MCP Types
// ============================================

/**
 * Standard MCP tool response
 */
export interface McpToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * memory_store arguments
 */
export interface MemoryStoreArgs {
  label: string;
  folder: string;
  messages: Message[];
  importance_score?: number;
}

/**
 * memory_search arguments
 */
export interface MemorySearchArgs {
  query: string;
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

/**
 * memory_search result
 */
export interface MemorySearchResult {
  conversation_id: string;
  message_id: string;
  score: number;
  content: string;
  label: string;
  folder: string;
  timestamp: string;
  metadata: Record<string, any>;
}

/**
 * memory_update arguments
 */
export interface MemoryUpdateArgs {
  conversation_id: string;
  label?: string;
  folder?: string;
  status?: string;
  importance_score?: number;
}

/**
 * memory_prune arguments
 */
export interface MemoryPruneArgs {
  threshold_days?: number;
  importance_threshold?: number;
}

/**
 * memory_prune suggestion
 */
export interface PruningSuggestion {
  conversation_id: string;
  conversation_label: string;
  last_accessed: string;
  message_count: number;
  token_estimate: number;
  importance_score: number;
  preview: string;
  recommendation: string;
}

/**
 * memory_export arguments
 */
export interface MemoryExportArgs {
  conversation_id: string;
  format?: 'json' | 'markdown';
  include_metadata?: boolean;
}

/**
 * memory_stats arguments
 */
export interface MemoryStatsArgs {
  folder?: string;
  label?: string;
}

/**
 * memory_stats response
 */
export interface MemoryStatsResponse {
  total_conversations: number;
  average_importance: number;
  folders?: string[];
  labels?: string[];
}

// ============================================
// MCP Client Configuration
// ============================================

export interface MCPConfig {
  baseURL: string;
  mcpApiKey?: string; // MCP has separate auth from REST API
  apiKey?: string; // Fallback to regular API key
  timeout?: number;
  maxRetries?: number;
}

/**
 * MCP Client for direct MCP tool access
 * 
 * Provides low-level access to Sekha's MCP (Model Context Protocol) tools.
 * For most use cases, use MemoryController instead.
 * 
 * @example
 * ```typescript
 * const mcp = new MCPClient({
 *   baseURL: 'http://localhost:8080',
 *   mcpApiKey: 'mcp-key-...'
 * });
 * 
 * // Store via MCP
 * const result = await mcp.memoryStore({
 *   label: 'Engineering',
 *   folder: '/work',
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 * 
 * // Get stats
 * const stats = await mcp.memoryStats({ folder: '/work' });
 * console.log(`Total: ${stats.data.total_conversations}`);
 * ```
 */
export class MCPClient {
  private config: Required<MCPConfig>;

  constructor(config: MCPConfig) {
    // Validate URL
    try {
      new URL(config.baseURL);
    } catch {
      throw new SekhaValidationError(
        'Invalid baseURL',
        'baseURL must be a valid URL'
      );
    }

    // Validate API key
    const apiKey = config.mcpApiKey || config.apiKey;
    if (!apiKey || apiKey.length < 16) {
      throw new SekhaValidationError(
        'MCP API key required',
        'Provide mcpApiKey or apiKey with at least 16 characters'
      );
    }

    this.config = {
      baseURL: config.baseURL,
      mcpApiKey: apiKey,
      apiKey: apiKey,
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * memory_store - Store a new conversation via MCP
   * 
   * POST /mcp/tools/memory_store
   * 
   * @param args - Store arguments
   * @returns MCP response with conversation ID
   * 
   * @example
   * ```typescript
   * const response = await mcp.memoryStore({
   *   label: 'Meeting Notes',
   *   folder: '/work/meetings',
   *   messages: [
   *     { role: 'user', content: 'Discussed Q1 planning' }
   *   ],
   *   importance_score: 8
   * });
   * 
   * console.log(response.data.conversation_id);
   * ```
   */
  async memoryStore(
    args: MemoryStoreArgs
  ): Promise<McpToolResponse<{ conversation_id: string; id: string; label: string; folder: string }>> {
    return this.request('/mcp/tools/memory_store', args);
  }

  /**
   * memory_search - Semantic search via MCP
   * 
   * POST /mcp/tools/memory_search
   * 
   * @param args - Search arguments
   * @returns MCP response with search results
   * 
   * @example
   * ```typescript
   * const response = await mcp.memorySearch({
   *   query: 'kubernetes configuration',
   *   limit: 10,
   *   filters: { label: 'Engineering' }
   * });
   * 
   * response.data.results.forEach(r => {
   *   console.log(`${r.label}: ${r.score}`);
   * });
   * ```
   */
  async memorySearch(
    args: MemorySearchArgs
  ): Promise<McpToolResponse<{ query: string; total_results: number; limit: number; results: MemorySearchResult[] }>> {
    return this.request('/mcp/tools/memory_search', args);
  }

  /**
   * memory_get_context - Get conversation context
   * 
   * POST /mcp/tools/memory_get_context
   * 
   * @param conversationId - Conversation UUID
   * @returns MCP response with conversation metadata
   * 
   * @example
   * ```typescript
   * const response = await mcp.memoryGetContext('123e4567-e89b-12d3-a456-426614174000');
   * console.log(response.data.label);
   * console.log(response.data.importance_score);
   * ```
   */
  async memoryGetContext(
    conversationId: string
  ): Promise<McpToolResponse<{
    conversation_id: string;
    label: string;
    status: string;
    folder: string;
    importance_score: number;
    word_count: number;
    session_count: number;
    created_at: string;
    updated_at: string;
  }>> {
    return this.request('/mcp/tools/memory_get_context', {
      conversation_id: conversationId,
    });
  }

  /**
   * memory_update - Update conversation fields
   * 
   * POST /mcp/tools/memory_update
   * 
   * @param args - Update arguments
   * @returns MCP response with updated fields
   * 
   * @example
   * ```typescript
   * const response = await mcp.memoryUpdate({
   *   conversation_id: '123',
   *   label: 'Updated Label',
   *   folder: '/new/folder',
   *   importance_score: 9
   * });
   * 
   * console.log(response.data.updated_fields);
   * ```
   */
  async memoryUpdate(
    args: MemoryUpdateArgs
  ): Promise<McpToolResponse<{ conversation_id: string; updated_fields: string[]; message: string }>> {
    return this.request('/mcp/tools/memory_update', args);
  }

  /**
   * memory_prune - Get pruning suggestions
   * 
   * POST /mcp/tools/memory_prune
   * 
   * @param args - Prune parameters
   * @returns MCP response with pruning suggestions
   * 
   * @example
   * ```typescript
   * const response = await mcp.memoryPrune({
   *   threshold_days: 60,
   *   importance_threshold: 5.0
   * });
   * 
   * console.log(`Found ${response.data.total_suggestions} candidates`);
   * console.log(`Potential savings: ${response.data.estimated_token_savings} tokens`);
   * 
   * response.data.suggestions.forEach(s => {
   *   if (s.recommendation === 'archive') {
   *     console.log(`Can archive: ${s.conversation_label}`);
   *   }
   * });
   * ```
   */
  async memoryPrune(
    args?: MemoryPruneArgs
  ): Promise<McpToolResponse<{
    threshold_days: number;
    importance_threshold: number;
    total_suggestions: number;
    estimated_token_savings: number;
    suggestions: PruningSuggestion[];
  }>> {
    return this.request('/mcp/tools/memory_prune', {
      threshold_days: args?.threshold_days ?? 30,
      importance_threshold: args?.importance_threshold ?? 5.0,
    });
  }

  /**
   * memory_export - Export conversation
   * 
   * POST /mcp/tools/memory_export
   * 
   * @param args - Export arguments
   * @returns MCP response with exported data
   * 
   * @example
   * ```typescript
   * const response = await mcp.memoryExport({
   *   conversation_id: '123',
   *   format: 'json',
   *   include_metadata: true
   * });
   * 
   * console.log(response.data.conversation);
   * console.log(response.data.messages);
   * ```
   */
  async memoryExport(
    args: MemoryExportArgs
  ): Promise<McpToolResponse<{
    conversation: any;
    messages: Message[];
    format: string;
    include_metadata: boolean;
  }>> {
    return this.request('/mcp/tools/memory_export', {
      ...args,
      format: args.format ?? 'json',
      include_metadata: args.include_metadata ?? true,
    });
  }

  /**
   * memory_stats - Get memory statistics
   * 
   * POST /mcp/tools/memory_stats
   * 
   * Returns statistics for:
   * - Specific folder (when folder provided)
   * - Specific label (when label provided)
   * - Global stats (when neither provided)
   * 
   * @param args - Stats filter arguments
   * @returns MCP response with statistics
   * 
   * @example
   * ```typescript
   * // Global stats
   * const global = await mcp.memoryStats({});
   * console.log(`Total conversations: ${global.data.total_conversations}`);
   * console.log(`Folders: ${global.data.folders.join(', ')}`);
   * 
   * // Folder-specific stats
   * const folderStats = await mcp.memoryStats({ folder: '/work' });
   * console.log(`Work conversations: ${folderStats.data.total_conversations}`);
   * console.log(`Avg importance: ${folderStats.data.average_importance}`);
   * 
   * // Label-specific stats
   * const labelStats = await mcp.memoryStats({ label: 'Engineering' });
   * ```
   */
  async memoryStats(
    args?: MemoryStatsArgs
  ): Promise<McpToolResponse<MemoryStatsResponse>> {
    return this.request('/mcp/tools/memory_stats', args ?? {});
  }

  /**
   * Make MCP tool request
   */
  private async request<T>(
    endpoint: string,
    args: any,
    retryCount: number = 0
  ): Promise<McpToolResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.mcpApiKey}`,
          'User-Agent': 'Sekha-JS-SDK-MCP/1.0.0',
        },
        body: JSON.stringify(args),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      const data: McpToolResponse<T> = await response.json();

      // Check MCP-level success
      if (!data.success && data.error) {
        throw new SekhaAPIError(
          `MCP tool failed: ${data.error}`,
          response.status,
          JSON.stringify(data)
        );
      }

      return data;
      
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error.name === 'AbortError') {
        throw new SekhaConnectionError(
          `MCP request timed out after ${this.config.timeout}ms`
        );
      }

      // Retry on network errors
      if (
        retryCount < this.config.maxRetries &&
        this.isRetryableError(error)
      ) {
        await this.wait(Math.pow(2, retryCount) * 500);
        return this.request(endpoint, args, retryCount + 1);
      }

      // Re-throw Sekha errors
      if (error instanceof SekhaError) {
        throw error;
      }

      // Wrap unknown errors
      throw new SekhaConnectionError(`MCP request failed: ${error.message}`);
    }
  }

  /**
   * Handle HTTP error responses
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: any;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: 'Failed to parse error response' };
    }

    const message = errorData.error || errorData.message || 'Unknown error';

    switch (response.status) {
      case 400:
        throw new SekhaValidationError(message, JSON.stringify(errorData));
        
      case 401:
      case 403:
        throw new SekhaAuthError(
          'MCP authentication failed. Check your MCP API key.'
        );
        
      case 404:
        throw new SekhaNotFoundError(message);
        
      case 429:
        throw new SekhaAPIError(
          'Rate limit exceeded',
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
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof SekhaAuthError) return false;
    if (error instanceof SekhaValidationError) return false;
    if (error instanceof SekhaNotFoundError) return false;
    
    return true;
  }

  /**
   * Wait helper for backoff
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create MCP client from MemoryConfig
 * 
 * Helper to create MCPClient from existing MemoryConfig
 */
export function createMCPClient(config: MemoryConfig): MCPClient {
  return new MCPClient({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    timeout: config.timeout,
    maxRetries: config.maxRetries,
  });
}
