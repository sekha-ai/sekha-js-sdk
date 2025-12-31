// Core models
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Conversation {
  id: string;
  label: string;
  folder?: string;
  messages: Message[];
  status: 'active' | 'archived' | 'pinned';
  importanceScore?: number;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
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
  status?: string;
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  limit?: number;
  labels?: string[];
  signal?: AbortSignal;
}

export interface ContextOptions {
  query: string;
  tokenBudget?: number;
  labels?: string[];
  signal?: AbortSignal;
}

export interface ExportOptions {
  label?: string;
  format?: 'markdown' | 'json';
}

export interface SearchResult {
  id: string;
  conversationId: string;
  label: string;
  content: string;
  messages?: Message[];
  score: number;
  similarity: number;
  status: string;
  importanceScore: number;
  createdAt: string;
}

export interface ContextAssembly {
  formattedContext: string;
  estimatedTokens: number;
  conversations?: Conversation[];
}

// NEW: Advanced features
export interface PruningSuggestion {
  conversationId: string;
  label: string;
  ageDays: number;
  importanceScore: number;
  reason: string;
}

export interface LabelSuggestion {
  label: string;
  confidence: number;
  reasoning?: string;
}

export interface HealthStatus {
  status: string;
  version?: string;
  databaseOk?: boolean;
  vectorDbOk?: boolean;
  llmBridgeOk?: boolean;
}

// Module 6.4 query result
export interface QueryResult extends SearchResult {
  relevance: number;
  contextSnippet: string;
}

// MemoryConfig - Module 8.2 exact spec
export interface MemoryConfig {
  baseURL: string;
  apiKey: string;
  defaultLabel?: string;
  timeout?: number;
}
