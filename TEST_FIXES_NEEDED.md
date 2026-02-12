# Test Failures Analysis

## Summary
**16 tests failing** out of 137 total tests (88% pass rate)

---

## Critical Issues

### 1. API Response Structure Mismatches

**Root Cause:** Tests expect arrays but API returns objects with properties

**Affected Tests:**
- `tests/advanced.test.ts:57` - suggestLabels returns `{suggestions: []}` not array
- `tests/advanced.test.ts:223` - getPruningSuggestions returns `{suggestions: []}` not array 
- `tests/client.complete.test.ts:235` - search returns `{results: []}` not array
- `tests/client.complete.test.ts:268` - getPruningSuggestions returns `{suggestions: []}` not array

**Fix Required:**
```typescript
// Update assertions from:
expect(result).toHaveLength(2);

// To:
expect(result.suggestions).toHaveLength(2);
// or
expect(result.results).toHaveLength(2);
```

---

### 2. Export Method Returns Object Not String

**Root Cause:** `export()` method signature is `Promise<Record<string, unknown>>` but tests expect `string`

**Affected Tests:**
- `tests/client.complete.test.ts:287` - Export markdown expects string with '# Exported'
- `tests/client.complete.test.ts:296` - Export JSON expects string with 'id'
- `tests/client.complete.test.ts:321` - exportStream expects plain text chunks
- `tests/advanced.test.ts:114` - exportStream chunking test

**Fix Options:**

**Option A:** Change return type to string (recommended)
```typescript
// In client.ts
async export(options: ExportOptions = {}): Promise<string> {
  // ... fetch ...
  const result = await response.json();
  return typeof result === 'string' ? result : JSON.stringify(result);
}
```

**Option B:** Update all tests to expect objects
```typescript
const result = await memory.export({ format: 'markdown' });
const content = typeof result === 'string' ? result : JSON.stringify(result);
expect(content).toContain('# Exported');
```

---

### 3. API Key Validation Length

**Root Cause:** Some tests use short API keys (`test-api-key-123` = 17 chars), but validation requires 32 chars for controller

**Affected Tests:**
- `tests/mcp.test.ts:84` - MCP client constructor test uses short key
- `tests/mcp.test.ts:563` - createMCPClient test uses short key

**Fix Required:**
```typescript
// Update test configs to use 32+ character keys:
const client = new MCPClient({
  baseURL: 'http://localhost:8080',
  apiKey: 'sk-test-key-12345678901234567890123456789012' // 48 chars
});
```

---

### 4. Filter Parameter Naming Inconsistencies

**Root Cause:** Tests use wrong field names for filters

**Affected Tests:**
- `tests/client.complete.test.ts:156` - Uses `body.labels` instead of `body.preferred_labels`
- `tests/client.complete.test.ts:246` - Uses `body.filter_labels` instead of `body.filters.label`

**Fix Required:**
```typescript
// In assembleContext test:
expect(body.preferred_labels).toEqual(['Project:AI', 'Work']);

// In search test:
expect(body.filters).toEqual({ label: 'Work' });
```

---

### 5. Pin Endpoint Test Expectations

**Root Cause:** Test expects old generic endpoint, but implementation correctly uses specific `/pin` endpoint

**Affected Test:**
- `tests/client.complete.test.ts:173` - Expects `/api/v1/conversations/conv_123` with body

**Fix Required:**
```typescript
// Update test expectation:
expect(fetchMock).toHaveBeenCalledWith(
  'http://localhost:8080/api/v1/conversations/conv_123/pin',
  expect.objectContaining({ method: 'PUT' })
);
// No body needed - endpoint itself indicates action
```

---

### 6. 204/202 Response Handling

**Root Cause:** Tests expect specific return values for status codes, but implementation returns empty object `{}`

**Affected Tests:**
- `tests/endpoints.test.ts:538` - Expects `null` for 204 No Content
- `tests/endpoints.test.ts:547` - Expects defined value for 202 Accepted

**Fix Required:**
```typescript
// Option A: Update tests to expect empty object
expect(result).toEqual({});

// Option B: Change client.ts to return null for 204
if (response.status === 204) {
  return null as T;
}
```

---

### 7. autoLabel Mock Chain Issue

**Root Cause:** `autoLabel()` calls `get()` then `updateLabel()`, but test mock doesn't properly chain responses

**Affected Test:**
- `tests/advanced.test.ts:79` - "Cannot read properties of undefined (reading 'ok')"

**Fix Required:**
```typescript
// Add mock for get() before autoLabel:
fetchMock.mockResolvedValueOnce(createMockResponse({
  id: 'conv_123',
  label: 'Old Label',
  folder: '/test',
  ...mockConversation
}));

fetchMock.mockResolvedValueOnce(createMockResponse({})); // updateLabel

const label = await memory.autoLabel('conv_123', 0.7);
```

---

## Test File Summary

| File | Failed | Total | Pass Rate |
|------|--------|-------|----------|
| endpoints.test.ts | 2 | 34 | 94% |
| mcp.test.ts | 2 | 39 | 95% |
| client.complete.test.ts | 8 | 21 | 62% |
| client.test.ts | 0 | 26 | 100% ✅ |
| mocks.test.ts | 0 | 4 | 100% ✅ |
| advanced.test.ts | 4 | 13 | 69% |
| **Total** | **16** | **137** | **88%** |

---

## Recommended Fix Order

1. **API key validation** (quick) - Update 2 test configs to use 32+ char keys
2. **Response structure** (medium) - Fix 4 tests expecting arrays vs objects  
3. **Export return type** (medium) - Choose Option A or B and apply consistently to 4 tests
4. **Filter parameters** (quick) - Fix 2 tests using wrong field names
5. **Pin endpoint** (quick) - Update 1 test expectation
6. **204/202 handling** (quick) - Update 2 tests or change client behavior
7. **autoLabel mock** (medium) - Fix 1 complex mock chain

---

## Next Steps

1. Create branch `fix/test-suite-completion`
2. Apply fixes in recommended order
3. Run tests after each fix to verify
4. Update this document as fixes are completed
5. Merge to `audit/api-alignment-2026` when all green

---

## Notes

- Most failures are test expectations not matching updated API design
- Only 1 failure is a genuine bug (autoLabel mock chain)
- High pass rate (88%) indicates core functionality is solid
- Failures are concentrated in newer test files (client.complete.test.ts)
