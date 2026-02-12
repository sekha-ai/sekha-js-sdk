/**
 * Sekha Unified Client
 * 
 * Single interface combining Controller, MCP, and Bridge clients
 * for complete Sekha ecosystem access.
 * 
 * @module @sekha/sdk/unified
 */

import { MemoryController } from './client';
import { MCPClient } from './mcp';
import { BridgeClient } from './bridge';
import { Message, MemoryConfig } from './types';
import type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
} from './bridge';

// ============================================
// Unified Configuration
// ============================================

/**
 * Unified Sekha configuration
 */
export interface SekhaConfig {
  /** Controller base URL (memory orchestration) */
  controllerURL: string;
  
  /** Controller API key */
  apiKey: string;
  
  /** Bridge base URL (LLM operations) */
  bridgeURL: string;
  
  /** Optional MCP API key (defaults to apiKey) */
  mcpApiKey?: string;
  
  /** Optional Bridge API key */
  bridgeApiKey?: string;
  
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  
  /** Max retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Default conversation label */
  defaultLabel?: string;
}

// ============================================
// Unified Client
// ============================================

/**
 * Unified Sekha Client
 * 
 * Combines MemoryController, MCPClient, and BridgeClient into a single
 * interface. Provides direct access to all three clients plus high-level
 * convenience methods for common workflows.
 * 
 * @example
 * ```typescript
 * const sekha = new SekhaClient({
 *   controllerURL: 'http://localhost:8080',
 *   bridgeURL: 'http://localhost:5001',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Use individual clients
 * const conversations = await sekha.controller.list();
 * const stats = await sekha.mcp.memoryStats({});
 * const completion = await sekha.bridge.complete({
 *   messages: [{ role: 'user', content: 'Hello' }]
 * });
 * 
 * // Or use convenience methods
 * const response = await sekha.completeWithMemory(
 *   'Explain what we discussed about TypeScript',
 *   'TypeScript'
 * );
 * ```
 */
export class SekhaClient {
  /** Memory Controller (REST API) */
  public controller: MemoryController;
  
  /** MCP Tools Client */
  public mcp: MCPClient;
  
  /** LLM Bridge Client */
  public bridge: BridgeClient;

  private config: SekhaConfig;

  constructor(config: SekhaConfig) {
    this.config = config;

    // Initialize Controller
    this.controller = new MemoryController({
      baseURL: config.controllerURL,
      apiKey: config.apiKey,
      defaultLabel: config.defaultLabel,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });

    // Initialize MCP Client
    this.mcp = new MCPClient({
      baseURL: config.controllerURL,
      mcpApiKey: config.mcpApiKey || config.apiKey,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });

    // Initialize Bridge Client
    this.bridge = new BridgeClient({
      baseURL: config.bridgeURL,
      apiKey: config.bridgeApiKey,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    });
  }

  /**
   * Store conversation and immediately search
   * 
   * Convenience method that stores messages then performs semantic search.
   * 
   * @param messages - Messages to store
   * @param query - Search query
   * @param options - Optional storage options
   * @returns Search results
   * 
   * @example
   * ```typescript
   * const results = await sekha.storeAndQuery(
   *   [
   *     { role: 'user', content: 'Explain TypeScript interfaces' },
   *     { role: 'assistant', content: 'Interfaces define object shapes...' }
   *   ],
   *   'TypeScript interfaces',
   *   { label: 'Engineering', folder: '/docs' }
   * );
   * 
   * console.log(`Found ${results.total} related conversations`);
   * ```
   */
  async storeAndQuery(
    messages: Message[],
    query: string,
    options?: {
      label?: string;
      folder?: string;
      importanceScore?: number;
    }
  ) {
    // Store conversation
    const conversation = await this.controller.store({
      messages,
      label: options?.label || this.config.defaultLabel || 'Conversation',
      folder: options?.folder || '/',
      importanceScore: options?.importanceScore,
    });

    // Search
    const results = await this.controller.query(query);

    return {
      conversation,
      results,
    };
  }

