# Changelog

All notable changes to @sekha/sdk will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-21

### Added
- Initial release of Sekha JavaScript/TypeScript SDK
- Full REST API coverage for Sekha Controller
- TypeScript support with complete type definitions
- ESM and CommonJS builds
- Rate limiting with configurable requests per minute
- Automatic retry logic with exponential backoff
- AbortController support for request cancellation
- Streaming export functionality
- Comprehensive error classes

### API Methods
- `store()` / `create()` - Create conversations
- `query()` / `search()` - Semantic search
- `get()` / `getConversation()` - Retrieve conversation
- `list()` / `listConversations()` - List with filters
- `update()` - Update conversation metadata
- `delete()` - Delete conversation
- `pin()` - Pin conversation
- `archive()` - Archive conversation
- `assembleContext()` - Build LLM context
- `export()` / `exportStream()` - Export conversations
- `getPruningSuggestions()` - AI-powered cleanup suggestions
- `suggestLabels()` / `autoLabel()` - AI labeling
- `health()` - Health check

### Technical
- Zero dependencies (uses native fetch)
- TypeScript 5.7
- ESM and CJS dual package
- Tree-shakeable
- Modern Node.js 18+ and browser support
