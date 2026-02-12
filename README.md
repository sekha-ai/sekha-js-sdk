# Sekha JavaScript/TypeScript SDK

> **Official JavaScript & TypeScript Client for Sekha Memory System**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue.svg)](https://www.typescriptlang.org)
[![npm](https://img.shields.io/badge/npm-coming--soon-orange.svg)](https://www.npmjs.com)

---

## What is Sekha JS SDK?

Official JavaScript/TypeScript client for Sekha Controller.

**Features:**

- ✅ Full TypeScript support
- ✅ Works in Node.js & browser
- ✅ Promise-based API
- ✅ Auto-generated types
- ✅ Full REST API coverage
- ✅ Tree-shakeable (ESM)

---

## 📚 Documentation

**Complete SDK docs: [docs.sekha.dev/sdks/javascript-sdk](https://docs.sekha.dev/sdks/javascript-sdk/)**

- [JavaScript SDK Guide](https://docs.sekha.dev/sdks/javascript-sdk/)
- [API Reference](https://docs.sekha.dev/api-reference/rest-api/)
- [Code Examples](https://docs.sekha.dev/sdks/examples/)
- [Getting Started](https://docs.sekha.dev/getting-started/quickstart/)

---

## 🚀 Quick Start

### Installation

```bash
# From npm (coming soon)
npm install @sekha-ai/sdk

# From source (current)
git clone https://github.com/sekha-ai/sekha-js-sdk.git
cd sekha-js-sdk
npm install
npm run build
```

### Basic Usage (TypeScript)

```typescript
import { SekhaClient } from '@sekha-ai/sdk';

// Initialize client
const client = new SekhaClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-api-key'
});

// Store a conversation
const conversation = await client.conversations.create({
  label: 'My First Conversation',
  messages: [
    { role: 'user', content: 'Hello Sekha!' },
    { role: 'assistant', content: "Hello! I'll remember this." }
  ]
});

// Search semantically
const results = await client.query({
  query: 'What did we discuss?',
  limit: 5
});

// Get context for next LLM call
const context = await client.context.assemble({
  query: 'Continue our conversation',
  contextBudget: 8000
});
```

### JavaScript (CommonJS)

```javascript
const { SekhaClient } = require('@sekha-ai/sdk');

const client = new SekhaClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-api-key'
});

async function example() {
  const conversation = await client.conversations.create({
    label: 'Test',
    messages: [{ role: 'user', content: 'Hello' }]
  });
  
  console.log('Conversation ID:', conversation.id);
}
```

**[Full examples](https://docs.sekha.dev/sdks/javascript-sdk/)**

---

## 📋 API Coverage

- ✅ Conversations (CRUD)
- ✅ Semantic query
- ✅ Full-text search
- ✅ Context assembly
- ✅ Summarization
- ✅ Labels & folders
- ✅ Pruning
- ✅ Import/export
- ✅ Stats & health

**[Complete API Reference](https://docs.sekha.dev/api-reference/rest-api/)**

---

## 🌐 Browser Usage

```html
<script type="module">
  import { SekhaClient } from 'https://unpkg.com/@sekha-ai/sdk';
  
  const client = new SekhaClient({
    baseUrl: 'http://localhost:8080',
    apiKey: 'your-api-key'
  });
  
  const results = await client.query({ query: 'search' });
  console.log(results);
</script>
```

---

## 🧪 Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Type check
npm run typecheck

# Lint
npm run lint

# Generate docs
npm run docs
```

---

## 🔗 Links

- **Main Repo:** [sekha-controller](https://github.com/sekha-ai/sekha-controller)
- **Docs:** [docs.sekha.dev](https://docs.sekha.dev)
- **Website:** [sekha.dev](https://sekha.dev)
- **Discord:** [discord.gg/sekha](https://discord.gg/gZb7U9deKH)

---

## 📄 License

AGPL-3.0 - **[License Details](https://docs.sekha.dev/about/license/)**
