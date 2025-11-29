/**
 * Tests for logger utility
 */

// Mock vscode BEFORE import
const mockOutputChannel = {
  appendLine: jest.fn(),
  show: jest.fn(),
  clear: jest.fn(),
};

const mockCreateOutputChannel = jest.fn().mockReturnValue(mockOutputChannel);
const mockGetConfiguration = jest.fn().mockReturnValue({
  get: jest.fn((key: string, defaultValue: boolean) => {
    if (key === 'debugLogging') {
      return false; // Default: debug logging off
    }
    return defaultValue;
  }),
});

jest.mock('vscode', () => ({
  window: {
    createOutputChannel: mockCreateOutputChannel,
  },
  workspace: {
    getConfiguration: mockGetConfiguration,
  },
}));

import { logger } from '../../../src/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOutputChannel.appendLine.mockClear();
    mockOutputChannel.show.mockClear();
    mockOutputChannel.clear.mockClear();

    mockGetConfiguration.mockReturnValue({
      get: jest.fn((key: string, defaultValue: boolean) => {
        if (key === 'debugLogging') {
          return false; // Default: debug logging off
        }
        return defaultValue;
      }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('debug()', () => {
    it('should NOT log debug messages when debug logging is disabled', () => {
      logger.updateDebugSetting();
      logger.debug('Test debug message');

      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('should log debug messages when debug logging is enabled', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn(() => true), // Debug logging enabled
      });

      logger.updateDebugSetting();
      logger.debug('Test debug message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[DEBUG\] Test debug message/)
      );
    });

    it('should include arguments in debug log', () => {
      mockGetConfiguration.mockReturnValue({
        get: jest.fn(() => true),
      });

      logger.updateDebugSetting();
      logger.debug('Context detected', { file: 'test.ts', stack: ['React'] });

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[DEBUG\] Context detected.*file.*test\.ts/)
      );
    });
  });

  describe('info()', () => {
    it('should always log info messages regardless of debug setting', () => {
      logger.updateDebugSetting(); // Debug off
      logger.info('Extension activated');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] \[INFO\] Extension activated/)
      );
    });

    it('should include timestamp in info log', () => {
      logger.info('Test info');

      const call = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('warn()', () => {
    it('should always log warnings', () => {
      logger.warn('Rate limit approaching');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[WARN\] Rate limit approaching/)
      );
    });

    it('should include arguments in warning', () => {
      logger.warn('Fallback activated', { reason: 'Copilot unavailable' });

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[WARN\] Fallback activated.*Copilot unavailable/)
      );
    });
  });

  describe('error()', () => {
    it('should log error message', () => {
      logger.error('API call failed');

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringMatching(/\[ERROR\] API call failed/)
      );
    });

    it('should include error stack when Error object provided', () => {
      const error = new Error('Network timeout');
      logger.error('Request failed', error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2);
      expect(mockOutputChannel.appendLine).toHaveBeenNthCalledWith(
        1,
        expect.stringMatching(/\[ERROR\] Request failed/)
      );
      expect(mockOutputChannel.appendLine).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/Stack:.*Network timeout/)
      );
    });

    it('should stringify non-Error objects', () => {
      logger.error('Unknown error', { code: 500, message: 'Server error' });

      expect(mockOutputChannel.appendLine).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/Details:.*code.*500/)
      );
    });
  });

  describe('show()', () => {
    it('should show the output channel', () => {
      logger.show();

      expect(mockOutputChannel.show).toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should clear the output channel', () => {
      logger.clear();

      expect(mockOutputChannel.clear).toHaveBeenCalled();
    });
  });
});
