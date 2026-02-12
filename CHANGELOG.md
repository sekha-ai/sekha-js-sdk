# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-02-12

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
  - `messageCount` → `message_count` (snake_case)
  - `createdAt` → `created_at` (snake_case)
  - `folder` is now **required** (was optional)
  - Added `word_count`, `session_count` (optional fields)

- **`list()` return type**: Changed from `Conversation[]` to `QueryResponse`
  ```typescript
  // Old
  const convs: Conversation[] = await memory.list();
  
  // New
  const response: QueryResponse = await memory.list();
  const convs = response.results;
  console.log(`Total: ${response.total}, Page: ${response.page}`);
  ```

- **`query()` return type**: Changed from `SearchResult[]` to `QueryResponse`
  ```typescript
  // Old
  const results: SearchResult[] = await memory.query('test');
  
  // New  
  const response: QueryResponse = await memory.query('test');
  const results = response.results;
  ```

- **`updateLabel()`**: Now **requires** `folder` parameter
  ```typescript
  // Old
  await memory.updateLabel(id, 'New Label'); // ❌ Breaks
  
  // New
  await memory.updateLabel(id, 'New Label', '/folder'); // ✅ Required
  ```

### ✨ Added

#### New REST API Endpoints

1. **`count(params?: { label?: string; folder?: string })`** - Count conversations
   ```typescript
   const total = await memory.count();
   const labelCount = await memory.count({ label: 'Engineering' });
   const folderCount = await memory.count({ folder: '/work' });
   ```

2. **`searchFTS(query: string, limit?: number)`** - Full-text search using SQLite FTS5
   ```typescript
   const results = await memory.searchFTS('kubernetes deployment', 20);
   results.results.forEach(msg => console.log(msg.content));
   ```

3. **`rebuildEmbeddings()`** - Rebuild all embeddings (async operation)
   ```typescript
   await memory.rebuildEmbeddings();
   console.log('Embedding rebuild started in background');
   ```

4. **`summarize(conversationId: string, level: 'daily' | 'weekly' | 'monthly')`** - Generate summaries
   ```typescript
   const summary = await memory.summarize(id, 'weekly');
   console.log(summary.summary);
   ```

5. **`pruneExecute(conversationIds: string[])`** - Execute pruning (archive conversations)
   ```typescript
   const suggestions = await memory.getPruningSuggestions(60, 5.0);
   const toArchive = suggestions.suggestions
     .filter(s => s.recommendation === 'archive')
     .map(s => s.conversation_id);
   await memory.pruneExecute(toArchive);
   ```

6. **`getMetrics()`** - Get system metrics
   ```typescript
   const metrics = await memory.getMetrics();
   console.log(metrics);
   ```

7. **`updateFolder(id: string, folder: string)`** - Update conversation folder only
   ```typescript
   await memory.updateFolder(id, '/new/folder/path');
   ```

#### New Types

- `QueryResponse` - Paginated response with results
- `FtsSearchRequest`, `FtsSearchResponse` - Full-text search
- `SummaryResponse` - Summary generation
- `PruneResponse` - Pruning suggestions
- `CountResponse` - Conversation count
- `Metrics` - System metrics
- `ExecutePruneRequest` - Prune execution request

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
- Added usage examples for all new endpoints
- Updated README with complete API reference
- Added migration guide for breaking changes

### 🧪 Tests

- Added `tests/endpoints.test.ts` with 100% coverage of new/fixed endpoints
- Updated `tests/client.test.ts` to match new API
- All tests passing with new implementation
- Added integration test for complete pruning workflow

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

[Unreleased]: https://github.com/sekha-ai/sekha-js-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sekha-ai/sekha-js-sdk/releases/tag/v0.1.0

---

## Migration Guide: 0.1.0 → Unreleased

### Step 1: Update Response Handling

```typescript
// BEFORE
const conversations = await memory.list();
conversations.forEach(conv => console.log(conv.label));

const results = await memory.query('test');
results.forEach(result => console.log(result.score));

// AFTER
const listResponse = await memory.list();
listResponse.results.forEach(conv => console.log(conv.label));
console.log(`Total: ${listResponse.total}`);

const queryResponse = await memory.query('test');
queryResponse.results.forEach(result => console.log(result.score));
console.log(`Found ${queryResponse.total} results`);
```

### Step 2: Update updateLabel() Calls

```typescript
// BEFORE
await memory.updateLabel(id, 'New Label');

// AFTER - Get current conversation first to preserve folder
const conv = await memory.get(id);
await memory.updateLabel(id, 'New Label', conv.folder);

// OR - Update folder separately if needed
await memory.updateFolder(id, '/new/folder');
```

### Step 3: Update Type Definitions

```typescript
// BEFORE
interface Conversation {
  id: string;
  label: string;
  folder?: string;  // Optional
  messageCount?: number;  // camelCase
  createdAt: string;  // camelCase
}

// AFTER
interface Conversation {
  id: string;
  label: string;
  folder: string;  // Required!
  message_count: number;  // snake_case
  created_at: string;  // snake_case
}
```

### Step 4: Update Context Assembly

```typescript
// BEFORE
const context = await memory.assembleContext({
  query: 'test',
  tokenBudget: 8000,
  labels: ['Engineering']
});
console.log(context.formattedContext);  // String

// AFTER
const context = await memory.assembleContext({
  query: 'test',
  context_budget: 8000,
  preferred_labels: ['Engineering']
});
context.messages.forEach(msg => console.log(msg.content));  // Message[]
```

### Step 5: Leverage New Features

```typescript
// Count conversations
const { count } = await memory.count({ label: 'Engineering' });

// Full-text search
const ftsResults = await memory.searchFTS('kubernetes');

// Generate summaries
const summary = await memory.summarize(id, 'weekly');

// Complete pruning workflow
const suggestions = await memory.getPruningSuggestions(60, 5.0);
const toArchive = suggestions.suggestions
  .filter(s => s.recommendation === 'archive')
  .map(s => s.conversation_id);
await memory.pruneExecute(toArchive);
```

### Breaking Change Checklist

- [ ] Update `list()` calls to handle `QueryResponse`
- [ ] Update `query()` calls to handle `QueryResponse`
- [ ] Add `folder` parameter to all `updateLabel()` calls
- [ ] Update type definitions for `Conversation` (snake_case fields)
- [ ] Update `assembleContext()` parameter names
- [ ] Handle `ContextAssembly.messages` instead of `formattedContext`
- [ ] Test with actual controller to verify all endpoints
