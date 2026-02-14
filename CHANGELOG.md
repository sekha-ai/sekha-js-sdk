# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-13

### 🚨 BREAKING CHANGES

#### Fixed API Endpoint Paths
Multiple methods were using incorrect API paths that didn't match the controller. All paths have been corrected:

- **`query()`**: Fixed from `/api/v1/search` → `/api/v1/query`
- **`assembleContext()`**: Fixed from `/api/v1/query/smart` → `/api/v1/context/assemble`
- **`getPruningSuggestions()`**: Fixed from `/mcp/tools/memory_prune` → `/api/v1/prune/dry-run`
- **`pin()`**: Fixed to use dedicated endpoint `/api/v1/conversations/{id}/pin`
- **`archive()`**: Fixed to use dedicated endpoint `/api/v1/conversations/{id}/archive`

#### Type Changes

- **`Conversation` interface**: Updated to match controller's exact format
- **`list()` return type**: Changed from `Conversation[]` to `QueryResponse`
- **`query()` return type**: Changed from `SearchResult[]` to `QueryResponse`
- **`updateLabel()`**: Now **requires** `folder` parameter

### ✨ Added

#### 🌟 NEW: Complete Type Safety (Phase 5)

Comprehensive TypeScript type system matching all controller and bridge types:

**50+ Type Definitions:**
- All controller DTOs from `src/api/dto.rs`
- Multi-modal message support (text + images)
- Pagination, filtering, search types
- Context assembly, pruning, summarization
- Label suggestions with AI confidence
- MCP tool request/response types
- Bridge LLM operation types

**Type Guards & Utilities:**
```typescript
import {
  isMultiModalContent,
  extractText,
  extractImageUrls,
  hasImages,
  isValidStatus
} from '@sekha/sdk';

// Multi-modal content handling
const message: Message = {
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'https://...' } }
  ]
};

if (isMultiModalContent(message.content)) {
  const text = extractText(message.content);
  const images = extractImageUrls(message.content);
  console.log(`Text: ${text}, Images: ${images.length}`);
}

// Status validation
if (isValidStatus(conversation.status)) {
  // TypeScript knows status is 'active' | 'archived' | 'pinned'
}
```

**Multi-Modal Message Support:**
```typescript
// Text-only message (backward compatible)
const textMessage: Message = {
  role: 'user',
  content: 'Hello world'
};

// Vision message with image
const visionMessage: Message = {
  role: 'user',
  content: [
    { type: 'text', text: 'Analyze this chart' },
    { 
      type: 'image_url',
      image_url: {
        url: 'https://example.com/chart.png',
        detail: 'high'
      }
    }
  ]
};
```

**Union Types:**
- `ConversationStatus = 'active' | 'archived' | 'pinned'`
- `PruneRecommendation = 'archive' | 'keep' | 'review'`
- `MessageContent = string | ContentPart[]`

**Deprecated Aliases (backward compatibility):**
- `ConversationDto` → Use `Conversation`
- `SearchResultDto` → Use `SearchResult`
- `PruningSuggestionDto` → Use `PruningSuggestion`

#### 🌟 NEW: BridgeClient (LLM Operations)

Direct access to Sekha LLM Bridge for completions, embeddings, and LLM operations.

**Installation:**
```typescript
import { BridgeClient } from '@sekha/sdk';

const bridge = new BridgeClient({
  baseURL: 'http://localhost:5001'
});
```

**Methods:**
- **`complete(request)`** - Chat completions (OpenAI-compatible)
- **`streamComplete(request)`** - Streaming completions with SSE
- **`embed(request)`** - Generate embeddings
- **`summarize(request)`** - Hierarchical summaries
- **`extract(request)`** - Entity extraction  
- **`score(request)`** - Importance scoring
- **`health()`** - Health check

**Example:**
```typescript
// Chat completion
const completion = await bridge.complete({
  messages: [{ role: 'user', content: 'Explain TypeScript' }]
});

// Streaming
for await (const chunk of bridge.streamComplete({ messages })) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// Embeddings
const embed = await bridge.embed({ text: 'Hello world' });
```

