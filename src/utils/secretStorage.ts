/**
 * SecretStorage utility for secure API key management
 * Uses VS Code's Secrets API instead of plain settings
 */

import * as vscode from 'vscode';

const GROQ_API_KEY = 'groqApiKey';

/**
 * Wrapper around VS Code's SecretStorage for managing API keys
 */
export class SecretStorage {
  private secrets: vscode.SecretStorage;

  constructor(context: vscode.ExtensionContext) {
    this.secrets = context.secrets;
  }

  /**
   * Get the Groq API key from secure storage
   * @returns The API key or empty string if not set
   */
  async getGroqApiKey(): Promise<string> {
    const key = await this.secrets.get(GROQ_API_KEY);
    return key || '';
  }

  /**
   * Store the Groq API key in secure storage
   * @param apiKey The API key to store (empty string deletes the key)
   */
  async setGroqApiKey(apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      await this.deleteGroqApiKey();
      return;
    }
    await this.secrets.store(GROQ_API_KEY, apiKey);
  }

  /**
   * Delete the Groq API key from secure storage
   */
  async deleteGroqApiKey(): Promise<void> {
    await this.secrets.delete(GROQ_API_KEY);
  }

  /**
   * Check if a Groq API key exists in secure storage
   */
  async hasGroqApiKey(): Promise<boolean> {
    const key = await this.getGroqApiKey();
    return key.length > 0;
  }

  /**
   * Migrate API key from old settings to secure storage
   * This is a one-time migration for users upgrading from older versions
   * @returns true if migration occurred, false otherwise
   */
  async migrateFromSettings(): Promise<boolean> {
    // Check if there's already a key in secrets
    const existingKey = await this.secrets.get(GROQ_API_KEY);
    if (existingKey) {
      return false; // Already have a key, don't migrate
    }

    // Check for old key in settings
    const config = vscode.workspace.getConfiguration('betterprompt');
    const oldKey = config.get<string>('groqApiKey', '');

    if (!oldKey || oldKey.trim().length === 0) {
      return false; // No old key to migrate
    }

    // Migrate: store in secrets and clear from settings
    await this.secrets.store(GROQ_API_KEY, oldKey);
    await config.update('groqApiKey', undefined, vscode.ConfigurationTarget.Global);

    return true;
  }
}

// Global instance for singleton pattern
let globalSecretStorage: SecretStorage | null = null;

/**
 * Initialize the global SecretStorage instance
 * Should be called once during extension activation
 */
export function initializeSecretStorage(context: vscode.ExtensionContext): SecretStorage {
  globalSecretStorage = new SecretStorage(context);
  return globalSecretStorage;
}

/**
 * Get the global SecretStorage instance
 * @throws Error if not initialized
 */
export function getSecretStorage(): SecretStorage {
  if (!globalSecretStorage) {
    throw new Error('SecretStorage not initialized. Call initializeSecretStorage first.');
  }
  return globalSecretStorage;
}

/**
 * Reset the global instance (for testing)
 */
export function resetSecretStorage(): void {
  globalSecretStorage = null;
}
