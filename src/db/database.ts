import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { DATABASE_SCHEMA, UserTemplate, PromptHistory, AnalyticsEntry } from './schema';

/**
 * Database manager class for BetterPrompt using sql.js
 * sql.js is a pure JavaScript implementation that doesn't require native compilation
 */
export class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized = false;

  constructor(storagePath: string) {
    this.dbPath = path.join(storagePath, 'betterprompt.db');
  }

  /**
   * Initialize the database connection and create tables
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    // Initialize sql.js
    const SQL = await initSqlJs();

    // Check if database file exists
    let buffer: Buffer | undefined;
    if (fs.existsSync(this.dbPath)) {
      buffer = fs.readFileSync(this.dbPath);
    }

    // Create or open database
    this.db = new SQL.Database(buffer);
    this.createTables();
    this.initialized = true;
  }

  /**
   * Create all required database tables and indexes
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(DATABASE_SCHEMA.CREATE_USER_TEMPLATES);
    this.db.run(DATABASE_SCHEMA.CREATE_PROMPT_HISTORY);
    this.db.run(DATABASE_SCHEMA.CREATE_ANALYTICS);
    this.db.run(DATABASE_SCHEMA.CREATE_PROMPT_HISTORY_INDEX);
    this.db.run(DATABASE_SCHEMA.CREATE_ANALYTICS_INDEX);
  }

  /**
   * Save database to disk
   */
  private save(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  /**
   * Insert a new user template
   */
  public insertTemplate(template: Omit<UserTemplate, 'id'>): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(
      `INSERT INTO user_templates (name, content, category, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [template.name, template.content, template.category || null, template.created_at, template.updated_at]
    );

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    this.save();

    return result[0].values[0][0] as number;
  }

  /**
   * Get all user templates
   */
  public getAllTemplates(): UserTemplate[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec('SELECT * FROM user_templates ORDER BY created_at DESC');

    if (!result.length || !result[0].values.length) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row: unknown[]) => {
      const template: Record<string, unknown> = {};
      columns.forEach((col: string, idx: number) => {
        template[col] = row[idx];
      });
      return template as unknown as UserTemplate;
    });
  }

  /**
   * Insert a prompt history entry
   */
  public insertPromptHistory(history: Omit<PromptHistory, 'id'>): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(
      `INSERT INTO prompt_history
       (original_prompt, enhanced_prompt, accepted, tokens_saved, timestamp, template_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        history.original_prompt,
        history.enhanced_prompt,
        history.accepted ? 1 : 0,
        history.tokens_saved || 0,
        history.timestamp,
        history.template_used || null,
      ]
    );

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    this.save();

    return result[0].values[0][0] as number;
  }

  /**
   * Get prompt history with optional limit
   */
  public getPromptHistory(limit = 50): PromptHistory[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec(
      `SELECT * FROM prompt_history
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );

    if (!result.length || !result[0].values.length) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row: unknown[]) => {
      const entry: Record<string, unknown> = {};
      columns.forEach((col: string, idx: number) => {
        if (col === 'accepted') {
          entry[col] = row[idx] === 1;
        } else {
          entry[col] = row[idx];
        }
      });
      return entry as unknown as PromptHistory;
    });
  }

  /**
   * Insert an analytics entry
   */
  public insertAnalytics(entry: Omit<AnalyticsEntry, 'id'>): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.run(`INSERT INTO analytics (metric_name, value, timestamp) VALUES (?, ?, ?)`, [
      entry.metric_name,
      entry.value,
      entry.timestamp,
    ]);

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    this.save();

    return result[0].values[0][0] as number;
  }

  /**
   * Get analytics data for a specific metric
   */
  public getAnalytics(metricName: string, limit = 100): AnalyticsEntry[] {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const result = this.db.exec(
      `SELECT * FROM analytics
       WHERE metric_name = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [metricName, limit]
    );

    if (!result.length || !result[0].values.length) {
      return [];
    }

    const columns = result[0].columns;
    return result[0].values.map((row: unknown[]) => {
      const entry: Record<string, unknown> = {};
      columns.forEach((col: string, idx: number) => {
        entry[col] = row[idx];
      });
      return entry as unknown as AnalyticsEntry;
    });
  }
}
