# Contributing to Sekha JavaScript/TypeScript SDK

Thank you for your interest in contributing to Sekha! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sekha-js-sdk.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Install Development Dependencies
```bash
npm install
```

## Testing

Run the test suite:

```bash
npm test                    # Run all tests
npm run test:coverage       # With coverage report
npm run test:watch          # Watch mode
npm run test:ui             # Interactive UI
```

Tests should pass and maintain >80% coverage.

## Code Style

- **Linter:** ESLint (configured in eslint config)
- **Type Checking:** TypeScript (strict mode)
- **Build:** TypeScript compiler (ESM + CJS)

Run all checks:

```bash
npm run lint                # Check for issues
npm run lint:fix            # Auto-fix issues
npm run build               # Build ESM + CJS
npm test                    # Run tests
```

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Ensure code style compliance: `npm run lint`
3. Ensure TypeScript compiles: `npm run build`
4. Update documentation if needed
5. Add test coverage for new functionality (aim for >80% coverage)
6. Submit PR with clear description of changes
7. Address review feedback promptly

## Commit Message Guidelines

- Use clear, descriptive commit messages
- Start with a verb in present tense: "Add feature", "Fix bug", "Update docs"
- Reference related issues: "Fixes #123"
- Keep commits focused on a single concern

## Reporting Issues

Use GitHub Issues to report bugs or suggest features.

Include:

- Node.js version
- SDK version
- Minimal reproducible example (for bugs)
- Expected vs actual behavior

## Code of Conduct

Please refer to CODE_OF_CONDUCT.md for our community standards.
