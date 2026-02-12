/**
 * Bridge Client for Sekha LLM Operations
 * 
 * Direct access to LLM Bridge endpoints for completions, embeddings,
 * summarization, and other LLM operations.
 * 
 * @module @sekha/sdk/bridge
 */

import { Message as _Message } from './types';
import {
  SekhaError,
  SekhaValidationError,
  SekhaAPIError,
  SekhaAuthError,
  SekhaConnectionError,
} from './errors';

// Rest of file unchanged...
