/**
 * Complete Type Definitions for Sekha SDK
 * 
 * All types match controller (Rust) and bridge (Python) exactly.
 * Organized by domain: Core, API, MCP, Bridge, Utilities
 * 
 * @module @sekha/sdk/types
 */

// ============================================
// CORE MODELS
// ============================================

/**
 * Content part for multi-modal messages (text + images)
 * Matches controller ContentPart enum
 */
export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: ImageUrl };

/**
 * Image URL with optional detail level for vision models
 */
export interface ImageUrl {
  /** URL to image (http/https) or base64 data URI */
  url: string;
  /** Detail level: 'low' | 'high' | 'auto' */
  detail?: string;
}

/**
 * Message content - either simple text or multi-modal parts
 * Matches controller MessageContent enum
 */
export type MessageContent = string | ContentPart[];

/**
 * Message in a conversation
 * Supports both simple text and multi-modal content (text + images)
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  /** Content can be simple string or array of content parts */
  content: MessageContent;
  timestamp?: string;
  metadata?: Record<string, any>;
}

/**
 * Conversation status
 */
export type ConversationStatus = 'active' | 'archived' | 'pinned';

/**
 * Conversation type matching controller ConversationResponse
 * All fields match src/api/dto.rs exactly
 */
export interface Conversation {
  id: string;
  label: string;
  folder: string; // Required in controller
  status: ConversationStatus;
  message_count: number; // snake_case from controller
  created_at: string; // ISO 8601 datetime
  updated_at?: string; // Optional in some responses
  importance_score?: number; // Optional, 1-10
  word_count?: number; // Optional
  session_count?: number; // Optional
}

// ============================================
// CONFIGURATION
// ============================================

/**
 * Memory controller configuration
 */
export interface MemoryConfig {
  baseURL: string;
  apiKey: string;
  defaultLabel?: string;
  timeout?: number;
  maxRetries?: number;
  rateLimit?: number;
}

// ============================================
// REQUEST TYPES
// ============================================

/**
 * Create conversation options
 */
export interface CreateOptions {
  messages: Message[];
  label: string;
  folder?: string;
  importanceScore?: number;
  metadata?: Record<string, any>;
  signal?: AbortSignal;
}

/**
 * List/filter options for conversations
 */
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

/**
 * Search options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  labels?: string[];
  filters?: Record<string, any>;
  signal?: AbortSignal;
}

/**
 * Context assembly options
 */
export interface ContextOptions {
  query: string;
  preferred_labels?: string[];
  context_budget?: number; // Token budget
  excluded_folders?: string[];
  signal?: AbortSignal;
}

/**
 * Export options
 */
export interface ExportOptions {
  label?: string;
  format?: 'markdown' | 'json';
  conversation_id?: string; // For single conversation export
  include_metadata?: boolean;
}

/**
 * Update label request
 */
export interface UpdateLabelRequest {
  label: string;
  folder: string; // Required - preserves folder structure
}

/**
 * Update folder request
 */
export interface UpdateFolderRequest {
  folder: string;
}

/**
 * Query request
 */
export interface QueryRequest {
  query: string;
  filters?: any;
  limit?: number;
  offset?: number;
}

/**
 * Full-text search request
 */
