const db = require('../../database/db');
const NormalizationService = require('./NormalizationService');
const LexiconService = require('./LexiconService');

/**
 * Search Engine Service
 * Implements Meilisearch & Laravel Scout compatible indexing and search engine
 * according to Section 4.6.3 and Table 10.3 of Chapter 3.
 */
class SearchEngineService {
  constructor() {
    this.index = [];
    this.buildIndex();
  }

  /**
   * Rebuilds the search index from the database records
   * Mimics Laravel Scout `toSearchableArray()` on the Product model.
   */
  buildIndex() {
    const products = db.prepare(`
      SELECT p.id, p.name, p.description, p.price, p.original_price, p.image_url, p.in_stock,
             c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `).all();

    const attrStmt = db.prepare(`
      SELECT pav.product_id, a.name as attr_name, pav.value as attr_value
      FROM product_attribute_values pav
      JOIN attributes a ON pav.attribute_id = a.id
    `);
    const allAttrs = attrStmt.all();

    // Group attributes by product_id
    const attrsByProduct = {};
    for (const row of allAttrs) {
      if (!attrsByProduct[row.product_id]) {
        attrsByProduct[row.product_id] = [];
      }
      attrsByProduct[row.product_id].push(row.attr_value);
    }

    this.index = products.map(p => {
      const attrList = attrsByProduct[p.id] || [];
      const attrString = attrList.join(' ');

      // Normalize each searchable field individually as per Table 2.3
      const normName = NormalizationService.normalize(p.name);
      const normCategory = NormalizationService.normalize(p.category_name);
      const normAttrs = NormalizationService.normalize(attrString);
      const normDesc = NormalizationService.normalize(p.description || '');

      return {
        id: p.id,
        // Raw values for display
        raw: {
          id: p.id,
          name: p.name,
          category: p.category_name,
          description: p.description,
          price: p.price,
          original_price: p.original_price,
          image_url: p.image_url,
          in_stock: p.in_stock
        },
        // Searchable normalized fields matching searchableAttributes in Table 10.3
        searchable: {
          name: normName,
          category: normCategory,
          attributes: normAttrs,
          description: normDesc
        },
        // Tokenized lists
        tokens: {
          name: NormalizationService.tokenize(normName),
          category: NormalizationService.tokenize(normCategory),
          attributes: NormalizationService.tokenize(normAttrs),
          description: NormalizationService.tokenize(normDesc)
        }
      };
    });

    return this.index.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshtein(a, b) {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;

    const matrix = [];
    for (let i = 0; i <= al; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= bl; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    return matrix[al][bl];
  }

  /**
   * Check if token matches target with Typo Tolerance (Table 10.3)
   * Length < 5: 0 typos allowed
   * Length 5-8: 1 typo allowed
   * Length > 8: 2 typos allowed
   */
  tokenMatches(queryToken, targetToken) {
    if (queryToken === targetToken) return { match: true, typos: 0, exact: true };
    if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
      return { match: true, typos: 0, exact: false, substring: true };
    }

    const qLen = queryToken.length;
    const maxTypos = qLen >= 9 ? 2 : (qLen >= 5 ? 1 : 0);
    if (maxTypos === 0) return { match: false, typos: 99 };

    // Avoid massive length difference
    if (Math.abs(qLen - targetToken.length) > maxTypos) {
      return { match: false, typos: 99 };
    }

    const dist = this.levenshtein(queryToken, targetToken);
    if (dist <= maxTypos) {
      return { match: true, typos: dist, exact: false };
    }

    return { match: false, typos: dist };
  }

  /**
   * Execute search on the index
   * Implements ranking by attribute weights:
   * searchableAttributes = [name, category, attributes, description]
   * With matchingStrategy = 'last' (drops terms from the right if no full match)
   * And synonyms expansion from LexiconService
   * @param {string} cleanQuery 
   * @returns {Array} List of matching product objects ranked by relevance score
   */
  search(cleanQuery, options = {}) {
    if (!cleanQuery || typeof cleanQuery !== 'string' || cleanQuery.trim().length === 0) {
      return [];
    }

    const queryTokens = NormalizationService.tokenize(cleanQuery);
    if (queryTokens.length === 0) return [];

    // Attribute weights reflecting searchableAttributes priority in Table 10.3
    const weights = {
      name: 100,        // Highest priority
      category: 60,     // Second priority
      attributes: 40,   // Third priority (color, size, etc.)
      description: 15   // Fourth priority
    };

    // Expand query tokens with synonyms if enabled (default true)
    const useSynonyms = options.useSynonyms !== false;
    const tokenOptions = queryTokens.map(token => {
      const candidates = [token];
      if (useSynonyms) {
        const equivalents = LexiconService.getEquivalences(token);
        for (const eq of equivalents) {
          if (!candidates.includes(eq)) candidates.push(eq);
        }
      }
      return candidates;
    });

    /**
     * Score a document against a set of token alternatives
     */
    const scoreDoc = (doc, currentTokens) => {
      let matchedTokensCount = 0;
      let totalScore = 0;
      const matchedFields = new Set();

      for (const tokenGroup of currentTokens) {
        let bestGroupScore = 0;
        let groupMatched = false;

        for (const token of tokenGroup) {
          // Check in each attribute
          for (const [attrName, weight] of Object.entries(weights)) {
            const attrTokens = doc.tokens[attrName];
            for (const targetToken of attrTokens) {
              const res = this.tokenMatches(token, targetToken);
              if (res.match) {
                groupMatched = true;
                matchedFields.add(attrName);
                let score = weight;
                if (res.exact) score += 20;
                else if (res.substring) score += 10;
                else score -= (res.typos * 8);

                if (score > bestGroupScore) {
                  bestGroupScore = score;
                }
              }
            }
          }
        }

        if (groupMatched) {
          matchedTokensCount++;
          totalScore += bestGroupScore;
        }
      }

      return { matchedTokensCount, totalScore, matchedFields: Array.from(matchedFields) };
    };

    // Attempt matching full query first. If matchingStrategy is 'last', progressively drop from end.
    let scoredDocs = [];
    let workingTokens = [...tokenOptions];

    while (workingTokens.length > 0) {
      const requiredMatches = workingTokens.length;
      scoredDocs = [];

      for (const doc of this.index) {
        const { matchedTokensCount, totalScore, matchedFields } = scoreDoc(doc, workingTokens);
        // Candidate matches if it contains all required tokens in this iteration
        if (matchedTokensCount === requiredMatches && totalScore > 0) {
          scoredDocs.push({
            ...doc.raw,
            _score: totalScore,
            _matchedFields: matchedFields
          });
        }
      }

      if (scoredDocs.length > 0) {
        break; // Found matching set
      }

      // If 'last' matching strategy: drop the last token
      workingTokens.pop();
    }

    // Sort descending by score
    scoredDocs.sort((a, b) => b._score - a._score);

    return scoredDocs;
  }
}

module.exports = new SearchEngineService();
