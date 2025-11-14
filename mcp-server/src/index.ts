#!/usr/bin/env node

/**
 * PromptCraft MCP Server
 * Provides intelligent prompt enhancement tools for AI assistants via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import analyzer logic (we'll copy it here for now)
import { analyzePrompt, enhancePrompt } from './promptEngine.js';

// Define tools
const TOOLS: Tool[] = [
  {
    name: 'analyze_prompt',
    description:
      'Analyzes a prompt for vagueness, missing context, and unclear scope. Returns a vagueness score (0-100, higher = more vague) and detected issues. Use this before enhancing a prompt to understand what needs improvement.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The user prompt to analyze for vagueness',
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'enhance_prompt',
    description:
      'Enhances a vague prompt to be more specific, clear, and actionable. Automatically detects user experience level (beginner/developer/auto) and tailors the enhancement accordingly. Returns both the original and enhanced versions with confidence score.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The vague prompt to enhance',
        },
        userLevel: {
          type: 'string',
          enum: ['auto', 'beginner', 'developer'],
          description:
            'User experience level: auto (smart detection), beginner (step-by-step), developer (TDD + best practices)',
          default: 'auto',
        },
        showAnalysis: {
          type: 'boolean',
          description: 'Include vagueness analysis in the response',
          default: false,
        },
      },
      required: ['prompt'],
    },
  },
];

// Create MCP server instance
const server = new Server(
  {
    name: 'promptcraft',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_prompt': {
        const { prompt } = args as { prompt: string };

        if (!prompt || typeof prompt !== 'string') {
          throw new Error('Invalid prompt: must be a non-empty string');
        }

        const analysis = analyzePrompt(prompt);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  score: analysis.score,
                  issues: analysis.issues.map((issue) => ({
                    type: issue.type,
                    severity: issue.severity,
                    description: issue.description,
                    suggestion: issue.suggestion,
                  })),
                  summary: `Vagueness score: ${analysis.score}/100 (${analysis.score < 30 ? 'good' : analysis.score < 60 ? 'moderate' : 'high'})`,
                  hasVagueVerb: analysis.hasVagueVerb,
                  hasMissingContext: analysis.hasMissingContext,
                  hasUnclearScope: analysis.hasUnclearScope,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'enhance_prompt': {
        const { prompt, userLevel = 'auto', showAnalysis = false } = args as {
          prompt: string;
          userLevel?: 'auto' | 'beginner' | 'developer';
          showAnalysis?: boolean;
        };

        if (!prompt || typeof prompt !== 'string') {
          throw new Error('Invalid prompt: must be a non-empty string');
        }

        const result = await enhancePrompt(prompt, userLevel);

        const response: Record<string, unknown> = {
          original: result.original,
          enhanced: result.enhanced,
          confidence: result.confidence,
          model: result.model,
        };

        if (showAnalysis) {
          response.analysis = {
            score: result.analysis.score,
            issues: result.analysis.issues.map((issue) => ({
              type: issue.type,
              description: issue.description,
            })),
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PromptCraft MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
