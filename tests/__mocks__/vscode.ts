/**
 * Mock VS Code API for testing
 */

export class LanguageModelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LanguageModelError';
  }
}

export const LanguageModelChatMessage = {
  User: jest.fn((content: string) => ({ role: 'user', content })),
  Assistant: jest.fn((content: string) => ({ role: 'assistant', content })),
};

export class CancellationTokenSource {
  token = { isCancellationRequested: false };
}

export const lm = {
  selectChatModels: jest.fn(),
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInputBox: jest.fn(),
  showQuickPick: jest.fn(),
  withProgress: jest.fn(),
};

export const workspace = {
  getConfiguration: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  registerTextEditorCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export const env = {
  openExternal: jest.fn(),
  clipboard: {
    writeText: jest.fn(),
  },
};

export const Uri = {
  parse: jest.fn((str: string) => ({ toString: () => str })),
};

export const ProgressLocation = {
  Notification: 15,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};