#### 🌟 NEW: SekhaClient (Unified Interface)

Combines MemoryController, MCPClient, and BridgeClient into single interface with high-level convenience methods.

**Installation:**
```typescript
import { SekhaClient } from '@sekha/sdk';

const sekha = new SekhaClient({
  controllerURL: 'http://localhost:8080',
  bridgeURL: 'http://localhost:5001',
  apiKey: 'your-api-key'
});
```

**Direct Access to All Clients:**
```typescript
// Use individual clients
await sekha.controller.list();
await sekha.mcp.memoryStats({});
await sekha.bridge.complete({ messages });
```

**High-Level Convenience Methods:**

1. **`storeAndQuery(messages, query, options)`** - Store then search
2. **`completeWithContext(prompt, contextQuery, options)`** - LLM + Memory context
3. **`completeWithMemory(prompt, searchQuery, options)`** - LLM + Search results
4. **`embedAndStore(messages, options)`** - Custom embedding + storage
5. **`streamWithContext(prompt, contextQuery, options)`** - Streaming with context
6. **`healthCheck()`** - Check all services

#### New REST API Endpoints

1. **`count(params?: { label?: string; folder?: string })`** - Count conversations
2. **`searchFTS(query: string, limit?: number)`** - Full-text search (SQLite FTS5)
3. **`rebuildEmbeddings()`** - Rebuild all embeddings
4. **`summarize(conversationId, level)`** - Generate summaries
5. **`pruneExecute(conversationIds)`** - Execute pruning
6. **`getMetrics()`** - System metrics
7. **`updateFolder(id, folder)`** - Update folder only

#### New MCP (Model Context Protocol) Client

Added dedicated `MCPClient` class with 7 MCP tools:
- `memoryStore()`, `memorySearch()`, `memoryGetContext()`
- `memoryUpdate()`, `memoryPrune()`, `memoryExport()`, `memoryStats()`

#### New Types (50+ interfaces)

**Core Types:**
- `Message`, `MessageContent`, `ContentPart`, `ImageUrl`
- `Conversation`, `ConversationStatus`
- `MemoryConfig`

**Request Types:**
- `CreateOptions`, `ListFilter`, `SearchOptions`
- `ContextOptions`, `ExportOptions`
- `UpdateLabelRequest`, `UpdateFolderRequest`
- `QueryRequest`, `FtsSearchRequest`
- `ContextAssembleRequest`, `SummarizeRequest`
- `PruneRequest`, `ExecutePruneRequest`
- `LabelSuggestRequest`, `RebuildEmbeddingsRequest`

**Response Types:**
- `SearchResult`, `QueryResponse`
- `FtsMessage`, `FtsSearchResponse`
- `ContextAssembly`
- `PruningSuggestion`, `PruneResponse`, `PruneRecommendation`
- `LabelSuggestion`, `LabelSuggestResponse`
- `SummaryResponse`
- `HealthStatus`, `ErrorResponse`
- `RebuildEmbeddingsResponse`
- `Metrics`, `CountResponse`

**MCP Types:**
- `McpToolResponse<T>`
- `MemoryStoreRequest`, `MemoryQueryRequest`, `MemoryQueryResponse`

**Bridge Types:**
- `ChatMessage`, `CompletionRequest`, `CompletionResponse`
- `CompletionChunk`, `StreamChoice`
- `EmbedRequest`, `EmbedResponse`
- `SummarizeRequest`, `SummarizeResponse`
- `ExtractRequest`, `ExtractResponse`, `ExtractedEntity`
- `ScoreRequest`, `ScoreResponse`
- `BridgeHealthStatus`, `BridgeConfig`

**Unified Types:**
- `SekhaConfig`

**Utility Types:**
- `PaginationParams`, `FilterParams`, `SortParams`
- `BulkOperationResult`
- Type guards: `isMultiModalContent`, `isTextPart`, `isImagePart`
- Helpers: `extractText`, `extractImageUrls`, `hasImages`
- Validators: `isValidStatus`, `isValidRecommendation`

### 🔧 Changed

- **`ContextOptions`**: Renamed fields to match controller
  - `tokenBudget` → `context_budget`
  - `labels` → `preferred_labels`
  - Added `excluded_folders`