export interface FtsSearchRequest {
  query: string;
  limit?: number;
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

/**
 * Summarize request
 */
export interface SummarizeRequest {
  conversation_id: string;
  level: 'daily' | 'weekly' | 'monthly';
}

/**
 * Prune request
 */
export interface PruneRequest {
  threshold_days: number;
  importance_threshold?: number;
}

/**
 * Execute prune request
 */
export interface ExecutePruneRequest {
  conversation_ids: string[];
}

/**
 * Label suggest request
 */
export interface LabelSuggestRequest {
  conversation_id: string;
}

/**
 * Rebuild embeddings request
 */
export interface RebuildEmbeddingsRequest {}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Search result matching controller SearchResultDto
 */
export interface SearchResult {
  conversation_id: string;
  message_id: string;
  score: number;
  content: string;
  metadata: Record<string, any>;
  label: string;
  folder: string;
  timestamp: string; // ISO 8601
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
 * Full-text search response
 */
export interface FtsSearchResponse {
  results: FtsMessage[];
  total: number;
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
 * Pruning recommendation type
 */
export type PruneRecommendation = 'archive' | 'keep' | 'review';

/**
 * Pruning suggestion from controller
 */
export interface PruningSuggestion {
  conversation_id: string;
  conversation_label: string;
  last_accessed: string; // ISO 8601
  message_count: number;
  token_estimate: number;
  importance_score: number;
  preview: string;
  recommendation: PruneRecommendation;
}

/**
 * Prune dry-run response
 */
export interface PruneResponse {
  suggestions: PruningSuggestion[];
  total: number;
  estimated_token_savings?: number; // Optional aggregate
}

/**
 * Label suggestion from AI
 */
export interface LabelSuggestion {
  label: string;
  confidence: number; // 0-1
  is_existing: boolean; // Whether label already exists
  reason: string; // AI explanation
}

/**
 * Label suggest response
 */
export interface LabelSuggestResponse {
  conversation_id: string;
  suggestions: LabelSuggestion[];
}

/**
 * Summary response
 */
export interface SummaryResponse {
  conversation_id: string;
  level: string;
  summary: string;
  generated_at: string; // ISO 8601
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
 * Error response
 */
export interface ErrorResponse {
  error: string;
  code: number;
}

/**
 * Rebuild embeddings response
 */
export interface RebuildEmbeddingsResponse {
  success: boolean;
  message: string;
  estimated_completion_seconds: number;
}

/**
 * Metrics response (placeholder - controller returns "not_implemented")
 */
export interface Metrics {
  metrics: string;
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

// ============================================
// MCP (Model Context Protocol) TYPES
// ============================================

/**
 * Standard MCP tool response wrapper
 */
export interface McpToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * MCP memory store request
 */
export interface MemoryStoreRequest {
  label: string;
  folder: string;
  messages: Message[];
}

/**
 * MCP memory query request
 */
export interface MemoryQueryRequest {
  query: string;
  filters?: any;
  limit?: number;
}

/**
 * MCP memory query response
 */
export interface MemoryQueryResponse {
  success: boolean;
  data: QueryResponse;
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

/**
 * Filter parameters for searches
 */
export interface FilterParams {
  labels?: string[];
  folder?: string;
  status?: ConversationStatus;
  importance_min?: number;
  importance_max?: number;
  date_from?: string;
  date_to?: string;
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: 'created_at' | 'updated_at' | 'importance_score' | 'message_count';
  order: 'asc' | 'desc';
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if content is multi-modal (has images)
 */
export function isMultiModalContent(
  content: MessageContent
): content is ContentPart[] {
  return Array.isArray(content);
}

/**
 * Check if content part is text
 */
export function isTextPart(part: ContentPart): part is { type: 'text'; text: string } {
  return part.type === 'text';
}

/**
 * Check if content part is image
 */
export function isImagePart(
  part: ContentPart
): part is { type: 'image_url'; image_url: ImageUrl } {
  return part.type === 'image_url';
}

/**
 * Extract text from message content
 */
export function extractText(content: MessageContent): string {
  if (typeof content === 'string') {
    return content;
  }

  return content
    .filter(isTextPart)
    .map(part => part.text)
    .join(' ');
}

/**
 * Extract image URLs from message content
 */
export function extractImageUrls(content: MessageContent): string[] {
  if (typeof content === 'string') {
    return [];
  }

  return content
    .filter(isImagePart)
    .map(part => part.image_url.url);
}

/**
 * Check if message has images
 */
export function hasImages(message: Message): boolean {
  return extractImageUrls(message.content).length > 0;
}

/**
 * Validate conversation status
 */
export function isValidStatus(status: string): status is ConversationStatus {
  return ['active', 'archived', 'pinned'].includes(status);
}

/**
 * Validate prune recommendation
 */
export function isValidRecommendation(
  rec: string
): rec is PruneRecommendation {
  return ['archive', 'keep', 'review'].includes(rec);
}

// ============================================
// LEGACY ALIASES (for backward compatibility)
// ============================================

/**
 * @deprecated Use Conversation instead
 */
export type ConversationDto = Conversation;

/**
 * @deprecated Use SearchResult instead
 */
export type SearchResultDto = SearchResult;

/**
 * @deprecated Use PruningSuggestion instead
 */
export type PruningSuggestionDto = PruningSuggestion;

/**
 * @deprecated Use LabelSuggestion instead
 */
export type LabelSuggestionDto = LabelSuggestion;
