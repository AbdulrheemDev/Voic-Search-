const NormalizationService = require('./NormalizationService');

/**
 * Stopwords / Request Phrases Removal Service
 * Implements Table 8.3 from Chapter 3: Request phrase filtering
 */
class StopwordsService {
  constructor() {
    // Raw phrases defined in Table 8.3 of Chapter 3
    this.rawPhrases = [
      // عبارات من كلمتين (Bigrams) - match first
      'ابحث عن',
      'دور لي',
      'شوف لي',
      'لو سمحت',
      'من فضلك',
      'الله يعافيك',
      'هل عندكم',
      'هل يوجد',
      'ابغي اشتري',
      'اريد شراء',
      
      // عبارات مفردة (Unigrams) - match second
      'اريد',
      'أريد',
      'ابغى',
      'أبغى',
      'ابي',
      'أبي',
      'احتاج',
      'أحتاج',
      'ودي',
      'اعطني',
      'أعطني',
      'هل',
      'عندكم',
      'يوجد'
    ];

    // Normalized versions of request phrases for matching
    this.normalizedPhrases = this.rawPhrases.map(p => NormalizationService.normalize(p));
    // Sort descending by token count so bigrams are checked first
    this.normalizedPhrases.sort((a, b) => b.split(' ').length - a.split(' ').length || b.length - a.length);
  }

  /**
   * Remove request phrases from normalized text.
   * Ensures that if removing phrases would empty the query, the original words are retained.
   * @param {string} normalizedText 
   * @returns {string} Text after request phrases removal
   */
  removePhrases(normalizedText) {
    if (!normalizedText) return '';
    let current = normalizedText.trim();
    if (!current) return '';

    const originalTokens = NormalizationService.tokenize(current);
    if (originalTokens.length === 0) return '';

    // Check multi-word phrases first, then single words
    let working = ' ' + current + ' ';

    for (const phrase of this.normalizedPhrases) {
      const phraseRegex = new RegExp(`(^|\\s)${phrase}(\\s|$)`, 'g');
      if (phraseRegex.test(working)) {
        // Test what would remain
        const candidate = working.replace(phraseRegex, ' ').replace(/\s+/g, ' ').trim();
        // Rule: Do not remove if it leaves the query empty!
        if (candidate.length > 0) {
          working = ' ' + candidate + ' ';
        }
      }
    }

    const result = working.replace(/\s+/g, ' ').trim();
    return result.length > 0 ? result : current;
  }
}

module.exports = new StopwordsService();
