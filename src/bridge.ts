/**
 * Bridge Client for Sekha LLM Operations
 * 
 * Direct access to LLM Bridge endpoints for completions, embeddings,
 * summarization, and other LLM operations.
 * 
 * @module @sekha/sdk/bridge
 */

import { Message as _Message } from './types';
import {
  SekhaError,
  SekhaValidationError,
  SekhaAPIError,
  SekhaAuthError,
  SekhaConnectionError,
} from './errors';

// ============================================
// Bridge Types
// ============================================

/**
 * Chat message for completions
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Completion request
 */
export interface CompletionRequest {
  model?: string;
  messages: ChatMessage[];
  temperature?: number; // 0-2, default 0.7
  max_tokens?: number; // Max tokens to generate
  stream?: boolean; // Enable streaming
}

/**
 * Completion response
 */
export interface CompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number; // Unix timestamp
  model: string;
  choices: CompletionChoice[];
  usage: CompletionUsage;
}

/**
 * Single completion choice
 */
export interface CompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
}

/**
 * Token usage info
 */
export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Streaming completion chunk
 */
export interface CompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: StreamChoice[];
}

/**
 * Streaming choice delta
 */
export interface StreamChoice {
  index: number;
  delta: {
    role?: 'assistant';
    content?: string;
  };
  finish_reason: 'stop' | 'length' | null;
}

/**
 * Embed request
 */
export interface EmbedRequest {
  text: string;
  model?: string; // Optional model override
}

/**
 * Embed response
 */
export interface EmbedResponse {
  embedding: number[]; // Vector embedding
  model: string;
  dimension: number;
  tokens_used: number;
}

/**
 * Summarize request
 */
export interface SummarizeRequest {
  messages: string[]; // Message contents to summarize
  level: 'daily' | 'weekly' | 'monthly';
  model?: string;
  max_words?: number;
}

/**
 * Summarize response
 */
export interface SummarizeResponse {
  summary: string;
  level: string;
  model: string;
  message_count: number;
  tokens_used: number;
}

/**
 * Entity extraction request
 */
export interface ExtractRequest {
  text: string;
  model?: string;
}

/**
 * Entity extraction response
 */
export interface ExtractResponse {
  entities: ExtractedEntity[];
  model: string;
  tokens_used: number;
}

/**
 * Extracted entity
 */
export interface ExtractedEntity {
  text: string;
  type: string; // person, organization, location, etc.
  confidence: number; // 0-1
}

/**
 * Importance score request
 */
export interface ScoreRequest {
  text: string;
  model?: string;
}

/**
 * Importance score response
 */
export interface ScoreResponse {
  score: number; // 1-10
  reasoning: string;
  model: string;
  tokens_used: number;
}

/**
 * Bridge health status
 */
export interface BridgeHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  ollama_status?: {
    status: string;
    models_available?: string[];
  };
  models_loaded?: string[];
}

/**
 * Bridge client configuration
 */
export interface BridgeConfig {
  baseURL: string;
  apiKey?: string; // Optional API key for authentication
  timeout?: number;
  maxRetries?: number;
}

// ============================================
// Bridge Client
// ============================================

/**
 * Bridge Client for LLM operations
 * 
 * Provides direct access to Sekha LLM Bridge for completions, embeddings,
 * summarization, entity extraction, and importance scoring.
 * 
 * @example
 * ```typescript
 * const bridge = new BridgeClient({
 *   baseURL: 'http://localhost:5001'
 * });
 * 
 * // Chat completion
 * const completion = await bridge.complete({
 *   messages: [
 *     { role: 'user', content: 'What is TypeScript?' }
 *   ]
 * });
 * console.log(completion.choices[0].message.content);
 * 
 * // Streaming completion
 * for await (const chunk of bridge.streamComplete({
 *   messages: [{ role: 'user', content: 'Tell me a story' }]
 * })) {
 *   process.stdout.write(chunk.choices[0]?.delta?.content || '');
 * }
 * 
 * // Generate embedding
 * const embed = await bridge.embed({ text: 'Hello world' });
 * console.log(`${embed.dimension}-dim vector`);
 * 
 * // Summarize messages
 * const summary = await bridge.summarize({
 *   messages: ['Discussed TypeScript', 'Reviewed code'],
 *   level: 'daily'
 * });
 * console.log(summary.summary);
 * ```
 */
