/**
 * Database schema definitions for PromptForge
 * Uses SQLite for local storage
 */

export const DATABASE_SCHEMA = {
  /**
   * SQL statement to create the user_templates table
   * Stores custom and default prompt templates
   */
  CREATE_USER_TEMPLATES: `
    CREATE TABLE IF NOT EXISTS user_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      category TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `,

  /**
   * SQL statement to create the prompt_history table
   * Tracks all prompt optimizations and user acceptance
   */
  CREATE_PROMPT_HISTORY: `
    CREATE TABLE IF NOT EXISTS prompt_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_prompt TEXT NOT NULL,
      enhanced_prompt TEXT NOT NULL,
      accepted INTEGER NOT NULL DEFAULT 0,
      tokens_saved INTEGER DEFAULT 0,
      timestamp INTEGER NOT NULL,
      template_used TEXT
    )
  `,

  /**
   * SQL statement to create the analytics table
   * Stores metrics for analytics dashboard
   */
  CREATE_ANALYTICS: `
    CREATE TABLE IF NOT EXISTS analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_name TEXT NOT NULL,
      value REAL NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `,

  /**
   * Create index on prompt_history timestamp for faster queries
   */
  CREATE_PROMPT_HISTORY_INDEX: `
    CREATE INDEX IF NOT EXISTS idx_prompt_history_timestamp
    ON prompt_history(timestamp)
  `,

  /**
   * Create index on analytics for faster dashboard queries
   */
  CREATE_ANALYTICS_INDEX: `
    CREATE INDEX IF NOT EXISTS idx_analytics_metric_timestamp
    ON analytics(metric_name, timestamp)
  `,
};

/**
 * TypeScript interfaces matching database schema
 */

export interface UserTemplate {
  id?: number;
  name: string;
  content: string;
  category?: string;
  created_at: number;
  updated_at: number;
}

export interface PromptHistory {
  id?: number;
  original_prompt: string;
  enhanced_prompt: string;
  accepted: boolean;
  tokens_saved?: number;
  timestamp: number;
  template_used?: string;
}

export interface AnalyticsEntry {
  id?: number;
  metric_name: string;
  value: number;
  timestamp: number;
}

/**
 * Predefined metric names for analytics
 */
export enum MetricName {
  PROMPTS_ANALYZED = 'prompts_analyzed',
  PROMPTS_ACCEPTED = 'prompts_accepted',
  PROMPTS_REJECTED = 'prompts_rejected',
  TOTAL_TOKENS_SAVED = 'total_tokens_saved',
  AVERAGE_PROMPT_LENGTH = 'average_prompt_length',
  AVERAGE_ENHANCEMENT_LENGTH = 'average_enhancement_length',
}
