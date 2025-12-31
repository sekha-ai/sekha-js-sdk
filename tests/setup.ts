// Global test setup for Vitest
import { beforeEach, vi } from 'vitest';

// Mock fetch globally
beforeEach(() => {
  vi.clearAllMocks();
});