/**
 * CONSOLIDATED TIMEOUT APPLICATION GUIDE
 * Production-Standard Approach for All Providers
 * 
 * Apply this pattern to all remaining providers:
 * 1. DeepSeek Provider
 * 2. ChatGPT Provider  
 * 3. Claude Provider
 * 4. Grok Provider
 * 5. Validation Service
 */

// Step 1: Add import at top of each file
// import { timeoutPromise } from '../utils/timeout';

// Step 2: Wrap each API call with timeoutPromise()
// BEFORE:
// const response = await this.client.chat.completions.create({ ... });

// AFTER:
// const response = await timeoutPromise(
//   this.client.chat.completions.create({ ... }),
//   30000 // 30 second timeout
// );

// PATTERN FOR EACH PROVIDER TYPE:

// ======== OpenAI-Compatible (ChatGPT, DeepSeek, Grok) ========
// import OpenAI from 'openai';
// import { timeoutPromise } from '../utils/timeout';
//
// const response = await timeoutPromise(
//   this.client.chat.completions.create({
//     model: 'gpt-4',
//     messages: [...],
//     ...
//   }),
//   30000
// );

// ======== Anthropic (Claude) ========
// import Anthropic from '@anthropic-ai/sdk';
// import { timeoutPromise } from '../utils/timeout';
//
// const response = await timeoutPromise(
//   this.client.messages.create({
//     model: 'claude-3-opus',
//     messages: [...],
//     ...
//   }),
//   30000
// );

// ======== Ollama (Custom fetch) ========
// Already implemented with fetchWithTimeout()

// ======== Validation Service ========
// import { fetchWithTimeout } from './utils/timeout';
//
// const response = await fetchWithTimeout(
//   'http://localhost:11434/api/tags',
//   {},
//   5000 // 5 second timeout for validation
// );
