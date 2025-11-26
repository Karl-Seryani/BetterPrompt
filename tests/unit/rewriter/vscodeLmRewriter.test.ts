/**
 * Unit tests for VS Code Language Model Rewriter
 */

import { VsCodeLmRewriter, isVsCodeLmAvailable } from '../../../src/rewriter/vscodeLmRewriter';
import * as vscode from 'vscode';

describe('VS Code Language Model Rewriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isVsCodeLmAvailable', () => {
    it('should return true when models are available', async () => {
      const mockModels = [{ family: 'gpt-4', vendor: 'copilot' }];
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue(mockModels);

      const result = await isVsCodeLmAvailable();

      expect(result).toBe(true);
      expect(vscode.lm.selectChatModels).toHaveBeenCalled();
    });

    it('should return false when no models are available', async () => {
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([]);

      const result = await isVsCodeLmAvailable();

      expect(result).toBe(false);
    });

    it('should return false when API throws error', async () => {
      (vscode.lm.selectChatModels as jest.Mock).mockRejectedValue(new Error('API not available'));

      const result = await isVsCodeLmAvailable();

      expect(result).toBe(false);
    });
  });

  describe('VsCodeLmRewriter', () => {
    const createMockModel = (family = 'gpt-4', vendor = 'copilot') => ({
      family,
      vendor,
      sendRequest: jest.fn().mockResolvedValue({
        text: (async function* () {
          yield 'Implement a secure authentication system using TDD: ';
          yield '(1) Write tests for login/register endpoints, ';
          yield '(2) Hash passwords with bcrypt, ';
          yield '(3) Implement JWT tokens';
        })(),
      }),
    });

    describe('enhancePrompt', () => {
      it('should throw error for empty prompt', async () => {
        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });

        await expect(rewriter.enhancePrompt('')).rejects.toThrow('Prompt cannot be empty');
        await expect(rewriter.enhancePrompt('   ')).rejects.toThrow('Prompt cannot be empty');
      });

      it('should throw error when no models are available', async () => {
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([]);
        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });

        await expect(rewriter.enhancePrompt('make a login')).rejects.toThrow(
          'No language models available. Make sure GitHub Copilot is installed and active.'
        );
      });

      it('should prefer GPT-4 models when available', async () => {
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        const gpt35Model = createMockModel('gpt-3.5-turbo', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt35Model, gpt4Model]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        const result = await rewriter.enhancePrompt('make a login');

        expect(result.model).toBe('copilot/gpt-4');
        expect(gpt4Model.sendRequest).toHaveBeenCalled();
      });

      it('should prefer Claude models when GPT-4 not available', async () => {
        const claudeModel = createMockModel('claude-3', 'anthropic');
        const gpt35Model = createMockModel('gpt-3.5-turbo', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt35Model, claudeModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        const result = await rewriter.enhancePrompt('make a login');

        expect(result.model).toBe('anthropic/claude-3');
        expect(claudeModel.sendRequest).toHaveBeenCalled();
      });

      it('should use first available model as fallback', async () => {
        const mockModel = createMockModel('unknown-model', 'unknown-vendor');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });
        const result = await rewriter.enhancePrompt('make a login');

        expect(result.model).toBe('unknown-vendor/unknown-model');
        expect(mockModel.sendRequest).toHaveBeenCalled();
      });

      it('should return enhanced prompt with correct structure', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        const result = await rewriter.enhancePrompt('make a login');

        expect(result).toMatchObject({
          original: 'make a login',
          enhanced: expect.stringContaining('TDD'),
          model: 'copilot/gpt-4',
          tokensUsed: undefined,
          confidence: expect.any(Number),
        });
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });

      it('should stream and concatenate response fragments', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        const result = await rewriter.enhancePrompt('make a login');

        expect(result.enhanced).toContain('TDD');
        expect(result.enhanced).toContain('bcrypt');
        expect(result.enhanced).toContain('JWT');
      });

      it('should remove surrounding quotes from enhanced prompt', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockResolvedValue({
            text: (async function* () {
              yield '"Quoted enhanced prompt"';
            })(),
          }),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });
        const result = await rewriter.enhancePrompt('test prompt');

        expect(result.enhanced).toBe('Quoted enhanced prompt');
        expect(result.enhanced).not.toContain('"');
      });
    });

    describe('intelligent prompt system', () => {
      it('should detect intent categories in prompt', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        await rewriter.enhancePrompt('make a login');

        const systemMessage = mockModel.sendRequest.mock.calls[0][0][0].content;
        // System prompt should have intent detection
        expect(systemMessage).toContain('BUILD');
        expect(systemMessage).toContain('LEARN');
        expect(systemMessage).toContain('FIX');
      });

      it('should use same intelligent prompt regardless of userLevel', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'beginner' });
        await rewriter.enhancePrompt('make a login');

        const systemMessage = mockModel.sendRequest.mock.calls[0][0][0].content;
        // All modes now use the same intelligent prompt with intent detection
        expect(systemMessage).toContain('detect the user');
        expect(systemMessage).toContain('INTENT');
      });

      it('should include scope awareness', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });
        await rewriter.enhancePrompt('make a login');

        const systemMessage = mockModel.sendRequest.mock.calls[0][0][0].content;
        expect(systemMessage).toContain('Small task');
        expect(systemMessage).toContain('Large task');
      });

      it('should use intelligent prompt by default', async () => {
        const mockModel = createMockModel();
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({});
        await rewriter.enhancePrompt('test prompt');

        const systemMessage = mockModel.sendRequest.mock.calls[0][0][0].content;
        expect(systemMessage).toContain('prompt enhancement');
      });
    });

    describe('error handling', () => {
      it('should handle permission errors gracefully', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockRejectedValue(new vscode.LanguageModelError('User consent not given')),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });

        await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Language model access denied');
      });

      it('should handle blocked/policy errors gracefully', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockRejectedValue(new vscode.LanguageModelError('Request blocked by policy')),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });

        await expect(rewriter.enhancePrompt('test')).rejects.toThrow('Request was blocked');
      });

      it('should handle generic errors', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockRejectedValue(new Error('Network error')),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'auto' });

        await expect(rewriter.enhancePrompt('test')).rejects.toThrow('VS Code Language Model error: Network error');
      });
    });

    describe('confidence calculation', () => {
      it('should calculate higher confidence for detailed enhancements', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockResolvedValue({
            text: (async function* () {
              yield 'Implement authentication with: (1) tests, (2) bcrypt, (3) JWT, (4) rate limiting in auth.ts';
            })(),
          }),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'developer' });
        const result = await rewriter.enhancePrompt('make login');

        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should calculate lower confidence for simple enhancements', async () => {
        const mockModel = {
          ...createMockModel(),
          sendRequest: jest.fn().mockResolvedValue({
            text: (async function* () {
              yield 'Create a login form';
            })(),
          }),
        };
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

        const rewriter = new VsCodeLmRewriter({ userLevel: 'beginner' });
        const result = await rewriter.enhancePrompt('make login');

        expect(result.confidence).toBeLessThan(0.8);
      });
    });

    describe('Model Selection with preferredModel', () => {
      it('should prefer GPT-4 models when preferredModel is "gpt-4"', async () => {
        const gpt3Model = createMockModel('gpt-3.5', 'copilot');
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt3Model, gpt4Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'gpt-4' });
        await rewriter.enhancePrompt('make login');

        expect(gpt4Model.sendRequest).toHaveBeenCalled();
        expect(gpt3Model.sendRequest).not.toHaveBeenCalled();
      });

      it('should throw error if GPT-4 not available when preferred', async () => {
        const gpt3Model = createMockModel('gpt-3.5', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt3Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'gpt-4' });

        await expect(rewriter.enhancePrompt('make login')).rejects.toThrow('GPT-4 model not available');
      });

      it('should prefer Claude models when preferredModel is "claude"', async () => {
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        const claudeModel = createMockModel('claude', 'anthropic');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt4Model, claudeModel]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'claude' });
        await rewriter.enhancePrompt('make login');

        expect(claudeModel.sendRequest).toHaveBeenCalled();
        expect(gpt4Model.sendRequest).not.toHaveBeenCalled();
      });

      it('should throw error if Claude not available when preferred', async () => {
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt4Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'claude' });

        await expect(rewriter.enhancePrompt('make login')).rejects.toThrow('Claude model not available');
      });

      it('should throw error when preferredModel is "groq"', async () => {
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt4Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'groq' });

        await expect(rewriter.enhancePrompt('make login')).rejects.toThrow('User prefers Groq API');
      });

      it('should use auto mode (GPT-4 > Claude > first available) when preferredModel is "auto"', async () => {
        const claudeModel = createMockModel('claude', 'anthropic');
        const gpt3Model = createMockModel('gpt-3.5', 'copilot');
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([claudeModel, gpt3Model, gpt4Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'auto' });
        await rewriter.enhancePrompt('make login');

        // Should prefer GPT-4 over Claude and GPT-3.5
        expect(gpt4Model.sendRequest).toHaveBeenCalled();
        expect(claudeModel.sendRequest).not.toHaveBeenCalled();
        expect(gpt3Model.sendRequest).not.toHaveBeenCalled();
      });

      it('should fall back to Claude when GPT-4 not available in auto mode', async () => {
        const gpt3Model = createMockModel('gpt-3.5', 'copilot');
        const claudeModel = createMockModel('claude', 'anthropic');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt3Model, claudeModel]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'auto' });
        await rewriter.enhancePrompt('make login');

        // Should prefer Claude over GPT-3.5
        expect(claudeModel.sendRequest).toHaveBeenCalled();
        expect(gpt3Model.sendRequest).not.toHaveBeenCalled();
      });

      it('should use first available model in auto mode when neither GPT-4 nor Claude available', async () => {
        const gpt3Model = createMockModel('gpt-3.5', 'copilot');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt3Model]);

        const rewriter = new VsCodeLmRewriter({ preferredModel: 'auto' });
        await rewriter.enhancePrompt('make login');

        expect(gpt3Model.sendRequest).toHaveBeenCalled();
      });

      it('should default to "auto" mode when preferredModel is not specified', async () => {
        const gpt4Model = createMockModel('gpt-4', 'copilot');
        const claudeModel = createMockModel('claude', 'anthropic');
        (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([claudeModel, gpt4Model]);

        const rewriter = new VsCodeLmRewriter({}); // No preferredModel specified
        await rewriter.enhancePrompt('make login');

        // Should prefer GPT-4 (auto mode behavior)
        expect(gpt4Model.sendRequest).toHaveBeenCalled();
      });
    });
  });
});
