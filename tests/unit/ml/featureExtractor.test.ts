/**
 * Tests for TF-IDF Feature Extractor
 * RED phase: These tests define the expected behavior
 */

import {
  TfIdfVectorizer,
  tokenize,
  extractFeatures,
  FeatureVector,
} from '../../../src/ml/featureExtractor';

describe('Feature Extractor', () => {
  describe('tokenize', () => {
    it('should lowercase and split on whitespace', () => {
      const tokens = tokenize('Fix the Bug');
      expect(tokens).toEqual(['fix', 'the', 'bug']);
    });

    it('should remove punctuation', () => {
      const tokens = tokenize('Fix the bug! How?');
      expect(tokens).toEqual(['fix', 'the', 'bug', 'how']);
    });

    it('should handle empty string', () => {
      const tokens = tokenize('');
      expect(tokens).toEqual([]);
    });

    it('should preserve numbers', () => {
      const tokens = tokenize('fix line 42 in file.ts');
      expect(tokens).toContain('42');
      expect(tokens).toContain('file');
      expect(tokens).toContain('ts');
    });

    it('should handle special characters in code', () => {
      const tokens = tokenize('fix the TypeError in src/auth/login.ts');
      expect(tokens).toContain('typeerror');
      expect(tokens).toContain('src');
      expect(tokens).toContain('auth');
      expect(tokens).toContain('login');
      expect(tokens).toContain('ts');
    });

    it('should filter out very short tokens', () => {
      const tokens = tokenize('a I do it');
      // 'a' and 'I' should be filtered (length < 2)
      expect(tokens).not.toContain('a');
      expect(tokens).toContain('do');
      expect(tokens).toContain('it');
    });
  });

  describe('TfIdfVectorizer', () => {
    let vectorizer: TfIdfVectorizer;

    beforeEach(() => {
      vectorizer = new TfIdfVectorizer();
    });

    describe('fit', () => {
      it('should build vocabulary from documents', () => {
        vectorizer.fit(['fix the bug', 'create an api']);

        const vocab = vectorizer.getVocabulary();
        expect(vocab).toContain('fix');
        expect(vocab).toContain('bug');
        expect(vocab).toContain('create');
        expect(vocab).toContain('api');
      });

      it('should calculate IDF values', () => {
        vectorizer.fit(['fix the bug', 'fix the error', 'create api']);

        // 'fix' appears in 2/3 docs, 'create' in 1/3
        // IDF for 'create' should be higher than 'fix'
        const idfFix = vectorizer.getIdf('fix');
        const idfCreate = vectorizer.getIdf('create');

        expect(idfCreate).toBeGreaterThan(idfFix);
      });

      it('should handle empty corpus', () => {
        expect(() => vectorizer.fit([])).not.toThrow();
        expect(vectorizer.getVocabulary()).toEqual([]);
      });
    });

    describe('transform', () => {
      beforeEach(() => {
        vectorizer.fit([
          'fix the bug',
          'fix the error',
          'create api endpoint',
          'build authentication system',
        ]);
      });

      it('should return vector of correct length', () => {
        const vector = vectorizer.transform('fix the bug');
        expect(vector.length).toBe(vectorizer.getVocabulary().length);
      });

      it('should give higher scores to rare terms', () => {
        const vector = vectorizer.transform('fix authentication');
        const vocab = vectorizer.getVocabulary();

        const fixIndex = vocab.indexOf('fix');
        const authIndex = vocab.indexOf('authentication');

        // 'authentication' appears in 1 doc, 'fix' in 2 - auth should score higher
        expect(vector[authIndex]).toBeGreaterThan(vector[fixIndex]);
      });

      it('should handle unknown words gracefully', () => {
        const vector = vectorizer.transform('unknown words here');
        // Should return zero vector for completely unknown text
        expect(vector.every((v) => v === 0)).toBe(true);
      });

      it('should handle empty input', () => {
        const vector = vectorizer.transform('');
        expect(vector.every((v) => v === 0)).toBe(true);
      });
    });

    describe('fitTransform', () => {
      it('should fit and transform in one call', () => {
        const docs = ['fix the bug', 'create api'];
        const vectors = vectorizer.fitTransform(docs);

        expect(vectors.length).toBe(2);
        expect(vectors[0].length).toBe(vectorizer.getVocabulary().length);
      });
    });

    describe('serialization', () => {
      it('should serialize to JSON', () => {
        vectorizer.fit(['fix bug', 'create api']);
        const json = vectorizer.toJSON();

        expect(json).toHaveProperty('vocabulary');
        expect(json).toHaveProperty('idfValues');
        expect(json).toHaveProperty('version');
      });

      it('should deserialize from JSON', () => {
        vectorizer.fit(['fix bug', 'create api']);
        const json = vectorizer.toJSON();

        const restored = TfIdfVectorizer.fromJSON(json);

        expect(restored.getVocabulary()).toEqual(vectorizer.getVocabulary());
        expect(restored.transform('fix bug')).toEqual(vectorizer.transform('fix bug'));
      });
    });
  });

  describe('extractFeatures', () => {
    it('should extract TF-IDF features from prompts', () => {
      const prompts = ['fix the bug', 'create an api', 'make it work'];

      const result = extractFeatures(prompts);

      expect(result.vectors.length).toBe(3);
      expect(result.vectorizer).toBeInstanceOf(TfIdfVectorizer);
    });

    it('should return FeatureVector objects', () => {
      const prompts = ['fix bug'];
      const result = extractFeatures(prompts);

      const feature: FeatureVector = result.vectors[0];
      expect(Array.isArray(feature)).toBe(true);
      expect(feature.every((v) => typeof v === 'number')).toBe(true);
    });
  });

  describe('Feature quality', () => {
    it('should differentiate vague from specific prompts', () => {
      const vectorizer = new TfIdfVectorizer();

      // Train on a mix of vague and specific prompts
      vectorizer.fit([
        'fix it',
        'make it work',
        'help me',
        'fix the TypeError in src/auth/login.ts on line 42',
        'create REST API with JWT authentication',
        'refactor handleSubmit to use async await',
      ]);

      // Specific prompts should have non-zero values for specific terms
      const vagueVector = vectorizer.transform('fix it');
      const specificVector = vectorizer.transform('fix TypeError in login.ts line 42');

      // Specific vector should have more non-zero entries (more informative terms)
      const vagueNonZero = vagueVector.filter((v) => v > 0).length;
      const specificNonZero = specificVector.filter((v) => v > 0).length;

      expect(specificNonZero).toBeGreaterThan(vagueNonZero);
    });
  });
});