export class BridgeClient {
  private config: Required<BridgeConfig>;

  constructor(config: BridgeConfig) {
    // Validate URL
    try {
      new URL(config.baseURL);
    } catch {
      throw new SekhaValidationError(
        'Invalid baseURL',
        'baseURL must be a valid URL'
      );
    }

    this.config = {
      baseURL: config.baseURL,
      apiKey: config.apiKey || '',
      timeout: config.timeout ?? 60000, // 60s for LLM operations
      maxRetries: config.maxRetries ?? 3,
    };
  }

  /**
   * Generate chat completion
   * 
   * POST /v1/chat/completions (OpenAI-compatible)
   * 
   * @param request - Completion request
   * @returns Completion response
   * 
   * @example
   * ```typescript
   * const response = await bridge.complete({
   *   model: 'llama3.1:8b',
   *   messages: [
   *     { role: 'system', content: 'You are a helpful assistant' },
   *     { role: 'user', content: 'Explain async/await' }
   *   ],
   *   temperature: 0.7,
   *   max_tokens: 500
 * });
   * 
   * console.log(response.choices[0].message.content);
   * console.log(`Tokens used: ${response.usage.total_tokens}`);
   * ```
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return this.request<CompletionResponse>(
      '/v1/chat/completions',
      {
        ...request,
        stream: false, // Ensure non-streaming
      } as unknown as Record<string, unknown>
    );
  }

  /**
   * Generate streaming chat completion
   * 
   * POST /v1/chat/completions with stream=true
   * Returns Server-Sent Events (SSE)
   * 
   * @param request - Completion request
   * @returns Async iterator of completion chunks
   * 
   * @example
   * ```typescript
   * const stream = bridge.streamComplete({
   *   messages: [{ role: 'user', content: 'Write a poem' }]
   * });
   * 
   * for await (const chunk of stream) {
   *   const content = chunk.choices[0]?.delta?.content;
   *   if (content) {
   *     process.stdout.write(content);
   *   }
   *   
   *   if (chunk.choices[0]?.finish_reason === 'stop') {
   *     break;
   *   }
   * }
   * ```
   */
  async *streamComplete(
    request: CompletionRequest
  ): AsyncIterableIterator<CompletionChunk> {
    const url = `${this.config.baseURL}/v1/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      if (!response.body) {
        throw new SekhaConnectionError('No response body for streaming');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          const data = line.slice(6); // Remove 'data: ' prefix
          
          if (data === '[DONE]') continue;

          try {
            const chunk: CompletionChunk = JSON.parse(data);
            yield chunk;
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SekhaConnectionError(
          `Stream timed out after ${this.config.timeout}ms`
        );
      }

      if (error instanceof SekhaError) {
        throw error;
      }

      throw new SekhaConnectionError(`Streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for text
   * 
   * POST /api/v1/embed
   * 
   * @param request - Embed request
   * @returns Embedding vector
   * 
   * @example
   * ```typescript
   * const response = await bridge.embed({
   *   text: 'Machine learning is fascinating',
   *   model: 'nomic-embed-text:latest'
   * });
   * 
   * console.log(`Dimension: ${response.dimension}`);
   * console.log(`Vector: ${response.embedding.slice(0, 5)}...`);
   * ```
   */
  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    return this.request<EmbedResponse>('/api/v1/embed', request as unknown as Record<string, unknown>);
  }

