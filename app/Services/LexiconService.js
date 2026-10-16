const db = require('../../database/db');
const NormalizationService = require('./NormalizationService');

/**
 * Lexicon Service
 * Implements Section 3.6.3 of Chapter 3:
 * - Substitution relation: Replaces dialect/foreign terms with canonical catalog terms (longest n-gram match first).
 * - Equivalence relation: Provides synonym pairs to be indexed/searched concurrently.
 */
class LexiconService {
  constructor() {
    this.refreshCache();
  }

  /**
   * Load substitution and equivalence entries from database into memory for fast execution
   */
  refreshCache() {
    // 1. Substitution entries
    const subRows = db.prepare(`
      SELECT normalized_term, canonical_term 
      FROM lexicon_entries 
      WHERE relation_type = 'substitution'
    `).all();

    // Sort descending by word count so bigrams are matched before unigrams
    this.substitutions = subRows.sort((a, b) => {
      const aWords = a.normalized_term.split(/\s+/).length;
      const bWords = b.normalized_term.split(/\s+/).length;
      return bWords - aWords || b.normalized_term.length - a.normalized_term.length;
    });

    // 2. Equivalence entries (for search synonyms)
    const eqRows = db.prepare(`
      SELECT normalized_term, canonical_term 
      FROM lexicon_entries 
      WHERE relation_type = 'equivalence'
    `).all();

    this.equivalences = {};
    for (const row of eqRows) {
      if (!this.equivalences[row.normalized_term]) {
        this.equivalences[row.normalized_term] = new Set();
      }
      this.equivalences[row.normalized_term].add(row.canonical_term);
      
      if (!this.equivalences[row.canonical_term]) {
        this.equivalences[row.canonical_term] = new Set();
      }
      this.equivalences[row.canonical_term].add(row.normalized_term);
    }
  }

  /**
   * Apply substitution lexicon to query words:
   * Algorithm 1.3 Step 5: For each 2-word phrase then 1-word in W:
   * if found in L, replace with canonical term.
   * @param {string} text Normalized text after request phrases removal
   * @returns {string} Text after lexicon substitution
   */
  applySubstitution(text) {
    if (!text) return '';
    let current = ' ' + text.trim() + ' ';

    for (const entry of this.substitutions) {
      const pattern = new RegExp(`(^|\\s)${entry.normalized_term}(\\s|$)`, 'g');
      if (pattern.test(current)) {
        current = current.replace(pattern, `$1${entry.canonical_term}$2`);
      }
    }

    return current.replace(/\s+/g, ' ').trim();
  }

  /**
   * Retrieve equivalence synonyms for a given word
   * @param {string} normalizedWord 
   * @returns {string[]} List of equivalent terms
   */
  getEquivalences(normalizedWord) {
    if (this.equivalences[normalizedWord]) {
      return Array.from(this.equivalences[normalizedWord]);
    }
    return [];
  }

  /**
   * Get all lexicon entries from database
   */
  getAllEntries() {
    return db.prepare('SELECT * FROM lexicon_entries ORDER BY id ASC').all();
  }

  /**
   * Add a new lexicon entry
   */
  addEntry(term, canonical, type) {
    const normTerm = NormalizationService.normalize(term);
    const normCanonical = NormalizationService.normalize(canonical);
    const stmt = db.prepare(`
      INSERT INTO lexicon_entries (term, normalized_term, canonical_term, relation_type)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(term, normTerm, normCanonical, type);
    this.refreshCache();
    return info.lastInsertRowid;
  }

  /**
   * Delete a lexicon entry
   */
  deleteEntry(id) {
    const stmt = db.prepare('DELETE FROM lexicon_entries WHERE id = ?');
    stmt.run(id);
    this.refreshCache();
  }
}

module.exports = new LexiconService();
