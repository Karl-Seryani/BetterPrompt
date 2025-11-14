/**
 * VS Code Language Model API Rewriter
 * Uses Copilot/Claude Code if available
 */

import * as vscode from 'vscode';
import { UserLevel } from './groqRewriter';

export interface VsCodeLmConfig {
  userLevel?: UserLevel;
  preferredModel?: 'auto' | 'gpt-4' | 'claude' | 'groq';
}

export interface RewriteResult {
  original: string;
  enhanced: string;
  model: string;
  tokensUsed?: number;
  confidence: number;
}

/**
 * Checks if VS Code Language Model API is available
 */
export async function isVsCodeLmAvailable(): Promise<boolean> {
  try {
    const models = await vscode.lm.selectChatModels();
    return models.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * VS Code Language Model rewriter (uses Copilot/Claude Code)
 */
export class VsCodeLmRewriter {
  private config: VsCodeLmConfig;

  constructor(config: VsCodeLmConfig) {
    this.config = config;
  }

  /**
   * Enhances a vague prompt using VS Code Language Model API
   * @param vaguePrompt The original vague prompt
   * @returns Enhanced prompt with better context and clarity
   */
  public async enhancePrompt(vaguePrompt: string): Promise<RewriteResult> {
    if (!vaguePrompt || vaguePrompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    // Select the best available model
    const models = await vscode.lm.selectChatModels();

    if (models.length === 0) {
      throw new Error('No language models available. Please enable Copilot or Claude Code.');
    }

    // Select model based on user preference
    const model = this.selectModel(models);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(vaguePrompt);

    try {
      const messages = [
        vscode.LanguageModelChatMessage.User(systemPrompt),
        vscode.LanguageModelChatMessage.User(userPrompt),
      ];

      const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

      let enhanced = '';
      for await (const fragment of response.text) {
        enhanced += fragment;
      }

      enhanced = this.cleanEnhancedPrompt(enhanced.trim());

      return {
        original: vaguePrompt,
        enhanced,
        model: `${model.vendor}/${model.family}`,
        tokensUsed: undefined, // VS Code API doesn't expose token counts
        confidence: this.calculateConfidence(vaguePrompt, enhanced),
      };
    } catch (error) {
      if (error instanceof vscode.LanguageModelError) {
        // Handle specific LM errors
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('permission') || errorMessage.includes('consent')) {
          throw new Error('Language model access denied. Please grant permissions in VS Code.');
        } else if (errorMessage.includes('blocked') || errorMessage.includes('policy')) {
          throw new Error('Request was blocked. The prompt may violate content policies.');
        }
      }
      throw new Error(`VS Code Language Model error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Selects the best model based on user preference and availability
   */
  private selectModel(models: vscode.LanguageModelChat[]): vscode.LanguageModelChat {
    const preference = this.config.preferredModel || 'auto';

    // If user prefers Groq, return null (handled by caller)
    if (preference === 'groq') {
      throw new Error('User prefers Groq API');
    }

    // Find GPT-4 models
    const gpt4Models = models.filter((m) => m.family.toLowerCase().includes('gpt-4'));
    // Find Claude models
    const claudeModels = models.filter((m) => m.family.toLowerCase().includes('claude'));

    // User preference: GPT-4
    if (preference === 'gpt-4') {
      if (gpt4Models.length > 0) {
        return gpt4Models[0];
      }
      throw new Error('GPT-4 model not available. Please install GitHub Copilot or change preference.');
    }

    // User preference: Claude
    if (preference === 'claude') {
      if (claudeModels.length > 0) {
        return claudeModels[0];
      }
      throw new Error('Claude model not available. Please install Claude Code extension or change preference.');
    }

    // Auto mode: Prefer GPT-4 > Claude > First available
    if (gpt4Models.length > 0) {
      return gpt4Models[0];
    }
    if (claudeModels.length > 0) {
      return claudeModels[0];
    }
    return models[0];
  }

  /**
   * Builds the system prompt based on user level
   */
  private buildSystemPrompt(): string {
    const level = this.config.userLevel || 'auto';

    if (level === 'developer') {
      return this.buildDeveloperPrompt();
    } else if (level === 'beginner') {
      return this.buildBeginnerPrompt();
    } else {
      return this.buildAutoPrompt();
    }
  }

  /**
   * Developer-focused system prompt (TDD, best practices, architecture)
   */
  private buildDeveloperPrompt(): string {
    return `You are an expert software engineering assistant optimizing prompts for professional developers.

Your job is to rewrite vague prompts into production-ready, professional prompts following software engineering best practices.

DEVELOPER MODE - Always emphasize:
1. **Test-Driven Development (TDD)**: Mention writing tests first, test coverage requirements
2. **Architecture & Design Patterns**: SOLID principles, design patterns (Factory, Strategy, Repository, etc.)
3. **Error Handling**: Proper exception handling, logging, monitoring
4. **Security**: Input validation, SQL injection prevention, XSS protection, authentication/authorization
5. **Performance**: Optimization, caching, async/await, database indexing
6. **Code Quality**: TypeScript strict mode, ESLint rules, code reviews, CI/CD
7. **Documentation**: JSDoc comments, README, API documentation
8. **Production Readiness**: Environment variables, configuration management, deployment strategies

Detect intent:
- **BUILD/IMPLEMENT**: Add TDD workflow, architecture decisions, error handling, security considerations
- **DEBUG/FIX**: Add systematic debugging approach (logs, breakpoints, test isolation)
- **REFACTOR**: Mention SOLID principles, design patterns, maintaining test coverage
- **LEARN**: Focus on professional practices, real-world examples, production scenarios

Examples:
- "make a login system" → "Implement a secure login system using TDD: (1) Write tests for authentication flow, (2) Create User model with bcrypt password hashing, (3) Implement JWT-based session management, (4) Add rate limiting for brute-force protection, (5) Include proper error handling and logging, (6) Follow OWASP security best practices"
- "fix the authentication bug" → "Debug the authentication issue using TDD approach: (1) Write a failing test that reproduces the bug, (2) Add logging to trace the authentication flow, (3) Check JWT token expiration and refresh logic, (4) Verify database session storage, (5) Ensure proper error messages are returned, (6) Add integration tests to prevent regression"

Output ONLY the improved prompt. No explanations, no meta-commentary.`;
  }

  /**
   * Beginner-focused system prompt (simplified, step-by-step)
   */
  private buildBeginnerPrompt(): string {
    return `You are a friendly coding mentor helping beginners learn to code.

Your job is to rewrite vague prompts into clear, beginner-friendly prompts with step-by-step guidance.

BEGINNER MODE - Always provide:
1. **Step-by-step breakdown**: Break complex tasks into small, manageable steps
2. **Simple language**: Avoid jargon, or explain it when necessary
3. **Examples**: Include concrete examples and what the output should look like
4. **Why, not just what**: Explain why we're doing each step
5. **Common mistakes**: Warn about common pitfalls beginners face
6. **Start simple**: Use vanilla JavaScript/HTML/CSS before frameworks
7. **Visual guidance**: Mention what the user should see at each step

Detect intent:
- **LEARN**: Break down into fundamentals → basics → practice exercises
- **BUILD**: Start with simplest version, then add features incrementally
- **DEBUG**: Explain how to read error messages, where to look, what to check
- **UNDERSTAND**: Use analogies, real-world comparisons, simple examples

Examples:
- "teach me React" → "Learn React step-by-step: (1) Understand what React is (a library for building user interfaces), (2) Learn about components (reusable pieces of UI), (3) Practice with props (passing data to components), (4) Learn state (data that changes), (5) Try hooks (useState for simple state management). Start with a simple counter app to practice these concepts."
- "make a login page" → "Create a basic login page step-by-step: (1) Make an HTML form with email and password fields, (2) Add CSS to make it look nice, (3) Use JavaScript to check if fields are filled when user clicks submit, (4) Show a success message if everything looks good. Don't worry about real authentication yet - just focus on the form working."

Output ONLY the improved prompt. Keep it simple and encouraging.`;
  }

  /**
   * Auto-detect system prompt (smart detection based on prompt content)
   */
  private buildAutoPrompt(): string {
    return `You are an expert prompt improvement assistant for AI coding tools.

Your job is to rewrite vague prompts into clear, specific prompts while PRESERVING THE USER'S ORIGINAL INTENT AND EXPERIENCE LEVEL.

CRITICAL: Detect the user's experience level from their prompt:
- **Beginner indicators**: "teach me", "learn", "tutorial", "how do I", "what is", "I'm new to"
  → Use simple language, step-by-step guidance, avoid jargon
- **Developer indicators**: "implement", "refactor", "optimize", "production", "deploy", mentions specific tech stacks
  → Add TDD, best practices, architecture, error handling, security
- **Learner indicators**: Mentions specific topics/technologies but asks for explanation
  → Provide structured learning path with examples

Then identify what they're asking for:
- **LEARN**: Structured explanation with examples
- **BUILD**: Implementation details appropriate to their level
- **DEBUG**: Systematic debugging approach
- **EXPLAIN**: Clear breakdown of concepts

Guidelines:
1. **Match user's level**: Beginner → simple. Developer → professional.
2. **Add context**: Files, technologies, goals, constraints
3. **Clarify scope**: What's included, what's not
4. **Maintain tone**: Keep their original communication style

Examples:
- "teach me React hooks" (BEGINNER) → "Explain React hooks for beginners: what they are, why we use them instead of class components, and how to use useState and useEffect with simple examples like a counter and data fetching"
- "implement authentication with JWT" (DEVELOPER) → "Implement JWT-based authentication using TDD: (1) Write tests for login/register/refresh endpoints, (2) Hash passwords with bcrypt, (3) Generate/verify JWT tokens, (4) Implement refresh token rotation, (5) Add rate limiting, (6) Follow OWASP security guidelines"

Output ONLY the improved prompt.`;
  }

  /**
   * Builds the user prompt
   */
  private buildUserPrompt(vaguePrompt: string): string {
    return `Original prompt: "${vaguePrompt}"

Rewrite this to be clear and specific while preserving the user's intent and level. Output only the improved prompt:`;
  }

  /**
   * Cleans the enhanced prompt by removing quotes and meta-commentary
   */
  private cleanEnhancedPrompt(enhanced: string): string {
    // Remove surrounding quotes if present
    if ((enhanced.startsWith('"') && enhanced.endsWith('"')) || (enhanced.startsWith("'") && enhanced.endsWith("'"))) {
      enhanced = enhanced.slice(1, -1);
    }

    return enhanced.trim();
  }

  /**
   * Calculates confidence score for the rewrite
   * Based on length increase and specificity
   */
  private calculateConfidence(original: string, enhanced: string): number {
    const originalWords = original.split(/\s+/).length;
    const enhancedWords = enhanced.split(/\s+/).length;

    // More words generally means more detail (up to a point)
    const lengthRatio = Math.min(enhancedWords / originalWords, 3);
    const lengthScore = Math.min(lengthRatio / 3, 1);

    // Check for technical terms
    const technicalTerms = /\b(implement|refactor|optimize|debug|async|await|component|endpoint|query|schema)\b/gi;
    const technicalMatches = enhanced.match(technicalTerms) || [];
    const technicalScore = Math.min(technicalMatches.length / 3, 1);

    // Check for specific details
    const hasCodeReferences = /[\w/.]+\.(ts|js|tsx|jsx|py)/i.test(enhanced);
    const hasSteps = /\d+\.|step|first|then|finally/i.test(enhanced);
    const detailScore = (hasCodeReferences ? 0.3 : 0) + (hasSteps ? 0.3 : 0);

    // Combined confidence (0-1 scale)
    const confidence = lengthScore * 0.4 + technicalScore * 0.3 + detailScore * 0.3;

    return Math.min(confidence, 1);
  }
}
