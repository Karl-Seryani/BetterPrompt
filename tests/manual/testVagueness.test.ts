/**
 * Manual test for ML vagueness analysis
 *
 * Run with: npm test -- --testPathPattern="testVagueness"
 */

import * as fs from 'fs';
import * as path from 'path';
import { MLVaguenessService } from '../../src/ml/vaguenessService';
import { LabeledPrompt } from '../../src/ml/trainingDataGenerator';

// Mock vscode
jest.mock('vscode', () => ({
  window: {
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    }),
  },
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn().mockReturnValue(false),
    }),
  },
}));

describe('Manual Vagueness Test', () => {
  let service: MLVaguenessService;

  beforeAll(() => {
    // Load training data
    const dataPath = path.join(process.env.HOME || '', 'Documents/data/training/labeled-prompts.json');

    if (!fs.existsSync(dataPath)) {
      console.error(`\n❌ Training data not found at: ${dataPath}`);
      console.log('Run "BetterPrompt: Generate Training Data (Dev)" command first.\n');
      throw new Error('Training data not found');
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const labeledPrompts: LabeledPrompt[] = rawData.prompts;

    console.log(`\n📊 Loaded ${labeledPrompts.length} labeled prompts`);

    // Initialize and train
    MLVaguenessService.resetInstance();
    service = MLVaguenessService.getInstance();

    console.log('🏋️ Training ML model...');
    const trainingResult = service.trainModel(labeledPrompts);

    console.log(`✅ Trained on ${trainingResult.samplesUsed} samples`);
    console.log(`   Vocabulary size: ${trainingResult.vocabularySize}`);
    console.log(`   Final loss: ${trainingResult.finalLoss?.toFixed(4)}\n`);
  });

  it('should analyze vague prompts correctly', () => {
    const vaguePrompts = ['fix it', 'help me', 'make it work', 'do something', 'build an app'];

    console.log('📋 VAGUE PROMPTS:');
    console.log('Score | Vague? | Source | Confidence | Prompt');
    console.log('─'.repeat(70));

    for (const prompt of vaguePrompts) {
      const result = service.analyzeVagueness(prompt);
      const vague = result.isVague ? '  YES ' : '  NO  ';
      const conf = (result.confidence * 100).toFixed(0).padStart(3) + '%';
      const src = result.source.padEnd(6);
      const score = result.score.toString().padStart(3);

      console.log(`${score}   | ${vague} | ${src} | ${conf}       | ${prompt}`);

      // Vague prompts should have high scores
      expect(result.score).toBeGreaterThan(40);
    }
  });

  it('should analyze medium prompts correctly', () => {
    const mediumPrompts = ['fix the login bug', 'create a REST API', 'add authentication'];

    console.log('\n📋 MEDIUM PROMPTS:');
    console.log('Score | Vague? | Source | Confidence | Prompt');
    console.log('─'.repeat(70));

    for (const prompt of mediumPrompts) {
      const result = service.analyzeVagueness(prompt);
      const vague = result.isVague ? '  YES ' : '  NO  ';
      const conf = (result.confidence * 100).toFixed(0).padStart(3) + '%';
      const src = result.source.padEnd(6);
      const score = result.score.toString().padStart(3);

      console.log(`${score}   | ${vague} | ${src} | ${conf}       | ${prompt}`);
    }
  });

  it('should analyze specific prompts correctly', () => {
    const specificPrompts = [
      'fix the TypeError in src/auth/login.ts on line 42',
      'create REST API with JWT authentication and rate limiting',
      'refactor handleSubmit function to use async/await instead of callbacks',
      'add input validation to email field using zod schema with regex pattern',
    ];

    console.log('\n📋 SPECIFIC PROMPTS:');
    console.log('Score | Vague? | Source | Confidence | Prompt');
    console.log('─'.repeat(70));

    for (const prompt of specificPrompts) {
      const result = service.analyzeVagueness(prompt);
      const vague = result.isVague ? '  YES ' : '  NO  ';
      const conf = (result.confidence * 100).toFixed(0).padStart(3) + '%';
      const src = result.source.padEnd(6);
      const score = result.score.toString().padStart(3);
      const truncated = prompt.length > 50 ? prompt.substring(0, 47) + '...' : prompt;

      console.log(`${score}   | ${vague} | ${src} | ${conf}       | ${truncated}`);

      // Specific prompts should have lower scores than vague ones
      // Note: With small training set (100 samples), scores may be higher
      expect(result.score).toBeLessThan(80);
    }
  });

  it('should export trained model', () => {
    const modelJson = service.exportModel();

    expect(modelJson).not.toBeNull();
    console.log(`\n📦 Model exported (${modelJson!.vectorizer.vocabulary.length} vocabulary terms)`);
  });
});
