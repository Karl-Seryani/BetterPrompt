/**
 * TF-IDF Feature Extractor for ML Vagueness Classification
 *
 * Converts text prompts into numerical feature vectors using TF-IDF
 * (Term Frequency - Inverse Document Frequency) weighting.
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureVector = number[];

export interface VectorizerJSON {
  version: string;
  vocabulary: string[];
  idfValues: Record<string, number>;
}

export interface ExtractionResult {
  vectors: FeatureVector[];
  vectorizer: TfIdfVectorizer;
}

// ============================================================================
// TOKENIZATION
// ============================================================================

/**
 * Tokenizes a prompt into lowercase words
 * - Removes punctuation
 * - Splits on whitespace and special characters
 * - Filters very short tokens (< 2 chars)
 */
export function tokenize(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  return (
    text
      .toLowerCase()
      // Replace punctuation and special chars with spaces (keep alphanumeric)
      .replace(/[^a-z0-9\s]/g, ' ')
      // Split on whitespace
      .split(/\s+/)
      // Filter empty and very short tokens
      .filter((token) => token.length >= 2)
  );
}

// ============================================================================
// TF-IDF VECTORIZER
// ============================================================================

/**
 * TF-IDF Vectorizer
 *
 * Transforms text documents into TF-IDF weighted feature vectors.
 * - TF (Term Frequency): How often a term appears in a document
 * - IDF (Inverse Document Frequency): How rare a term is across all documents
 * - TF-IDF = TF * IDF (rare terms in a document get high scores)
 */
export class TfIdfVectorizer {
  private vocabulary: string[] = [];
  private vocabularyIndex: Map<string, number> = new Map();
  private idfValues: Map<string, number> = new Map();
  private documentCount = 0;

  /**
   * Fit the vectorizer to a corpus of documents
   * Builds vocabulary and calculates IDF values
   */
  fit(documents: string[]): void {
    if (documents.length === 0) {
      this.vocabulary = [];
      this.vocabularyIndex.clear();
      this.idfValues.clear();
      this.documentCount = 0;
      return;
    }

    this.documentCount = documents.length;

    // Count document frequency for each term
    const documentFrequency = new Map<string, number>();
    const allTerms = new Set<string>();

    for (const doc of documents) {
      const tokens = tokenize(doc);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        allTerms.add(token);
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }

    // Build vocabulary (sorted for consistency)
    this.vocabulary = Array.from(allTerms).sort();
    this.vocabularyIndex.clear();
    for (let i = 0; i < this.vocabulary.length; i++) {
      this.vocabularyIndex.set(this.vocabulary[i], i);
    }

    // Calculate IDF values
    // IDF = log(N / df) + 1, where N = total docs, df = docs containing term
    // Adding 1 prevents zero IDF for terms in all documents
    this.idfValues.clear();
    for (const term of this.vocabulary) {
      const df = documentFrequency.get(term) || 1;
      const idf = Math.log(this.documentCount / df) + 1;
      this.idfValues.set(term, idf);
    }
  }

  /**
   * Transform a single document into a TF-IDF vector
   */
  transform(document: string): FeatureVector {
    const vector: FeatureVector = Array.from({ length: this.vocabulary.length }, () => 0);

    if (this.vocabulary.length === 0) {
      return vector;
    }

    const tokens = tokenize(document);
    if (tokens.length === 0) {
      return vector;
    }

    // Calculate term frequency
    const termFrequency = new Map<string, number>();
    for (const token of tokens) {
      termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
    }

    // Calculate TF-IDF for each term
    for (const [term, tf] of termFrequency) {
      const index = this.vocabularyIndex.get(term);
      if (index !== undefined) {
        const idf = this.idfValues.get(term) || 1;
        // Normalize TF by document length
        const normalizedTf = tf / tokens.length;
        vector[index] = normalizedTf * idf;
      }
    }

    return vector;
  }

  /**
   * Fit and transform in one call
   */
  fitTransform(documents: string[]): FeatureVector[] {
    this.fit(documents);
    return documents.map((doc) => this.transform(doc));
  }

  /**
   * Get the vocabulary (list of terms)
   */
  getVocabulary(): string[] {
    return [...this.vocabulary];
  }

  /**
   * Get IDF value for a specific term
   */
  getIdf(term: string): number {
    return this.idfValues.get(term) || 0;
  }

  /**
   * Serialize vectorizer to JSON for persistence
   */
  toJSON(): VectorizerJSON {
    const idfObj: Record<string, number> = {};
    for (const [term, idf] of this.idfValues) {
      idfObj[term] = idf;
    }

    return {
      version: '1.0.0',
      vocabulary: this.vocabulary,
      idfValues: idfObj,
    };
  }

  /**
   * Restore vectorizer from JSON
   */
  static fromJSON(json: VectorizerJSON): TfIdfVectorizer {
    const vectorizer = new TfIdfVectorizer();

    vectorizer.vocabulary = json.vocabulary;
    vectorizer.vocabularyIndex.clear();
    for (let i = 0; i < json.vocabulary.length; i++) {
      vectorizer.vocabularyIndex.set(json.vocabulary[i], i);
    }

    vectorizer.idfValues.clear();
    for (const [term, idf] of Object.entries(json.idfValues)) {
      vectorizer.idfValues.set(term, idf);
    }

    return vectorizer;
  }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Extract TF-IDF features from a list of prompts
 * Returns both the feature vectors and the fitted vectorizer
 */
export function extractFeatures(prompts: string[]): ExtractionResult {
  const vectorizer = new TfIdfVectorizer();
  const vectors = vectorizer.fitTransform(prompts);

  return { vectors, vectorizer };
}
