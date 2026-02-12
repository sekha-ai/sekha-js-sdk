// Core models
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Conversation type matching controller's actual response
 * All fields match src/api/routes.rs ConversationResponse
 */
export interface Conversation {
  id: string;
  label: string;
  folder: string; // Required in controller
  status: 'active' | 'archived' | 'pinned';
  message_count: number; // Controller returns message_count, not messageCount
  created_at: string; // Controller uses snake_case
  updated_at?: string; // Optional in some responses
  importance_score?: number; // Optional
  word_count?: number; // Optional
  session_count?: number; // Optional
}

export interface MemoryConfig {
  baseURL: string;
  apiKey: string;
  defaultLabel?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: number;
}

// API Options
export interface CreateOptions {
  messages: Message[];
  label: string;
  folder?: string;
  importanceScore?: number;
  metadata?: Record<string, any>;
  signal?: AbortSignal;
}

export interface ListFilter {
  label?: string;
  folder?: string;
  pinned?: boolean;
  archived?: boolean;
  page?: number;
  page_size?: number;
  limit?: number; // Alias for page_size
  offset?: number; // Alternative pagination
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  labels?: string[];
  filters?: Record<string, any>;
  signal?: AbortSignal;
}

export interface ContextOptions {
  query: string;
  preferred_labels?: string[];
  context_budget?: number; // Token budget
  excluded_folders?: string[];
  signal?: AbortSignal;
}

export interface ExportOptions {
  label?: string;
  format?: 'markdown' | 'json';
  conversation_id?: string; // For single conversation export
  include_metadata?: boolean;
}

/**
 * Search result matching controller's SearchResultDto
 */
export interface SearchResult {
  conversation_id: string;
  message_id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
  label: string;
  folder: string;
  timestamp: string;
}

/**
 * Query response with pagination
 */
export interface QueryResponse {
  results: SearchResult[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Full-text search request
 */
export interface FtsSearchRequest {
  query: string;
  limit?: number;
}

/**
 * Full-text search response
 */
export interface FtsSearchResponse {
  results: FtsMessage[];
  total: number;
}

/**
 * FTS message result
 */
export interface FtsMessage {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  timestamp: string;
  rank: number; // FTS rank/score
}

/**
 * Context assembly result
 */
export interface ContextAssembly {
  messages: Message[]; // Assembled messages for LLM context
  estimated_tokens?: number;
  conversations_used?: number;
}

/**
 * Pruning suggestion from controller
 */
export interface PruningSuggestion {
  conversation_id: string;
  conversation_label: string;
  last_accessed: string;
  message_count: number;
  token_estimate: number;
  importance_score: number;
  preview: string;
  recommendation: string; // 'archive' | 'keep' | 'review'
}

/**
 * Prune dry-run response
 */
export interface PruneResponse {
  suggestions: PruningSuggestion[];
  total: number;
}

/**
 * Label suggestion from AI
 */
export interface LabelSuggestion {
  label: string;
  confidence: number;
  is_existing: boolean;
  reason: string;
}

/**
 * Label suggest response
 */
export interface LabelSuggestResponse {
  conversation_id: string;
  suggestions: LabelSuggestion[];
}

/**
 * Summary request
 */
export interface SummarizeRequest {
  conversation_id: string;
  level: 'daily' | 'weekly' | 'monthly';
}

/**
 * Summary response
 */
export interface SummaryResponse {
  conversation_id: string;
  level: string;
  summary: string;
  generated_at: string;
}

/**
 * Health status response
 */
export interface HealthStatus {
  status: string;
  version: string;
  uptime_seconds: number;
}

/**
 * Metrics response
 */
export interface Metrics {
  metrics: string; // Currently returns "not_implemented"
  [key: string]: any; // Flexible for future metrics
}

/**
 * Count response
 */
export interface CountResponse {
  count: number;
  label?: string;
  folder?: string;
}

/**
 * Update label request
 */
export interface UpdateLabelRequest {
  label: string;
  folder: string;
}

/**
 * Update folder request
 */
export interface UpdateFolderRequest {
  folder: string;
}

/**
 * Execute prune request
 */
export interface ExecutePruneRequest {
  conversation_ids: string[];
}

/**
 * Context assemble request
 */
export interface ContextAssembleRequest {
  query: string;
  preferred_labels?: string[];
  context_budget?: number;
  excluded_folders?: string[];
}
