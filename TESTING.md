# Testing Guide

## Test Framework
- **Vitest** (not Jest) - modern, fast TypeScript testing

## Commands
```bash
# Install dependencies
pnpm install

# Run all tests with coverage
./scripts/test.sh

# Run linting
./scripts/test.sh lint

# Watch mode for development
./scripts/test.sh watch

Requirements
Vitest, @vitest/coverage-v8, ESLint
Coverage target: >85%


---

#### **✅ sekha-llm-bridge (Python)**
**Current State:**
- Tests: `test_*.py` files
- Has `pyproject.toml`
- Has `pytest.ini text` (fix filename)

**Missing/Needs Verification:**
- [ ] Fix `pytest.ini text` filename
- [ ] Add coverage configuration
- [ ] Linting script
- [ ] Test runner script

**rename file: `sekha-llm-bridge/pytest.ini text` → `sekha-llm-bridge/pytest.ini`**

**create file: `sekha-llm-bridge/pytest.ini`**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --cov=sekha_llm_bridge --cov-report=term-missing --cov-report=html --cov-fail-under=80