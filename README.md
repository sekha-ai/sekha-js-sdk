# Sekha JavaScript/TypeScript SDK

<div align="center">

[![npm version](https://img.shields.io/npm/v/@sekha/sdk.svg)](https://www.npmjs.com/package/@sekha/sdk)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Official JavaScript/TypeScript SDK for [Sekha AI Memory Controller](https://github.com/sekha-ai/sekha-controller) - Persistent context management for AI applications.

</div>

---

## 🚀 Features

- ✅ **Full TypeScript Support** - Complete type definitions for all API operations
- ✅ **Tree-Shakeable** - ESM and CJS builds for optimal bundle size
- ✅ **Zero Dependencies** - Built on native `fetch` API
- ✅ **AbortController Support** - Cancel requests and handle timeouts
- ✅ **Streaming Exports** - Efficiently export large datasets
- ✅ **Rate Limiting** - Built-in client-side throttling
- ✅ **Automatic Retries** - Exponential backoff for transient failures
- ✅ **Comprehensive Errors** - Typed error classes for all scenarios

---

## 📦 Installation

npm install @sekha/sdk


**Using Yarn:**
yarn add @sekha/sdk

**Using pnpm:**
pnpm add @sekha/sdk

---

## 🎯 Quick Start

import { MemoryController } from '@sekha/sdk';

// Initialize the client
const memory = new MemoryController({
apiKey: process.env.SEKHA_API_KEY!, // or 'sk-your-api-key'
baseURL: 'http://localhost:8080',
timeout: 30000, // optional
maxRetries: 3, // optional
});

// Store a conversation
const conversation = await memory.store({
messages: [
{ role: 'user', content: 'What are token limits in GPT-4?' },
{ role: 'assistant', content: 'GPT-4 has a context window of...' }
],
label: 'AI:Token Limits',
folder: '/research/2025',
importanceScore: 8
});

console.log(✅ Stored conversation: ${conversation.id});

// Query with semantic search
const results = await memory.query('token limits', {
limit: 10,
labels: ['AI']
});

results.forEach(result => {
console.log(${result.label}: ${result.similarity.toFixed(2)});
});

---

## 📚 API Reference

### **MemoryController**

#### **Constructor**

const memory = new MemoryController({
apiKey: string; // Required: API key for authentication
baseURL: string; // Required: Sekha Controller URL
timeout?: number; // Optional: Request timeout (default: 30000ms)
maxRetries?: number; // Optional: Max retry attempts (default: 3)
rateLimit?: number; // Optional: Requests per minute (default: 1000)
});

---

### **Core Operations**

#### **`store(options)`** / **`create(options)`**
Store a new conversation with messages.

const conv = await memory.store({
messages: Message[],
label: string,
folder?: string,
importanceScore?: number,
metadata?: Record<string, any>
});

**Returns:** `Promise<Conversation>`

---

#### **`query(query, options?)`** / **`search(query, options?)`**
Search conversations using semantic similarity.

const results = await memory.query('API design patterns', {
limit: 10,
labels: ['Engineering', 'Architecture']
});

**Returns:** `Promise<SearchResult[]>`

---

#### **`get(id)`** / **`getConversation(id)`**
Retrieve a specific conversation by ID.

const conv = await memory.get('conv-uuid');

**Returns:** `Promise<Conversation>`

---

#### **`list(filter?)`** / **`listConversations(filter?)`**
List conversations with optional filters.

const convs = await memory.list({
label: 'Engineering',
status: 'active',
limit: 50,
offset: 0
});

**Returns:** `Promise<Conversation[]>`

---

#### **`update(id, updates)`**
Update conversation metadata.

await memory.update('conv-uuid', {
label: 'New Label',
folder: '/new/folder',
importanceScore: 9,
status: 'archived'
});

**Returns:** `Promise<Conversation>`

---

#### **`updateLabel(id, label, folder?)`**
Update conversation label and optionally folder.

await memory.updateLabel('conv-uuid', 'Updated Label', '/new/folder');

**Returns:** `Promise<void>`

---

#### **`delete(id)`**
Permanently delete a conversation.

await memory.delete('conv-uuid');

**Returns:** `Promise<void>`

---

### **Advanced Operations**

#### **`pin(id)`**
Pin a conversation (prevents auto-pruning).

await memory.pin('conv-uuid');

---

#### **`archive(id)`**
Archive a conversation.

await memory.archive('conv-uuid');

---

#### **`getPruningSuggestions(thresholdDays?, importanceThreshold?)`**
Get AI-powered pruning suggestions based on age and importance.

const suggestions = await memory.getPruningSuggestions(60, 5.0);

suggestions.forEach(s => {
console.log(Can prune: ${s.label});
console.log( Age: ${s.ageDays} days, Importance: ${s.importanceScore}/10);
console.log( Reason: ${s.reason});
});

**Returns:** `Promise<PruningSuggestion[]>`

---

#### **`suggestLabels(id)`**
Get AI-powered label suggestions for a conversation.

const suggestions = await memory.suggestLabels('conv-uuid');

suggestions.forEach(s => {
console.log(${s.label} (confidence: ${s.confidence.toFixed(2)}));
});

**Returns:** `Promise<LabelSuggestion[]>`

---

#### **`autoLabel(id, threshold?)`**
Automatically apply the best label if AI confidence exceeds threshold.

const appliedLabel = await memory.autoLabel('conv-uuid', 0.8);

if (appliedLabel) {
console.log(Applied label: ${appliedLabel});
} else {
console.log('No label met confidence threshold');
}

**Returns:** `Promise<string | null>`

---

#### **`assembleContext(options)`**
Assemble context for LLM with token budget management.

const context = await memory.assembleContext({
query: 'API design decisions',
tokenBudget: 8000,
labels: ['Engineering', 'Architecture']
});

console.log(Context: ${context.formattedContext});
console.log(Estimated tokens: ${context.estimatedTokens});

**Returns:** `Promise<ContextAssembly>`

---

#### **`export(options?)`**
Export conversations to Markdown or JSON.

// Export all conversations as Markdown
const markdown = await memory.export({ format: 'markdown' });

// Export specific label as JSON
const json = await memory.export({
label: 'Project:AI',
format: 'json'
});


**Returns:** `Promise<string>`

---

#### **`exportStream(options?)`**
Stream large exports to avoid memory issues.

const stream = memory.exportStream({
label: 'Project:AI',
format: 'markdown'
});

for await (const chunk of stream) {
process.stdout.write(chunk);
}

**Returns:** `AsyncIterable<string>`

---

#### **`health()`**
Check Sekha Controller health status.

const status = await memory.health();

console.log(Status: ${status.status});
console.log(Database OK: ${status.databaseOk});
console.log(Vector DB OK: ${status.vectorDbOk});


**Returns:** `Promise<HealthStatus>`

---

## 🛡️ Error Handling

The SDK provides typed error classes for all failure scenarios:

import {
SekhaError,
SekhaAuthError,
SekhaNotFoundError,
SekhaValidationError,
SekhaAPIError,
SekhaConnectionError
} from '@sekha/sdk';

try {
await memory.get('invalid-id');
} catch (error) {
if (error instanceof SekhaNotFoundError) {
console.log('Conversation not found');
} else if (error instanceof SekhaAuthError) {
console.log('Invalid API key');
} else if (error instanceof SekhaValidationError) {
console.log('Validation error:', error.details);
} else if (error instanceof SekhaConnectionError) {
console.log('Network error:', error.message);
} else if (error instanceof SekhaAPIError) {
console.log(API error (${error.statusCode}):, error.message);
}
}


---

## ⏱️ AbortController Support

Cancel requests or implement timeouts:

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
const results = await memory.search('authentication', {
limit: 10,
signal: controller.signal
});
clearTimeout(timeout);
console.log('Search completed:', results);
} catch (error) {
if (error.name === 'AbortError') {
console.log('Request was cancelled or timed out');
}
}

---

## 🔄 Streaming Exports

Efficiently export large datasets without loading everything into memory:

import { createWriteStream } from 'fs';

const stream = memory.exportStream({
label: 'Project:AI-Memory',
format: 'markdown'
});

const writeStream = createWriteStream('./export.md');

for await (const chunk of stream) {
writeStream.write(chunk);
}

writeStream.end();
console.log('Export complete!');

---

## 🔧 Configuration Options

interface MemoryConfig {
apiKey: string; // Required: API key (32+ characters)
baseURL: string; // Required: Sekha Controller URL
timeout?: number; // Optional: Request timeout in ms (default: 30000)
maxRetries?: number; // Optional: Max retry attempts (default: 3)
rateLimit?: number; // Optional: Requests per minute (default: 1000)
defaultLabel?: string; // Optional: Default label for conversations
}

---

## 📄 TypeScript Types

Full TypeScript definitions are included:

interface Message {
role: 'user' | 'assistant' | 'system';
content: string;
timestamp?: string;
}

interface Conversation {
id: string;
label: string;
folder?: string;
messages: Message[];
status: 'active' | 'archived' | 'pinned';
importanceScore?: number;
createdAt: string;
updatedAt: string;
}

interface SearchResult {
id: string;
conversationId: string;
label: string;
content: string;
score: number;
similarity: number;
importanceScore: number;
}

// ... and many more!

---

## 🧪 Testing

Run tests
npm test

Run with coverage
npm test -- --coverage

Watch mode
npm test -- --watch


---

## 📖 Documentation

- **Full Documentation:** [docs.sekha.ai](https://docs.sekha-ai.dev)
- **API Reference:** [docs.sekha.ai/api](https://docs.sekha-ai.dev/api)
- **Examples:** [github.com/sekha-ai/examples](https://github.com/sekha-ai/examples)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](https://github.com/sekha-ai/sekha-js-sdk/blob/main/CONTRIBUTING.md).

---

## 📜 License

**AGPL-3.0** - See [LICENSE](LICENSE) for details.

This project is licensed under the GNU Affero General Public License v3.0. This means:
- ✅ You can use, modify, and distribute this software
- ✅ You must disclose source code of any modifications
- ⚠️ If you run a modified version on a server, you must make the source available to users

For commercial licensing options, please contact [licensing@sekha-ai.dev](mailto:licensing@sekha-ai.dev).

---

## 🔗 Links

- **Homepage:** [sekha.ai](https://sekha-ai.dev)
- **GitHub:** [github.com/sekha-ai/sekha-js-sdk](https://github.com/sekha-ai/sekha-js-sdk)
- **npm:** [@sekha/sdk](https://www.npmjs.com/package/@sekha/sdk)
- **Discord:** [Join our community](https://discord.gg/sekha)
- **Twitter:** [@SekhaAI](https://twitter.com/SekhaAI)

---

<div align="center">

Made with ❤️ by the Sekha team

</div>