  /**
   * Assemble context and generate completion
   * 
   * Gets relevant context from memory and uses it in LLM completion.
   * 
   * @param prompt - User prompt
   * @param contextQuery - Query to find relevant context
   * @param options - Optional context and completion options
   * @returns LLM completion with context
   * 
   * @example
   * ```typescript
   * const response = await sekha.completeWithContext(
   *   'What were the main takeaways?',
   *   'meeting notes',
   *   {
   *     contextBudget: 4000,
   *     preferredLabels: ['Meetings'],
   *     temperature: 0.7
   *   }
   * );
   * 
   * console.log(response.choices[0].message.content);
   * console.log(`Used ${response.context.messages.length} context messages`);
   * ```
   */
  async completeWithContext(
    prompt: string,
    contextQuery: string,
    options?: {
      contextBudget?: number;
      preferredLabels?: string[];
      excludedFolders?: string[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<CompletionResponse & { context: any }> {
    // Assemble context from memory
    const context = await this.controller.assembleContext({
      query: contextQuery,
      context_budget: options?.contextBudget,
      preferred_labels: options?.preferredLabels,
      excluded_folders: options?.excludedFolders,
    });

    // Build messages with context
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Use the following context from previous conversations to answer the question.',
      },
      ...context.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Generate completion
    const completion = await this.bridge.complete({
      model: options?.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return {
      ...completion,
      context,
    };
  }

  /**
   * Search memory and use results in completion
   * 
   * Performs semantic search and includes results in LLM prompt.
   * Simpler than completeWithContext but less token-efficient.
   * 
   * @param prompt - User prompt
   * @param searchQuery - Query to search memory
   * @param options - Optional search and completion options
   * @returns LLM completion with search context
   * 
   * @example
   * ```typescript
   * const response = await sekha.completeWithMemory(
   *   'Summarize what we learned about TypeScript',
   *   'TypeScript',
   *   { limit: 5, temperature: 0.5 }
   * );
   * 
   * console.log(response.choices[0].message.content);
   * console.log(`Used ${response.searchResults.total} search results`);
   * ```
   */
  async completeWithMemory(
    prompt: string,
    searchQuery: string,
    options?: {
      limit?: number;
      labels?: string[];
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<CompletionResponse & { searchResults: any }> {
    // Search memory
    const searchResults = await this.controller.query(searchQuery, {
      limit: options?.limit || 5,
      labels: options?.labels,
    });

    // Build context from search results
    const contextText = searchResults.results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.label} (score: ${r.score.toFixed(2)}):\n${r.content}`
      )
      .join('\n\n');

    // Build messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Use the following search results from memory to answer the question.',
      },
      {
        role: 'system',
        content: `Search Results:\n${contextText}`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Generate completion
    const completion = await this.bridge.complete({
      model: options?.model,
      messages,
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
    });

    return {
      ...completion,
      searchResults,
    };
  }

  /**
   * Generate embedding and store conversation
   * 
   * Uses bridge to generate embedding, then stores with controller.
   * Useful when you want explicit control over embedding generation.
   * 
   * @param messages - Messages to store
   * @param options - Storage options
   * @returns Stored conversation
   * 
   * @example
   * ```typescript
   * const conversation = await sekha.embedAndStore(
   *   [
   *     { role: 'user', content: 'Explain async/await' },
   *     { role: 'assistant', content: 'async/await is...' }
   *   ],
   *   {
   *     label: 'JavaScript Concepts',
   *     folder: '/learning',
   *     embeddingModel: 'nomic-embed-text:latest'
   *   }
   * );
   * 
   * console.log(`Stored with ${conversation.embedding.dimension}-dim embedding`);
   * ```
   */
  async embedAndStore(
    messages: Message[],
    options: {
      label: string;
      folder?: string;
      importanceScore?: number;
      embeddingModel?: string;
    }
  ) {
    // Generate embedding for first user message
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) {
      throw new Error('No user message found to embed');
    }

    const embedding = await this.bridge.embed({
      text: firstUserMessage.content,
      model: options.embeddingModel,
    });

    // Store conversation
    const conversation = await this.controller.store({
      messages,
      label: options.label,
      folder: options.folder || '/',
      importanceScore: options.importanceScore,
    });

    return {
      ...conversation,
      embedding,
    };
  }

  /**
   * Streaming completion with memory context
   * 
   * Assembles context and streams LLM response.
   * 
   * @param prompt - User prompt
   * @param contextQuery - Query to find relevant context
   * @param options - Optional context and completion options
   * @returns Async iterator of completion chunks
   * 
   * @example
   * ```typescript
   * const stream = sekha.streamWithContext(
   *   'Explain our TypeScript architecture',
   *   'TypeScript architecture'
   * );
   * 
   * for await (const chunk of stream) {
   *   const content = chunk.choices[0]?.delta?.content;
   *   if (content) {
   *     process.stdout.write(content);
   *   }
   * }
   * ```
   */
  async *streamWithContext(
    prompt: string,
    contextQuery: string,
    options?: {
      contextBudget?: number;
      preferredLabels?: string[];
      model?: string;
      temperature?: number;
    }
  ): AsyncIterableIterator<CompletionChunk> {
    // Assemble context
    const context = await this.controller.assembleContext({
      query: contextQuery,
      context_budget: options?.contextBudget,
      preferred_labels: options?.preferredLabels,
    });

    // Build messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Use the following context to answer the question.',
      },
      ...context.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Stream completion
    yield* this.bridge.streamComplete({
      model: options?.model,
      messages,
      temperature: options?.temperature,
    });
  }

  /**
   * Health check for all services
   * 
   * Checks controller, bridge health simultaneously.
   * 
   * @returns Combined health status
   * 
   * @example
   * ```typescript
   * const health = await sekha.healthCheck();
   * console.log(`Controller: ${health.controller.status}`);
   * console.log(`Bridge: ${health.bridge.status}`);
   * ```
   */
  async healthCheck() {
    const [controllerHealth, bridgeHealth] = await Promise.allSettled([
      this.controller.health(),
      this.bridge.health(),
    ]);

    return {
      controller:
        controllerHealth.status === 'fulfilled'
          ? controllerHealth.value
          : { status: 'unhealthy', error: controllerHealth.reason },
      bridge:
        bridgeHealth.status === 'fulfilled'
          ? bridgeHealth.value
          : { status: 'unhealthy', error: bridgeHealth.reason },
    };
  }
}

/**
 * Create unified Sekha client
 * 
 * Convenience factory function.
 * 
 * @param config - Sekha configuration
 * @returns Initialized SekhaClient
 * 
 * @example
 * ```typescript
 * const sekha = createSekhaClient({
 *   controllerURL: 'http://localhost:8080',
 *   bridgeURL: 'http://localhost:5001',
 *   apiKey: 'your-api-key'
 * });
 * ```
 */
export function createSekhaClient(config: SekhaConfig): SekhaClient {
  return new SekhaClient(config);
}
