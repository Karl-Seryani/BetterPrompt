/**
 * Tests for SecretStorage utility
 * Handles secure storage of API keys using VS Code Secrets API
 */

import {
  SecretStorage,
  initializeSecretStorage,
  getSecretStorage,
  resetSecretStorage,
} from '../../../src/utils/secretStorage';

// Mock VS Code
const mockSecrets = {
  get: jest.fn(),
  store: jest.fn(),
  delete: jest.fn(),
  onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
};

const mockContext = {
  secrets: mockSecrets,
  subscriptions: [],
} as any;

// Mock vscode workspace configuration for migration
const mockConfig = {
  get: jest.fn(),
  update: jest.fn(),
};

jest.mock('vscode', () => ({
  workspace: {
    getConfiguration: jest.fn(() => mockConfig),
  },
  ConfigurationTarget: {
    Global: 1,
  },
}));

describe('SecretStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecrets.get.mockReset();
    mockSecrets.store.mockReset();
    mockSecrets.delete.mockReset();
    mockConfig.get.mockReset();
    mockConfig.update.mockReset();
    // Reset global instance before each test
    resetSecretStorage();
  });

  describe('initialization', () => {
    it('should create SecretStorage instance with extension context', () => {
      const storage = new SecretStorage(mockContext);
      expect(storage).toBeInstanceOf(SecretStorage);
    });

    it('should initialize global instance via initializeSecretStorage', () => {
      initializeSecretStorage(mockContext);
      const instance = getSecretStorage();
      expect(instance).toBeInstanceOf(SecretStorage);
    });

    it('should throw if getSecretStorage called before initialization', () => {
      // resetSecretStorage was called in beforeEach, so global is null
      expect(() => getSecretStorage()).toThrow('SecretStorage not initialized');
    });
  });

  describe('getGroqApiKey', () => {
    it('should return API key from secrets storage', async () => {
      mockSecrets.get.mockResolvedValue('gsk_test_key_12345');

      const storage = new SecretStorage(mockContext);
      const key = await storage.getGroqApiKey();

      expect(key).toBe('gsk_test_key_12345');
      expect(mockSecrets.get).toHaveBeenCalledWith('groqApiKey');
    });

    it('should return empty string if no key stored', async () => {
      mockSecrets.get.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      const key = await storage.getGroqApiKey();

      expect(key).toBe('');
    });

    it('should return empty string if secrets.get returns null', async () => {
      mockSecrets.get.mockResolvedValue(null);

      const storage = new SecretStorage(mockContext);
      const key = await storage.getGroqApiKey();

      expect(key).toBe('');
    });
  });

  describe('setGroqApiKey', () => {
    it('should store API key in secrets storage', async () => {
      mockSecrets.store.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      await storage.setGroqApiKey('gsk_new_key_67890');

      expect(mockSecrets.store).toHaveBeenCalledWith('groqApiKey', 'gsk_new_key_67890');
    });

    it('should delete key when empty string provided', async () => {
      mockSecrets.delete.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      await storage.setGroqApiKey('');

      expect(mockSecrets.delete).toHaveBeenCalledWith('groqApiKey');
      expect(mockSecrets.store).not.toHaveBeenCalled();
    });

    it('should delete key when whitespace-only string provided', async () => {
      mockSecrets.delete.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      await storage.setGroqApiKey('   ');

      expect(mockSecrets.delete).toHaveBeenCalledWith('groqApiKey');
    });
  });

  describe('deleteGroqApiKey', () => {
    it('should delete API key from secrets storage', async () => {
      mockSecrets.delete.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      await storage.deleteGroqApiKey();

      expect(mockSecrets.delete).toHaveBeenCalledWith('groqApiKey');
    });
  });

  describe('hasGroqApiKey', () => {
    it('should return true when key exists and is non-empty', async () => {
      mockSecrets.get.mockResolvedValue('gsk_test_key');

      const storage = new SecretStorage(mockContext);
      const hasKey = await storage.hasGroqApiKey();

      expect(hasKey).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockSecrets.get.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      const hasKey = await storage.hasGroqApiKey();

      expect(hasKey).toBe(false);
    });

    it('should return false when key is empty string', async () => {
      mockSecrets.get.mockResolvedValue('');

      const storage = new SecretStorage(mockContext);
      const hasKey = await storage.hasGroqApiKey();

      expect(hasKey).toBe(false);
    });
  });

  describe('migrateFromSettings', () => {
    it('should migrate API key from settings to secrets', async () => {
      // Old key exists in settings
      mockConfig.get.mockReturnValue('gsk_old_settings_key');
      mockSecrets.get.mockResolvedValue(undefined); // No key in secrets yet
      mockSecrets.store.mockResolvedValue(undefined);
      mockConfig.update.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      const migrated = await storage.migrateFromSettings();

      expect(migrated).toBe(true);
      expect(mockSecrets.store).toHaveBeenCalledWith('groqApiKey', 'gsk_old_settings_key');
      // Should clear the old setting
      expect(mockConfig.update).toHaveBeenCalledWith('groqApiKey', undefined, 1);
    });

    it('should not migrate if no key in settings', async () => {
      mockConfig.get.mockReturnValue('');
      mockSecrets.get.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      const migrated = await storage.migrateFromSettings();

      expect(migrated).toBe(false);
      expect(mockSecrets.store).not.toHaveBeenCalled();
    });

    it('should not migrate if key already exists in secrets', async () => {
      mockConfig.get.mockReturnValue('gsk_old_key');
      mockSecrets.get.mockResolvedValue('gsk_existing_secret_key'); // Already has key

      const storage = new SecretStorage(mockContext);
      const migrated = await storage.migrateFromSettings();

      expect(migrated).toBe(false);
      expect(mockSecrets.store).not.toHaveBeenCalled();
    });

    it('should handle undefined settings value', async () => {
      mockConfig.get.mockReturnValue(undefined);
      mockSecrets.get.mockResolvedValue(undefined);

      const storage = new SecretStorage(mockContext);
      const migrated = await storage.migrateFromSettings();

      expect(migrated).toBe(false);
    });
  });
});
