// Core clients
export { MemoryController, Sekha } from './client';
export { MCPClient, createMCPClient } from './mcp';
export { BridgeClient } from './bridge';
export { SekhaClient, createSekhaClient } from './unified';

// Types
export * from './types';
export * from './errors';

// MCP types
export type {
  McpToolResponse,
  MemoryStoreArgs,
  MemorySearchArgs,
  MemorySearchResult,
  MemoryUpdateArgs,
  MemoryPruneArgs,
  MemoryExportArgs,
  MemoryStatsArgs,
  MemoryStatsResponse,
  MCPConfig,
} from './mcp';

// Bridge types
export type {
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  CompletionChoice,
  CompletionUsage,
  CompletionChunk,
  StreamChoice,
  EmbedRequest,
  EmbedResponse,
  SummarizeRequest,
  SummarizeResponse,
  ExtractRequest,
  ExtractResponse,
  ExtractedEntity,
  ScoreRequest,
  ScoreResponse,
  BridgeHealthStatus,
  BridgeConfig,
} from './bridge';

// Unified types
export type { SekhaConfig } from './unified';

// Default export (unified client)
export { SekhaClient as default } from './unified';
