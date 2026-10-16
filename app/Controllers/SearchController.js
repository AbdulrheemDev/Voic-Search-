const NormalizationService = require('../Services/NormalizationService');
const StopwordsService = require('../Services/StopwordsService');
const LexiconService = require('../Services/LexiconService');
const SearchEngineService = require('../Services/SearchEngineService');

/**
 * Search Controller
 * Implements Algorithm 1.3 from Chapter 3: Processing voice/text queries,
 * pipeline tracing, and product retrieval.
 */
class SearchController {
  /**
   * Process a search query through the full intelligent pipeline
   * Supports both voice transcripts and direct text input
   */
  static processSearch(req, res) {
    const startTime = performance.now();
    const { query, mode = 'voice', config = 'C' } = req.body || {};

    // 1. Step 1: Check for empty input (FR-12, TC-08)
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(200).json({
        success: false,
        message: 'لم يتم التقاط استعلام صوتي، يرجى التحدث بوضوح وإعادة المحاولة.',
        code: 'EMPTY_QUERY',
        results: [],
        trace: {
          step1_raw: '',
          step2_normalized: '',
          step3_stopwords_removed: '',
          step4_lexicon_applied: '',
          step5_search_query: '',
          execution_time_ms: 0
        }
      });
    }

    const rawQuery = query.trim();
    let currentText = rawQuery;

    // Tracing object
    const trace = {
      step1_raw: rawQuery,
      step2_normalized: rawQuery,
      step3_stopwords_removed: rawQuery,
      step4_lexicon_applied: rawQuery,
      step5_search_query: rawQuery,
      configuration: config,
      mode: mode,
      timing: {}
    };

    // Configuration modes for ablation studies (Experiment 2):
    // Config A: Baseline (Raw query directly without normalization or lexicon)
    // Config B: Normalized + Stopwords removed (Without commercial lexicon)
    // Config C: Complete pipeline (Normalization + Stopwords + Commercial Lexicon + Synonyms)

    const tNormStart = performance.now();
    if (config === 'B' || config === 'C') {
      // 2. Step 2: Normalization (Table 7.3, FR-04)
      currentText = NormalizationService.normalize(currentText);
      trace.step2_normalized = currentText;

      // 3. Step 3 & 4: Tokenization & Request phrase removal (Table 8.3, FR-05)
      currentText = StopwordsService.removePhrases(currentText);
      trace.step3_stopwords_removed = currentText;
    }
    trace.timing.normalization_ms = +(performance.now() - tNormStart).toFixed(2);

    const tLexStart = performance.now();
    if (config === 'C') {
      // 4. Step 5: Commercial Lexicon substitution (Table 3.3, 11.3, FR-06)
      currentText = LexiconService.applySubstitution(currentText);
      trace.step4_lexicon_applied = currentText;
    }
    trace.timing.lexicon_ms = +(performance.now() - tLexStart).toFixed(2);

    // 5. Step 6: Form final query Q
    const finalSearchQuery = currentText;
    trace.step5_search_query = finalSearchQuery;

    // 6. Step 7 & 8: Index Search & Retrieval (Table 10.3, FR-07, FR-09, FR-10)
    const tSearchStart = performance.now();
    const useSynonyms = (config === 'C');
    const results = SearchEngineService.search(finalSearchQuery, { useSynonyms });
    trace.timing.search_engine_ms = +(performance.now() - tSearchStart).toFixed(2);

    const totalServerTime = +(performance.now() - startTime).toFixed(2);
    trace.timing.total_server_ms = totalServerTime;
    trace.execution_time_ms = totalServerTime;

    // 7. Check if no products found (FR-12, TC-07)
    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'لا توجد منتجات مطابقة للاستعلام المدخل في المتجر حالياً.',
        count: 0,
        results: [],
        trace: trace
      });
    }

    return res.status(200).json({
      success: true,
      message: `تم العثور على ${results.length} من المنتجات المطابقة.`,
      count: results.length,
      results: results,
      trace: trace
    });
  }
}

module.exports = SearchController;
