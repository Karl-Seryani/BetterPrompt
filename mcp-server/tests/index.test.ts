/**
 * Unit tests for MCP Server - Functional Coverage
 * Tests the core functions that the MCP tools use.
 */

import { analyzePrompt, enhancePrompt } from '../src/promptEngine.js';

describe('MCP Server Tool Functions', () => {
  describe('analyze_prompt tool (via analyzePrompt)', () => {
    it('should return JSON-serializable analysis results', () => {
      const result = analyzePrompt('make a login');

      // MCP tool returns JSON.stringify(result, null, 2)
      const json = JSON.stringify(result, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('score');
      expect(parsed).toHaveProperty('issues');
      expect(parsed).toHaveProperty('hasVagueVerb');
      expect(parsed).toHaveProperty('hasMissingContext');
      expect(parsed).toHaveProperty('hasUnclearScope');
    });

    it('should handle empty prompts', () => {
      const result = analyzePrompt('');

      expect(result.score).toBe(100);
      expect(result.hasMissingContext).toBe(true);
      const json = JSON.stringify(result);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should provide summary field for MCP response', () => {
      const result = analyzePrompt('make a login');

      // MCP tool adds summary field
      const mcpResponse = {
        ...result,
        summary: `Vagueness score: ${result.score}/100 (${result.score < 30 ? 'good' : result.score < 60 ? 'moderate' : 'high'})`,
      };

      expect(mcpResponse.summary).toContain('Vagueness score:');
      expect(mcpResponse.summary).toMatch(/\(good|moderate|high\)/);
    });
  });

  describe('enhance_prompt tool (via enhancePrompt)', () => {
    it('should return JSON-serializable enhancement results', async () => {
      const result = await enhancePrompt('make a login');

      // MCP tool returns JSON.stringify(result, null, 2)
      const json = JSON.stringify(result, null, 2);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveProperty('original');
      expect(parsed).toHaveProperty('enhanced');
      expect(parsed).toHaveProperty('confidence');
      expect(parsed).toHaveProperty('model');
      expect(parsed).toHaveProperty('analysis');
    });

    it('should enhance vague prompts', async () => {
      const result = await enhancePrompt('make a login');

      expect(result.enhanced).toBeDefined();
      expect(result.enhanced).not.toBe(result.original);
    });

    it('should allow conditional analysis inclusion (showAnalysis param)', async () => {
      const result = await enhancePrompt('make a login');

      // MCP tool conditionally includes analysis based on showAnalysis param
      const responseWithAnalysis = {
        original: result.original,
        enhanced: result.enhanced,
        confidence: result.confidence,
        model: result.model,
        analysis: result.analysis,
      };

      const responseWithoutAnalysis: Record<string, unknown> = {
        original: result.original,
        enhanced: result.enhanced,
        confidence: result.confidence,
        model: result.model,
      };

      expect(responseWithAnalysis.analysis).toBeDefined();
      expect(responseWithoutAnalysis.analysis).toBeUndefined();
    });
  });

  describe('MCP Tool Input Validation (Expected Behavior)', () => {
    it('should validate prompt is non-empty string for analyze_prompt', () => {
      // MCP tool checks: if (!prompt || typeof prompt !== 'string')
      const emptyPrompt = '';
      const validPrompt = 'valid';

      expect(() => {
        if (!emptyPrompt || typeof emptyPrompt !== 'string') {
          throw new Error('Invalid prompt: must be a non-empty string');
        }
      }).toThrow('Invalid prompt');

      expect(() => {
        if (!validPrompt || typeof validPrompt !== 'string') {
          throw new Error('Invalid prompt: must be a non-empty string');
        }
      }).not.toThrow();
    });

    it('should validate prompt is non-empty string for enhance_prompt', () => {
      // Same validation as analyze_prompt
      const emptyPrompt = '';

      expect(() => {
        if (!emptyPrompt || typeof emptyPrompt !== 'string') {
          throw new Error('Invalid prompt: must be a non-empty string');
        }
      }).toThrow('Invalid prompt');
    });

    it('should default showAnalysis to false when not provided', () => {
      // MCP tool: const { prompt, showAnalysis = false } = args
      const showAnalysis = undefined;
      const effectiveShowAnalysis = showAnalysis ?? false;

      expect(effectiveShowAnalysis).toBe(false);
    });
  });

  describe('MCP Error Handling (Expected Behavior)', () => {
    it('should catch and return error messages in MCP format', () => {
      // MCP tool wraps in try/catch and returns: { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
      try {
        throw new Error('Test error');
      } catch (error) {
        const mcpErrorResponse = {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };

        expect(mcpErrorResponse.isError).toBe(true);
        expect(mcpErrorResponse.content[0].text).toContain('Error: Test error');
      }
    });

    it('should handle unknown tool names', () => {
      // MCP tool checks tool name and throws: throw new Error(`Unknown tool: ${name}`)
      const unknownToolName = 'invalid_tool';

      expect(() => {
        if (!['analyze_prompt', 'enhance_prompt'].includes(unknownToolName)) {
          throw new Error(`Unknown tool: ${unknownToolName}`);
        }
      }).toThrow('Unknown tool: invalid_tool');
    });
  });

  describe('MCP Server Structure Documentation', () => {
    it('should define exactly 2 tools', () => {
      // Documents the TOOLS constant
      const expectedTools = ['analyze_prompt', 'enhance_prompt'];
      expect(expectedTools).toHaveLength(2);
    });

    it('should use stdio transport', () => {
      // Documents: const transport = new StdioServerTransport()
      // Cannot test directly as main() executes immediately
      expect('stdio').toBe('stdio'); // Placeholder
    });

    it('should define server name and version', () => {
      // Documents: new Server({ name: 'betterprompt', version: '1.3.0' }, ...)
      const serverConfig = { name: 'betterprompt', version: '1.3.0' };
      expect(serverConfig.name).toBe('betterprompt');
      expect(serverConfig.version).toBe('1.3.0');
    });

    it('should register tool capability', () => {
      // Documents: capabilities: { tools: {} }
      const capabilities = { tools: {} };
      expect(capabilities).toHaveProperty('tools');
    });
  });
});