- **`ContextAssembly`**: Updated structure
  - Now returns `messages: Message[]` instead of `formattedContext: string`
  - Added `conversations_used` field

- **`SearchResult`**: Updated fields to match controller exactly
  - All fields now use snake_case
  - Added `metadata` field

- **Response handling**: Now properly handles 204 No Content and 202 Accepted responses

### 🐛 Fixed

- Fixed `export()` to handle both single conversation and filtered exports
- Fixed `update()` to properly route to specific endpoints
- Fixed error handling for empty/null responses
- Fixed request body formatting to match controller expectations

### 📝 Documentation

- Added comprehensive JSDoc comments for all methods
- Added usage examples for all new endpoints and clients
- Added complete MCP, Bridge, and Unified client documentation
- Documented all 50+ type definitions
- Added type guard and utility function examples
- Updated README with complete API reference
- Added migration guide for breaking changes

### 🧪 Tests

- Added `tests/endpoints.test.ts` with coverage of new/fixed endpoints
- Added `tests/mcp.test.ts` with MCPClient coverage
- Updated `tests/client.test.ts` to match new API
- Added integration tests for complete workflows
- Added comprehensive error handling tests
- Added retry logic tests
- 88% pass rate (137 tests, 121 passing)

---

## [0.1.0] - 2025-01-15

### Added
- Initial release
- Core conversation management (CRUD)
- Semantic search
- Context assembly
- Label suggestions
- Export functionality
- Comprehensive error handling
- TypeScript support
- Browser and Node.js compatibility

[0.2.0]: https://github.com/sekha-ai/sekha-js-sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/sekha-ai/sekha-js-sdk/releases/tag/v0.1.0

---

## Migration Guide: 0.1.0 → 0.2.0

### Step 1: Choose Your Interface

**Option A: Unified Interface (Recommended for new projects)**
```typescript
import { SekhaClient } from '@sekha/sdk';

const sekha = new SekhaClient({
  controllerURL: 'http://localhost:8080',
  bridgeURL: 'http://localhost:5001',
  apiKey: 'your-key'
});

// Access all features
await sekha.controller.list();
await sekha.bridge.complete({ messages });
await sekha.completeWithContext('prompt', 'context');
```

**Option B: Individual Clients (More granular control)**
```typescript
import { MemoryController, MCPClient, BridgeClient } from '@sekha/sdk';

const controller = new MemoryController({ ... });
const mcp = new MCPClient({ ... });
const bridge = new BridgeClient({ ... });
```

### Step 2: Update Response Handling

```typescript
// BEFORE
const conversations = await memory.list();

// AFTER
const response = await memory.list();
const conversations = response.results;
console.log(`Total: ${response.total}`);
```

### Step 3: Update Type Definitions

```typescript
// BEFORE
interface Conversation {
  folder?: string;  // Optional
  messageCount?: number;  // camelCase
}

// AFTER
interface Conversation {
  folder: string;  // Required!
  message_count: number;  // snake_case
}
```

### Step 4: Leverage New Features

```typescript
// Use type guards
import { isMultiModalContent, extractText } from '@sekha/sdk';

if (isMultiModalContent(message.content)) {
  const text = extractText(message.content);
}

// Use Bridge for LLM operations
const completion = await bridge.complete({
  messages: [{ role: 'user', content: 'Hello' }]
});

// Use SekhaClient for workflows
const response = await sekha.completeWithMemory(
  'Explain our TypeScript architecture',
  'TypeScript'
);
```

### Breaking Change Checklist

- [ ] Update `list()` and `query()` calls to handle `QueryResponse`
- [ ] Add `folder` parameter to all `updateLabel()` calls
- [ ] Update type definitions for `Conversation` (snake_case fields)
- [ ] Update `assembleContext()` parameter names
- [ ] Use new type guards for multi-modal content
- [ ] (Optional) Migrate to `SekhaClient` for simplified workflows
- [ ] (Optional) Add `BridgeClient` for LLM operations
- [ ] Test with actual controller and bridge to verify all endpoints
