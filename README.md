# Sekha JavaScript/TypeScript SDK

> **Official JavaScript & TypeScript Client for Sekha Memory System**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%2B-blue.svg)](https://www.typescriptlang.org)
[![npm](https://img.shields.io/badge/npm-coming--soon-orange.svg)](https://www.npmjs.com)
[![CI](https://github.com/sekha-ai/sekha-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/sekha-ai/sekha-js-sdk/actions/workflows/ci.yml)

---

## What is Sekha JS SDK?

Official JavaScript/TypeScript client for the Sekha Memory System - providing persistent, sovereign AI memory through REST, MCP, and LLM Bridge protocols.

**Features:**

- ✅ **4 Client Interfaces** - Controller, MCP, Bridge, Unified
- ✅ **Full REST API** - 19 endpoints with complete coverage
- ✅ **MCP Protocol** - 7 Model Context Protocol tools
- ✅ **LLM Bridge** - Direct completions, embeddings, streaming
- ✅ **TypeScript** - 50+ interfaces with complete type safety
- ✅ **Multi-Modal** - Text + image message support
- ✅ **Streaming** - Server-Sent Events for LLM completions
- ✅ **Tree-shakeable** - ESM with selective imports
- ✅ **Universal** - Works in Node.js & browser
- ✅ **Zero Dependencies** - Lightweight with no external deps

---

## 📚 Documentation

- [Full Documentation](https://docs.sekha.dev/sdks/javascript-sdk/)
- [API Reference](https://docs.sekha.dev/api-reference/)
- [Getting Started Guide](https://docs.sekha.dev/getting-started/quickstart/)
- [Code Examples](https://docs.sekha.dev/sdks/examples/)

---

## 🚀 Quick Start

### Installation

```bash
# From npm (coming soon)
npm install @sekha/sdk

# From source (current)
git clone https://github.com/sekha-ai/sekha-js-sdk.git
cd sekha-js-sdk
npm install
npm run build
```

### Simple Usage - Unified Client (Recommended)

```typescript
import { SekhaClient } from '@sekha/sdk';

// Initialize with all services
const sekha = new SekhaClient({
  controllerURL: 'http://localhost:8080',
  bridgeURL: 'http://localhost:5001',
  apiKey: 'sk-your-api-key'
});

// One-line workflows
const response = await sekha.completeWithMemory(
  'Explain our TypeScript architecture',
  'TypeScript discussion'
);

console.log(response.choices[0].message.content);
```

### Advanced Usage - Individual Clients

```typescript
import { MemoryController, MCPClient, BridgeClient } from '@sekha/sdk';

// REST API client
const controller = new MemoryController({
  baseURL: 'http://localhost:8080',
  apiKey: 'sk-your-api-key'
});

// MCP protocol client
const mcp = new MCPClient({
  baseURL: 'http://localhost:8080',
  mcpApiKey: 'sk-your-mcp-key'
});

// LLM Bridge client
const bridge = new BridgeClient({
  baseURL: 'http://localhost:5001'
});

// Use individually
const conversations = await controller.list();
const stats = await mcp.memoryStats({ folder: '/work' });
const completion = await bridge.complete({
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

---

## 📝 Core Concepts

### 1. MemoryController - REST API (19 endpoints)

Direct HTTP access to Sekha Controller for conversation management.

```typescript
import { MemoryController } from '@sekha/sdk';

const controller = new MemoryController({
  baseURL: 'http://localhost:8080',
  apiKey: 'sk-your-api-key'
});

// Store conversation
const conversation = await controller.create({
  label: 'Engineering Discussion',
  folder: '/work/engineering',
  messages: [
    { role: 'user', content: 'How should we structure our API?' },
    { role: 'assistant', content: 'Let me suggest a REST-first approach...' }
  ]
});

// Semantic search
const results = await controller.query('API architecture discussion');
console.log(`Found ${results.total} results`);

// Full-text search
const ftsResults = await controller.searchFTS('TypeScript');

// Get conversation count
const count = await controller.count({ folder: '/work' });

// Assemble context for LLM
const context = await controller.assembleContext({
  query: 'Continue the API discussion',
  context_budget: 4000,
  preferred_labels: ['Engineering']
});

// Get pruning suggestions
const suggestions = await controller.getPruningSuggestions({
  threshold_days: 30
});

// Execute pruning
await controller.pruneExecute({
  conversation_ids: suggestions.suggestions.map(s => s.conversation_id)
});
```

**All Methods:**
- **CRUD**: `create()`, `list()`, `get()`, `update()`, `delete()`
- **Search**: `query()`, `searchFTS()`, `count()`
- **Context**: `assembleContext()`
- **Management**: `pin()`, `archive()`, `updateLabel()`, `updateFolder()`
- **AI Features**: `suggestLabel()`, `summarize()`
- **Maintenance**: `getPruningSuggestions()`, `pruneExecute()`, `rebuildEmbeddings()`
- **Export**: `export()`
- **System**: `health()`, `getMetrics()`

### 2. MCPClient - Model Context Protocol (7 tools)

MCP protocol for standardized AI memory operations.

```typescript
import { MCPClient } from '@sekha/sdk';

const mcp = new MCPClient({
  baseURL: 'http://localhost:8080',
  mcpApiKey: 'sk-your-mcp-key'
});

// Store via MCP
const result = await mcp.memoryStore({
  label: 'Meeting Notes',
  folder: '/meetings',
  messages: [/* ... */]
});

// Search via MCP
const searchResult = await mcp.memorySearch({
  query: 'quarterly planning',
  limit: 10
});

// Get context
const context = await mcp.memoryGetContext({
  conversation_ids: ['uuid1', 'uuid2']
});

// Update conversation
await mcp.memoryUpdate({
  conversation_id: 'uuid',
  updates: { label: 'Updated Label' }
});

// Get statistics
const stats = await mcp.memoryStats({
  folder: '/work',
  label: 'Engineering'
});

console.log(`Total: ${stats.total_conversations}`);
console.log(`Messages: ${stats.total_messages}`);
```

**All Tools:**
- `memoryStore()` - Store conversations
- `memorySearch()` - Semantic search
- `memoryGetContext()` - Retrieve context
- `memoryUpdate()` - Update conversations
- `memoryPrune()` - Get pruning suggestions
- `memoryExport()` - Export data
- `memoryStats()` - Get statistics

### 3. BridgeClient - LLM Operations (7 methods)

Direct access to Sekha LLM Bridge for completions and embeddings.

```typescript
import { BridgeClient } from '@sekha/sdk';

const bridge = new BridgeClient({
  baseURL: 'http://localhost:5001'
});

// Chat completion
const completion = await bridge.complete({
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain TypeScript generics' }
  ],
  temperature: 0.7
});

console.log(completion.choices[0].message.content);

// Streaming completion
for await (const chunk of bridge.streamComplete({ messages })) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}

// Generate embeddings
const embedding = await bridge.embed({
  text: 'This text will be embedded',
  model: 'text-embedding-3-small'
});

// Generate summary
const summary = await bridge.summarize({
  text: 'Long text to summarize...',
  level: 'brief'
});

// Extract entities
const entities = await bridge.extract({
  text: 'Apple released iPhone 15 in September 2023',
  entity_types: ['organization', 'product', 'date']
});

// Score importance
const score = await bridge.score({
  text: 'Critical system failure detected!'
});

console.log(`Importance: ${score.score}/10`);
```

**All Methods:**
- `complete()` - Chat completions (OpenAI-compatible)
- `streamComplete()` - Streaming completions with SSE
- `embed()` - Generate embeddings
- `summarize()` - Hierarchical text summaries
- `extract()` - Entity extraction
- `score()` - Importance scoring
- `health()` - Health check with provider status

### 4. SekhaClient - Unified Interface (6 workflows)

Combines all three clients with high-level convenience methods.

```typescript
import { SekhaClient } from '@sekha/sdk';

const sekha = new SekhaClient({
  controllerURL: 'http://localhost:8080',
  bridgeURL: 'http://localhost:5001',
  apiKey: 'sk-your-api-key'
});

// Access any client directly
await sekha.controller.list();
await sekha.mcp.memoryStats({});
await sekha.bridge.complete({ messages });

// High-level workflows:

// 1. Store conversation then search
const { conversation, results } = await sekha.storeAndQuery(
  messages,
  'search query',
  { label: 'Engineering', folder: '/work' }
);

// 2. LLM completion with assembled context
const response = await sekha.completeWithContext(
  'What were the main takeaways from our meeting?',
  'meeting notes',
  {
    context_budget: 4000,
    preferred_labels: ['Meetings'],
    temperature: 0.7
  }
);

// 3. LLM completion with search results
const response2 = await sekha.completeWithMemory(
  'Summarize our TypeScript discussions',
  'TypeScript architecture',
  { limit: 5 }
);

// 4. Generate custom embedding and store
const stored = await sekha.embedAndStore(
  messages,
  {
    label: 'Custom Embedded',
    folder: '/custom',
    model: 'text-embedding-3-large'
  }
);

// 5. Streaming with context
for await (const chunk of sekha.streamWithContext(
  'Continue our discussion',
  'previous conversation'
)) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}

// 6. Check all services
const health = await sekha.healthCheck();
console.log(`Controller: ${health.controller.status}`);
console.log(`Bridge: ${health.bridge.status}`);
```

---

## 🎨 Advanced Features

### Multi-Modal Messages (Text + Images)

```typescript
import { Message } from '@sekha/sdk';

// Vision message with image
const visionMessage: Message = {
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { 
      type: 'image_url',
      image_url: {
        url: 'https://example.com/chart.png',
        detail: 'high'  // 'low' | 'high' | 'auto'
      }
    }
  ]
};

// Store vision conversation
await controller.create({
  label: 'Chart Analysis',
  folder: '/vision',
  messages: [visionMessage]
});

// Use with bridge
const analysis = await bridge.complete({
  messages: [visionMessage]
});
```

### Type Guards & Utilities

```typescript
import {
  isMultiModalContent,
  extractText,
  extractImageUrls,
  hasImages,
  isValidStatus
} from '@sekha/sdk';

const message: Message = { /* ... */ };

// Check content type
if (isMultiModalContent(message.content)) {
  const text = extractText(message.content);
  const images = extractImageUrls(message.content);
  console.log(`Text: ${text}`);
  console.log(`Images: ${images.length}`);
}

// Check if message has images
if (hasImages(message)) {
  console.log('Message contains images');
}

// Validate conversation status
if (isValidStatus(conversation.status)) {
  // TypeScript knows: status is 'active' | 'archived' | 'pinned'
}
```

### Streaming with Server-Sent Events

```typescript
// Stream to console
for await (const chunk of bridge.streamComplete({
  messages: [{ role: 'user', content: 'Write a story' }],
  stream: true
})) {
  const delta = chunk.choices[0]?.delta;
  if (delta?.content) {
    process.stdout.write(delta.content);
  }
}

// Collect full response
let fullResponse = '';
for await (const chunk of bridge.streamComplete({ messages })) {
  const content = chunk.choices[0]?.delta?.content || '';
  fullResponse += content;
}
console.log('\nComplete response:', fullResponse);
```

### Error Handling

```typescript
import { SekhaError } from '@sekha/sdk';

try {
  const results = await controller.query('search');
} catch (error) {
  if (error instanceof SekhaError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Details:`, error.details);
  }
}
```

### Pagination

```typescript
// REST API pagination
let page = 1;
let hasMore = true;

while (hasMore) {
  const response = await controller.list({
    page,
    page_size: 50
  });
  
  console.log(`Page ${page}: ${response.results.length} conversations`);
  
  hasMore = response.results.length === 50;
  page++;
}

// Cursor-based pagination (MCP)
let cursor: string | undefined;

do {
  const response = await mcp.memorySearch({
    query: 'TypeScript',
    limit: 20,
    cursor
  });
  
  // Process results
  console.log(`Batch: ${response.data.results.length}`);
  
  cursor = response.next_cursor;
} while (cursor);
```

---

## 📋 Complete API Reference

### MemoryController (REST API - 19 Endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `create()` | POST `/api/v1/conversations` | Store conversation |
| `list()` | GET `/api/v1/conversations` | List conversations (paginated) |
| `get()` | GET `/api/v1/conversations/:id` | Get single conversation |
| `update()` | PUT `/api/v1/conversations/:id` | Update conversation |
| `delete()` | DELETE `/api/v1/conversations/:id` | Delete conversation |
| `query()` | POST `/api/v1/query` | Semantic search |
| `searchFTS()` | POST `/api/v1/search/fts` | Full-text search |
| `count()` | GET `/api/v1/conversations/count` | Count conversations |
| `assembleContext()` | POST `/api/v1/context/assemble` | Assemble LLM context |
| `pin()` | PUT `/api/v1/conversations/:id/pin` | Pin conversation |
| `archive()` | PUT `/api/v1/conversations/:id/archive` | Archive conversation |
| `updateLabel()` | PUT `/api/v1/conversations/:id/label` | Update label |
| `updateFolder()` | PUT `/api/v1/conversations/:id/folder` | Update folder |
| `suggestLabel()` | POST `/api/v1/labels/suggest` | AI label suggestions |
| `summarize()` | POST `/api/v1/summarize` | Generate summary |
| `getPruningSuggestions()` | POST `/api/v1/prune/dry-run` | Get prune suggestions |
| `pruneExecute()` | POST `/api/v1/prune/execute` | Execute pruning |
| `rebuildEmbeddings()` | POST `/api/v1/rebuild-embeddings` | Rebuild embeddings |
| `export()` | POST `/api/v1/export` | Export conversations |
| `health()` | GET `/health` | Health check |
| `getMetrics()` | GET `/metrics` | System metrics |

### MCPClient (MCP Protocol - 7 Tools)

| Tool | Description |
|------|-------------|
| `memoryStore()` | Store conversation via MCP |
| `memorySearch()` | Semantic search via MCP |
| `memoryGetContext()` | Get conversation context |
| `memoryUpdate()` | Update conversation fields |
| `memoryPrune()` | Get pruning suggestions |
| `memoryExport()` | Export conversations |
| `memoryStats()` | Get statistics by folder/label |

### BridgeClient (LLM Bridge - 7 Methods)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `complete()` | POST `/v1/chat/completions` | Chat completions |
| `streamComplete()` | POST `/v1/chat/completions` | Streaming completions |
| `embed()` | POST `/api/v1/embed` | Generate embeddings |
| `summarize()` | POST `/api/v1/summarize` | Text summarization |
| `extract()` | POST `/api/v1/extract` | Entity extraction |
| `score()` | POST `/api/v1/score` | Importance scoring |
| `health()` | GET `/health` | Health check |

### SekhaClient (Unified - 6 Workflows)

| Method | Description |
|--------|-------------|
| `storeAndQuery()` | Store conversation then search |
| `completeWithContext()` | LLM completion with assembled context |
| `completeWithMemory()` | LLM completion with search results |
| `embedAndStore()` | Generate embedding then store |
| `streamWithContext()` | Streaming completion with context |
| `healthCheck()` | Check all services simultaneously |

---

## 🌐 Browser Usage

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sekha SDK Browser Example</title>
</head>
<body>
  <script type="module">
    // Use from CDN (when published)
    import { SekhaClient } from 'https://unpkg.com/@sekha/sdk';
    
    const sekha = new SekhaClient({
      controllerURL: 'http://localhost:8080',
      apiKey: 'sk-your-api-key'
    });
    
    const response = await sekha.controller.query('search query');
    console.log('Results:', response);
  </script>
</body>
</html>
```

---

## 🧪 Development

```bash
# Clone repository
git clone https://github.com/sekha-ai/sekha-js-sdk.git
cd sekha-js-sdk

# Install dependencies
npm install

# Build (ESM + CJS)
npm run build

# Build with watch mode
npm run build:watch

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

---

## 📁 Package Structure

```
sekha-js-sdk/
├── src/
│   ├── client.ts       # MemoryController (REST API)
│   ├── mcp.ts          # MCPClient (MCP Protocol)
│   ├── bridge.ts       # BridgeClient (LLM Bridge)
│   ├── unified.ts      # SekhaClient (Unified)
│   ├── types.ts        # All type definitions (50+)
│   ├── errors.ts       # Error classes
│   └── index.ts        # Public exports
├── tests/
│   ├── client.test.ts
│   ├── mcp.test.ts
│   └── endpoints.test.ts
├── dist/
│   ├── esm/            # ES Module output
│   └── cjs/            # CommonJS output
├── package.json
├── tsconfig.json       # TypeScript config (ESM)
└── tsconfig.cjs.json   # TypeScript config (CJS)
```

---

## 🗺️ Roadmap

- [x] MemoryController (REST API) - v0.1
- [x] MCPClient (MCP Protocol) - v0.1
- [x] BridgeClient (LLM Bridge) - v0.1
- [x] SekhaClient (Unified Interface) - v0.1
- [x] TypeScript support with 50+ types - v0.1
- [x] Multi-modal message support - v0.1
- [x] Streaming support - v0.1
- [ ] Comprehensive test coverage - v0.2
- [ ] npm package publication - v1.0
- [ ] Browser optimizations
- [ ] WebSocket support for real-time updates
- [ ] Batch operations
- [ ] Request caching layer

---

## 🔗 Links

- **Main Repository:** [sekha-controller](https://github.com/sekha-ai/sekha-controller)
- **LLM Bridge:** [sekha-llm-bridge](https://github.com/sekha-ai/sekha-llm-bridge)
- **Python SDK:** [sekha-python-sdk](https://github.com/sekha-ai/sekha-python-sdk)
- **Documentation:** [docs.sekha.dev](https://docs.sekha.dev)
- **Website:** [sekha.dev](https://sekha.dev)
- **Discord:** [discord.gg/sekha](https://discord.gg/gZb7U9deKH)

---

## 📄 License

AGPL-3.0 - See [LICENSE](LICENSE) for details.

**[Full License Documentation](https://docs.sekha.dev/about/license/)**

---

## 🔧 Tech Stack

- **TypeScript 5.9+** - Type-safe development
- **Vitest** - Fast unit testing
- **ESLint** - Code quality
- **Zero Dependencies** - Lightweight and secure

---

## 🤝 Contributing

Contributions welcome! Please see our [Contributing Guide](CONTRIBUTING.md).

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests
5. Run linter (`npm run lint:fix`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

Please ensure:
- All tests pass (`npm test`)
- Code is formatted (`npm run lint:fix`)
- TypeScript compiles without errors (`npm run build`)

---

**Built with ❤️ by the Sekha Team**
