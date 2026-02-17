# Sekha JavaScript/TypeScript SDK

> **Official JavaScript & TypeScript Client for Sekha Memory System**

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)](https://github.com/sekha-ai/sekha-js-sdk/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9%2B-blue.svg)](https://www.typescriptlang.org)
[![npm](https://img.shields.io/npm/v/@sekha-ai/sdk.svg)](https://www.npmjs.com/package/@sekha-ai/sdk)
[![CI](https://github.com/sekha-ai/sekha-js-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/sekha-ai/sekha-js-sdk/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/sekha-ai/sekha-js-sdk/branch/main/graph/badge.svg)](https://codecov.io/gh/sekha-ai/sekha-js-sdk)

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
# From npm
npm install @sekha-ai/sdk

# From source
git clone https://github.com/sekha-ai/sekha-js-sdk.git
cd sekha-js-sdk
npm install
npm run build
```

### Simple Usage - Unified Client (Recommended)

```typescript
import { SekhaClient } from '@sekha-ai/sdk';

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
import { MemoryController, MCPClient, BridgeClient } from '@sekha-ai/sdk';

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

_[REST OF README CONTENT REMAINS THE SAME]_