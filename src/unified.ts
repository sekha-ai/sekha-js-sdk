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
import { Message, MemoryConfig as _MemoryConfig } from './types';
import type {
  ChatMessage,
  CompletionRequest as _CompletionRequest,
  CompletionResponse,
  CompletionChunk,
} from './bridge';

// Rest of file unchanged...
