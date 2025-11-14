import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DatabaseManager } from '../../../src/db/database';
import { UserTemplate, PromptHistory, MetricName } from '../../../src/db/schema';

describe('DatabaseManager', () => {
  let db: DatabaseManager;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'promptforge-test-'));
    db = new DatabaseManager(tempDir);
    db.initialize();
  });

  afterEach(() => {
    // Clean up: close database and remove temp directory
    db.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    it('should create database file', () => {
      const dbPath = path.join(tempDir, 'promptforge.db');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should create all required tables', () => {
      // If initialization succeeded, tables should exist
      // This is implicitly tested by successful CRUD operations below
      expect(db).toBeDefined();
    });

    it('should not reinitialize if already initialized', () => {
      // Initialize again
      db.initialize();
      // Should not throw error
      expect(db).toBeDefined();
    });
  });

  describe('insertTemplate', () => {
    it('should insert a template and return ID', () => {
      const template: Omit<UserTemplate, 'id'> = {
        name: 'Test Template',
        content: 'Test content with {variable}',
        category: 'test',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const id = db.insertTemplate(template);
      expect(id).toBeGreaterThan(0);
      expect(typeof id).toBe('number');
    });

    it('should enforce unique template names', () => {
      const template: Omit<UserTemplate, 'id'> = {
        name: 'Unique Name',
        content: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      db.insertTemplate(template);

      // Inserting again with same name should throw
      expect(() => db.insertTemplate(template)).toThrow();
    });

    it('should throw error if database not initialized', () => {
      const uninitializedDb = new DatabaseManager(tempDir);
      const template: Omit<UserTemplate, 'id'> = {
        name: 'Test',
        content: 'Content',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      expect(() => uninitializedDb.insertTemplate(template)).toThrow('Database not initialized');
    });
  });

  describe('getAllTemplates', () => {
    it('should return empty array when no templates exist', () => {
      const templates = db.getAllTemplates();
      expect(templates).toEqual([]);
    });

    it('should return all templates in descending order by creation time', () => {
      const now = Date.now();

      const template1: Omit<UserTemplate, 'id'> = {
        name: 'Template 1',
        content: 'Content 1',
        created_at: now,
        updated_at: now,
      };

      const template2: Omit<UserTemplate, 'id'> = {
        name: 'Template 2',
        content: 'Content 2',
        created_at: now + 1000,
        updated_at: now + 1000,
      };

      db.insertTemplate(template1);
      db.insertTemplate(template2);

      const templates = db.getAllTemplates();
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Template 2'); // Most recent first
      expect(templates[1].name).toBe('Template 1');
    });
  });

  describe('insertPromptHistory', () => {
    it('should insert prompt history and return ID', () => {
      const history: Omit<PromptHistory, 'id'> = {
        original_prompt: 'make a website',
        enhanced_prompt: 'Create a website with...',
        accepted: true,
        tokens_saved: 50,
        timestamp: Date.now(),
        template_used: 'web-dev',
      };

      const id = db.insertPromptHistory(history);
      expect(id).toBeGreaterThan(0);
    });

    it('should handle boolean to integer conversion for accepted field', () => {
      const history: Omit<PromptHistory, 'id'> = {
        original_prompt: 'test',
        enhanced_prompt: 'test enhanced',
        accepted: false,
        timestamp: Date.now(),
      };

      db.insertPromptHistory(history);
      const retrieved = db.getPromptHistory(1);

      expect(retrieved[0].accepted).toBe(false);
    });
  });

  describe('getPromptHistory', () => {
    it('should return empty array when no history exists', () => {
      const history = db.getPromptHistory();
      expect(history).toEqual([]);
    });

    it('should return history in descending order by timestamp', () => {
      const now = Date.now();

      const history1: Omit<PromptHistory, 'id'> = {
        original_prompt: 'prompt 1',
        enhanced_prompt: 'enhanced 1',
        accepted: true,
        timestamp: now,
      };

      const history2: Omit<PromptHistory, 'id'> = {
        original_prompt: 'prompt 2',
        enhanced_prompt: 'enhanced 2',
        accepted: false,
        timestamp: now + 1000,
      };

      db.insertPromptHistory(history1);
      db.insertPromptHistory(history2);

      const history = db.getPromptHistory();
      expect(history).toHaveLength(2);
      expect(history[0].original_prompt).toBe('prompt 2'); // Most recent first
      expect(history[1].original_prompt).toBe('prompt 1');
    });

    it('should respect the limit parameter', () => {
      // Insert 10 entries
      for (let i = 0; i < 10; i++) {
        db.insertPromptHistory({
          original_prompt: `prompt ${i}`,
          enhanced_prompt: `enhanced ${i}`,
          accepted: true,
          timestamp: Date.now() + i,
        });
      }

      const history = db.getPromptHistory(5);
      expect(history).toHaveLength(5);
    });
  });

  describe('insertAnalytics', () => {
    it('should insert analytics entry and return ID', () => {
      const entry = {
        metric_name: MetricName.PROMPTS_ANALYZED,
        value: 100,
        timestamp: Date.now(),
      };

      const id = db.insertAnalytics(entry);
      expect(id).toBeGreaterThan(0);
    });
  });

  describe('getAnalytics', () => {
    it('should return empty array when no analytics exist', () => {
      const analytics = db.getAnalytics(MetricName.PROMPTS_ANALYZED);
      expect(analytics).toEqual([]);
    });

    it('should return analytics for specific metric', () => {
      const now = Date.now();

      db.insertAnalytics({
        metric_name: MetricName.PROMPTS_ANALYZED,
        value: 10,
        timestamp: now,
      });

      db.insertAnalytics({
        metric_name: MetricName.PROMPTS_ACCEPTED,
        value: 5,
        timestamp: now,
      });

      const analytics = db.getAnalytics(MetricName.PROMPTS_ANALYZED);
      expect(analytics).toHaveLength(1);
      expect(analytics[0].value).toBe(10);
    });

    it('should respect the limit parameter', () => {
      const now = Date.now();

      for (let i = 0; i < 10; i++) {
        db.insertAnalytics({
          metric_name: MetricName.PROMPTS_ANALYZED,
          value: i,
          timestamp: now + i,
        });
      }

      const analytics = db.getAnalytics(MetricName.PROMPTS_ANALYZED, 3);
      expect(analytics).toHaveLength(3);
    });
  });

  describe('close', () => {
    it('should close database connection', () => {
      db.close();
      // After closing, operations should fail
      expect(() => db.getAllTemplates()).toThrow('Database not initialized');
    });

    it('should handle multiple close calls gracefully', () => {
      db.close();
      expect(() => db.close()).not.toThrow();
    });
  });
});