  /**
   * Generate hierarchical summary
   * 
   * POST /api/v1/summarize
   * 
   * @param request - Summarize request
   * @returns Summary text
   * 
   * @example
   * ```typescript
   * const response = await bridge.summarize({
   *   messages: [
   *     'User asked about TypeScript',
   *     'Assistant explained interfaces',
   *     'User requested examples'
   *   ],
   *   level: 'daily',
   *   max_words: 100
   * });
   * 
   * console.log(response.summary);
   * console.log(`Summarized ${response.message_count} messages`);
   * ```
   */
  async summarize(request: SummarizeRequest): Promise<SummarizeResponse> {
    if (!['daily', 'weekly', 'monthly'].includes(request.level)) {
      throw new SekhaValidationError(
        'Invalid summary level',
        'Level must be daily, weekly, or monthly'
      );
    }

    return this.request<SummarizeResponse>('/api/v1/summarize', request as unknown as Record<string, unknown>);
  }

  /**
   * Extract entities from text
   * 
   * POST /api/v1/extract
   * 
   * @param request - Extract request
   * @returns Extracted entities
   * 
   * @example
   * ```typescript
   * const response = await bridge.extract({
   *   text: 'Steve Jobs founded Apple in Cupertino'
   * });
   * 
   * response.entities.forEach(entity => {
   *   console.log(`${entity.text} (${entity.type}): ${entity.confidence}`);
   * });
   * ```
   */
  async extract(request: ExtractRequest): Promise<ExtractResponse> {
    return this.request<ExtractResponse>('/api/v1/extract', request as unknown as Record<string, unknown>);
  }

  /**
   * Score conversation importance
   * 
   * POST /api/v1/score
   * 
   * @param request - Score request
   * @returns Importance score (1-10)
   * 
   * @example
   * ```typescript
   * const response = await bridge.score({
   *   text: 'Critical: Production database is down!'
   * });
   * 
   * console.log(`Importance: ${response.score}/10`);
   * console.log(`Reasoning: ${response.reasoning}`);
   * ```
   */
  async score(request: ScoreRequest): Promise<ScoreResponse> {
    return this.request<ScoreResponse>('/api/v1/score', request as unknown as Record<string, unknown>);
  }

  /**
   * Health check
   * 
   * GET /health
   * 
   * @returns Health status
   * 
   * @example
   * ```typescript
   * const health = await bridge.health();
   * console.log(`Status: ${health.status}`);
   * console.log(`Models: ${health.models_loaded?.join(', ')}`);
   * ```
   */
  async health(): Promise<BridgeHealthStatus> {
    const url = `${this.config.baseURL}/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new SekhaConnectionError(
          `Health check timed out after ${this.config.timeout}ms`
        );
      }

      if (error instanceof SekhaError) {
        throw error;
      }

      throw new SekhaConnectionError(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make HTTP request to bridge
   */
  private async request<T>(
    endpoint: string,
    data: Record<string, unknown>,
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleError(response);
      }

      return await response.json();
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new SekhaConnectionError(
          `Request timed out after ${this.config.timeout}ms`
        );
      }

      // Retry on network errors
      if (
        retryCount < this.config.maxRetries &&
        this.isRetryableError(error)
      ) {
        await this.wait(Math.pow(2, retryCount) * 500);
        return this.request(endpoint, data, retryCount + 1);
      }

      // Re-throw Sekha errors
      if (error instanceof SekhaError) {
        throw error;
      }

      // Wrap unknown errors
      throw new SekhaConnectionError(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Sekha-JS-SDK-Bridge/1.0.0',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  /**
   * Handle HTTP error responses
   */
  private async handleError(response: Response): Promise<never> {
    let errorData: Record<string, unknown>;

    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: 'Failed to parse error response' };
    }

    const message = String(errorData.detail || errorData.error || 'Unknown error');

    switch (response.status) {
      case 400:
        throw new SekhaValidationError(message, JSON.stringify(errorData));

      case 401:
      case 403:
        throw new SekhaAuthError(
          'Bridge authentication failed. Check your API key.'
        );

      case 404:
        throw new SekhaAPIError(
          'Bridge endpoint not found',
          response.status,
          JSON.stringify(errorData)
        );

      case 503:
        throw new SekhaConnectionError(
          'Bridge service unavailable. Check if bridge is running.'
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
  private isRetryableError(error: unknown): boolean {
    if (error instanceof SekhaAuthError) return false;
    if (error instanceof SekhaValidationError) return false;

    return true;
  }

  /**
   * Wait helper for backoff
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
