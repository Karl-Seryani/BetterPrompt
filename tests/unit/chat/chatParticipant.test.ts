import * as vscode from 'vscode';
import { registerChatParticipant } from '../../../src/chat/chatParticipant';
import { analyzePrompt } from '../../../src/analyzer/promptAnalyzer';
import { PromptRewriter } from '../../../src/rewriter/promptRewriter';

// Mock VS Code API
jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(),
  },
  chat: {
    createChatParticipant: jest.fn(),
  },
  LanguageModelChatMessage: {
    User: jest.fn((text: string) => ({ role: 'user', content: text })),
  },
  lm: {
    selectChatModels: jest.fn(),
  },
  Uri: {
    joinPath: jest.fn((_base, ...paths) => ({ path: paths.join('/') })),
  },
}));

// Mock analyzer
jest.mock('../../../src/analyzer/promptAnalyzer');

// Mock rewriter
jest.mock('../../../src/rewriter/promptRewriter');

describe('Chat Participant', () => {
  let mockContext: vscode.ExtensionContext;
  let mockParticipant: any;
  let mockStream: any;
  let mockToken: vscode.CancellationToken;
  let mockConfig: any;
  let chatHandler: (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => Promise<vscode.ChatResult>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock context
    mockContext = {
      subscriptions: [],
      extensionUri: { path: '/mock/extension/path' } as any,
    } as any;

    // Setup mock stream
    mockStream = {
      markdown: jest.fn(),
      button: jest.fn(),
      progress: jest.fn(),
    };

    // Setup mock cancellation token
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    } as any;

    // Setup mock config
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configs: Record<string, any> = {
          enabled: true,
          userLevel: 'auto',
          preferredModel: 'auto',
          chatMode: 'review',
          vaguenessThreshold: 30,
          groqApiKey: '',
        };
        return configs[key] ?? defaultValue;
      }),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Capture the chat handler
    (vscode.chat.createChatParticipant as jest.Mock).mockImplementation((_id, handler) => {
      chatHandler = handler;
      mockParticipant = {
        dispose: jest.fn(),
      };
      return mockParticipant;
    });
  });

  describe('registerChatParticipant', () => {
    it('should register chat participant with correct ID', () => {
      registerChatParticipant(mockContext);

      expect(vscode.chat.createChatParticipant).toHaveBeenCalledWith(
        'betterprompt.chat',
        expect.any(Function)
      );
    });

    it('should add participant to context subscriptions', () => {
      registerChatParticipant(mockContext);

      expect(mockContext.subscriptions).toContain(mockParticipant);
    });
  });

  describe('Chat Handler - Review Mode', () => {
    beforeEach(() => {
      registerChatParticipant(mockContext);

      // Mock analyzer
      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 65,
        issues: [
          {
            type: 'VAGUE_VERB',
            severity: 'MEDIUM',
            description: 'Uses vague verb "make"',
            suggestion: 'Use specific verbs',
          },
        ],
        hasVagueVerb: true,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      // Mock rewriter
      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: false,
          error: undefined,
          analysis: {
            score: 65,
            issues: [],
            hasVagueVerb: true,
            hasMissingContext: true,
            hasUnclearScope: false,
          },
          rewrite: {
            original: 'make a login',
            enhanced: 'Implement a user authentication system with email/password login',
            confidence: 0.85,
            model: 'gpt-4',
          },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);
    });

    it('should show analysis and enhancement in review mode', async () => {
      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('## 📊 Analysis Results'));
      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('**Vagueness Score:** 65/100'));
      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('## ✨ Enhanced Prompt'));
      expect(mockStream.markdown).toHaveBeenCalledWith(
        expect.stringContaining('Implement a user authentication system')
      );
    });

    it('should use config chatMode when no command specified', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'chatMode') return 'review';
        return undefined;
      });

      const mockRequest = {
        prompt: 'make a login',
        command: undefined,
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('## 📊 Analysis Results'));
    });

    it('should show model name used for enhancement', async () => {
      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
    });
  });

  describe('Chat Handler - Auto Mode', () => {
    let mockModel: any;

    beforeEach(() => {
      registerChatParticipant(mockContext);

      // Mock analyzer
      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 65,
        issues: [],
        hasVagueVerb: true,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      // Mock rewriter
      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: false,
          error: undefined,
          analysis: { score: 65, issues: [], hasVagueVerb: true, hasMissingContext: true, hasUnclearScope: false },
          rewrite: {
            original: 'make a login',
            enhanced: 'Implement a user authentication system with email/password login',
            confidence: 0.85,
            model: 'gpt-4',
          },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);

      // Mock language model
      mockModel = {
        id: 'gpt-4-turbo',
        family: 'gpt-4',
        sendRequest: jest.fn().mockReturnValue({
          text: (async function* () {
            yield 'Here is a login implementation...';
          })(),
        }),
      };

      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);
    });

    it('should send enhanced prompt to LM in auto mode', async () => {
      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockModel.sendRequest).toHaveBeenCalled();
      const messages = mockModel.sendRequest.mock.calls[0][0];
      expect(messages[0].content).toContain('Implement a user authentication system');
    });

    it('should stream LM response directly in auto mode', async () => {
      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith('Here is a login implementation...');
    });

    it('should prefer GPT-4 model when available', async () => {
      const gpt3Model = { id: 'gpt-3.5', family: 'gpt-3.5', sendRequest: jest.fn() };
      const gpt4Model = { id: 'gpt-4', family: 'gpt-4', sendRequest: jest.fn() };
      gpt4Model.sendRequest.mockReturnValue({
        text: (async function* () {
          yield 'Response';
        })(),
      });

      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([gpt3Model, gpt4Model]);

      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(gpt4Model.sendRequest).toHaveBeenCalled();
      expect(gpt3Model.sendRequest).not.toHaveBeenCalled();
    });

    it('should fall back to first available model if GPT-4 not found', async () => {
      const claudeModel = {
        id: 'claude',
        family: 'claude',
        sendRequest: jest.fn().mockReturnValue({
          text: (async function* () {
            yield 'Response';
          })(),
        }),
      };

      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([claudeModel]);

      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(claudeModel.sendRequest).toHaveBeenCalled();
    });
  });

  describe('Chat Handler - Error Handling', () => {
    beforeEach(() => {
      registerChatParticipant(mockContext);
    });

    it('should handle empty prompts gracefully', async () => {
      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 100,
        issues: [{ type: 'MISSING_CONTEXT', severity: 'HIGH', description: 'Prompt is empty' }],
        hasVagueVerb: false,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      const mockRequest = {
        prompt: '',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('provide a prompt'));
    });

    it('should handle enhancement errors gracefully in review mode', async () => {
      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: false,
          error: 'Enhancement failed',
          analysis: { score: 65, issues: [], hasVagueVerb: true, hasMissingContext: true, hasUnclearScope: false },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);

      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 65,
        issues: [],
        hasVagueVerb: true,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('Enhancement failed'));
    });

    it('should handle no models available in auto mode', async () => {
      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([]);

      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 65,
        issues: [],
        hasVagueVerb: true,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: false,
          error: undefined,
          analysis: { score: 65, issues: [], hasVagueVerb: true, hasMissingContext: true, hasUnclearScope: false },
          rewrite: {
            original: 'make a login',
            enhanced: 'Implement authentication',
            confidence: 0.85,
            model: 'gpt-4',
          },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);

      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('No language model available'));
    });

    it('should handle LM request errors in auto mode', async () => {
      const mockModel = {
        id: 'gpt-4',
        family: 'gpt-4',
        sendRequest: jest.fn().mockRejectedValue(new Error('LM request failed')),
      };

      (vscode.lm.selectChatModels as jest.Mock).mockResolvedValue([mockModel]);

      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 65,
        issues: [],
        hasVagueVerb: true,
        hasMissingContext: true,
        hasUnclearScope: false,
      });

      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: false,
          error: undefined,
          analysis: { score: 65, issues: [], hasVagueVerb: true, hasMissingContext: true, hasUnclearScope: false },
          rewrite: {
            original: 'make a login',
            enhanced: 'Implement authentication',
            confidence: 0.85,
            model: 'gpt-4',
          },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);

      const mockRequest = {
        prompt: 'make a login',
        command: 'auto',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(mockStream.markdown).toHaveBeenCalledWith(expect.stringContaining('Error'));
    });
  });

  describe('Configuration Reading', () => {
    beforeEach(() => {
      registerChatParticipant(mockContext);

      (analyzePrompt as jest.Mock).mockReturnValue({
        score: 20,
        issues: [],
        hasVagueVerb: false,
        hasMissingContext: false,
        hasUnclearScope: false,
      });

      const mockRewriterInstance = {
        processPrompt: jest.fn().mockResolvedValue({
          skipped: true,
          error: undefined,
          analysis: { score: 20, issues: [], hasVagueVerb: false, hasMissingContext: false, hasUnclearScope: false },
        }),
      };
      (PromptRewriter as jest.Mock).mockReturnValue(mockRewriterInstance);
    });

    it('should read userLevel from config', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'userLevel') return 'developer';
        return undefined;
      });

      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(PromptRewriter).toHaveBeenCalledWith(
        expect.objectContaining({
          userLevel: 'developer',
        })
      );
    });

    it('should read preferredModel from config', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'preferredModel') return 'claude';
        return undefined;
      });

      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(PromptRewriter).toHaveBeenCalledWith(
        expect.objectContaining({
          preferredModel: 'claude',
        })
      );
    });

    it('should read vaguenessThreshold from config', async () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'vaguenessThreshold') return 50;
        return undefined;
      });

      const mockRequest = {
        prompt: 'make a login',
        command: 'review',
      } as vscode.ChatRequest;

      await chatHandler(mockRequest, {} as any, mockStream, mockToken);

      expect(PromptRewriter).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 50,
        })
      );
    });
  });
});