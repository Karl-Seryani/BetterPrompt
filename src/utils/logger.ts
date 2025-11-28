/**
 * Debug logger for BetterPrompt
 * Outputs to VS Code Output panel when debug logging is enabled
 */

import * as vscode from 'vscode';

class Logger {
  private outputChannel?: vscode.OutputChannel;
  private debugEnabled: boolean = false;

  /**
   * Lazy-initialize output channel (for test compatibility)
   */
  private ensureOutputChannel(): vscode.OutputChannel {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('BetterPrompt');
      this.updateDebugSetting();
    }
    return this.outputChannel;
  }

  /**
   * Update debug setting from VS Code configuration
   */
  public updateDebugSetting(): void {
    const config = vscode.workspace.getConfiguration('betterprompt');
    this.debugEnabled = config.get<boolean>('debugLogging', false);
  }

  /**
   * Log debug message (only when debug logging enabled)
   */
  public debug(message: string, ...args: unknown[]): void {
    if (!this.debugEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    this.ensureOutputChannel().appendLine(`[${timestamp}] [DEBUG] ${message}${formattedArgs}`);
  }

  /**
   * Log info message (always shown, regardless of debug setting)
   */
  public info(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    this.ensureOutputChannel().appendLine(`[${timestamp}] [INFO] ${message}${formattedArgs}`);
  }

  /**
   * Log warning message (always shown)
   */
  public warn(message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    this.ensureOutputChannel().appendLine(`[${timestamp}] [WARN] ${message}${formattedArgs}`);
  }

  /**
   * Log error message (always shown)
   */
  public error(message: string, error?: unknown): void {
    const timestamp = new Date().toISOString();
    const channel = this.ensureOutputChannel();
    channel.appendLine(`[${timestamp}] [ERROR] ${message}`);

    if (error) {
      if (error instanceof Error) {
        channel.appendLine(`  Stack: ${error.stack}`);
      } else {
        channel.appendLine(`  Details: ${JSON.stringify(error)}`);
      }
    }
  }

  /**
   * Show the output panel (useful for showing logs to user)
   */
  public show(): void {
    this.ensureOutputChannel().show();
  }

  /**
   * Clear all logs
   */
  public clear(): void {
    this.ensureOutputChannel().clear();
  }
}

// Global singleton instance
export const logger = new Logger();
