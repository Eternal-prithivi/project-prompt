import { PromptComponents, PromptVariation, JudgeVerdict } from '../../types';

// Sample PromptComponents for testing
export const samplePromptComponents: PromptComponents = {
  role: 'Senior Software Engineer',
  task: 'Write a TypeScript utility function to validate email addresses',
  context: 'For a web application backend',
  format: 'Function with JSDoc comments and unit tests',
  constraints: 'Must handle edge cases, no external libraries',
  scores: {
    clarity: 75,
    context: 80,
    constraints: 85,
    tone: 70,
    overall: 77,
    feedback: 'Good structure but needs more specific examples'
  },
  questions: [
    'What email validation standard should we use (RFC 5322)?',
    'Should we support internationalized domain names?',
    'What performance requirements do we have?'
  ]
};

// Sample PromptVariation responses
export const sampleVariations: PromptVariation[] = [
  {
    id: '0',
    type: 'precisionist',
    title: 'Professional & Structured',
    description: 'Highly structured, sticking strictly to requirements',
    content: `You are a Senior Software Engineer.

## Task
Write a TypeScript utility function to validate email addresses.

## Context
For a web application backend

## Format
Function with JSDoc comments and unit tests

## Constraints
- Must handle edge cases
- No external libraries
- Performance optimized

## Output Format
\`\`\`typescript
/**
 * Validates an email address
 * @param email - Email to validate
 * @returns boolean - True if valid
 */
function validateEmail(email: string): boolean { ... }
\`\`\``
  },
  {
    id: '1',
    type: 'creative',
    title: 'Creative & Imaginative',
    description: 'Friendly, imaginative, goes beyond basic requirements',
    content: `# 📧 Email Validation Quest

You are a creative Software Engineer who loves making code not just work, but *delight*.

## The Challenge
Create a TypeScript email validator that's both robust and elegant. Think of it as a bouncer for your email list - friendly but thorough!

## What We're Building
A utility function that validates emails like a pro, handling edge cases smoothly.

## The Magic Format
Include:
- Fun comments explaining the logic
- Comprehensive test cases with creative test data
- Error messages that make developers smile

[EMAIL_EXAMPLES]`
  },
  {
    id: '2',
    type: 'mastermind',
    title: 'Advanced Expert-Level',
    description: 'Expert-level reasoning with complex chain-of-thought',
    content: `<system_instructions>
You are an expert in email validation standards, performance optimization, and TypeScript.
Provide a solution that demonstrates deep understanding of RFC 5322, internationalization, and production-grade code.
</system_instructions>

<chain_of_thought>
1. Analyze email validation requirements (RFC 5322 vs practical)
2. Consider performance implications for high-volume validation
3. Design for extensibility and edge cases
4. Implement with TypeScript best practices
5. Include comprehensive test coverage
</chain_of_thought>

## Expert Email Validator Implementation

### Analysis Phase
- RFC 5322 compliant with practical limitations
- Support for [DOMAINS]
- Performance: O(n) single pass validation
- Internationalization: [CHARSET_SUPPORT]

### Implementation Requirements
- [EDGE_CASES]
- [PERFORMANCE_TARGETS]`
  }
];

// Mock API responses for Gemini
export const geminiMockResponse = {
  analyzePrompt: {
    role: 'Senior Software Engineer',
    task: 'Write a validation function',
    context: 'Web application',
    format: 'TypeScript with tests',
    constraints: 'No external libraries',
    scores: {
      clarity: 80,
      context: 75,
      constraints: 85,
      tone: 78,
      overall: 79,
      feedback: 'Well-structured prompt with clear requirements'
    },
    questions: [
      'What validation standard should be used?',
      'Should internationalization be supported?',
      'What are the performance requirements?'
    ]
  },
  generateVariations: sampleVariations,
  runPrompt: 'Here is a function to validate emails:\n\nfunction validateEmail(email: string): boolean {\n  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);\n}'
};

// Mock API responses for DeepSeek
export const deepseekMockResponse = {
  analyzePrompt: {
    role: 'Senior Software Engineer',
    task: 'Write a validation function',
    context: 'Web application',
    format: 'TypeScript with tests',
    constraints: 'No external libraries',
    scores: {
      clarity: 78,
      context: 76,
      constraints: 82,
      tone: 77,
      overall: 78,
      feedback: 'Good prompt structure with room for improvement'
    },
    questions: [
      'What is the target audience level?',
      'Are there performance constraints?',
      'Should we handle special cases?'
    ]
  }
};

// Mock API responses for Ollama
export const ollamaMockResponse = {
  response: 'Email validation is important. Here is a simple approach: /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/'
};

// Mock error responses
export const mockErrorResponses = {
  unauthorized: { error: 'Unauthorized' },
  rateLimited: { error: 'Rate limited' },
  notFound: { error: 'Not found' },
  serverError: { error: 'Internal server error' }
};

// Sample JudgeVerdict for A/B testing
export const sampleJudgeVerdict: JudgeVerdict = {
  winner: 'A',
  reasoning: 'Prompt A was more specific about requirements and edge cases.'
};
