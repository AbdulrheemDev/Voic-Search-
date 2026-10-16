/**
 * مسار البحث الكامل للمحرك المرجعي (نظير app/Search/SearchPipeline.php في مسار Laravel):
 * الاستعالم ← التطبيع ← حذف عبارات الطلب ← القاموس التجاري ← البحث ← استرجاع بيانات المنتجات.
 * يستخدمه خادم المعاينة وتجارب الفصل الرابع.
 */
import path from 'node:path';
import fs from 'node:fs';
import { ROOT, DATA_DIR, readCsv, Lexicon, QueryProcessor, loadStopPhrases, normalize, tokenize } from './text.mjs';
import { buildIndex, SearchEngine, SEARCHABLE_ATTRIBUTES, matchingStrategySetting, typoToleranceSetting } from './index.mjs';

export const SETTINGS = {
  a: { label: 'أ', normalizeQuery: false, removeStop: false, useLexicon: false },
  b: { label: 'ب', normalizeQuery: true, removeStop: true, useLexicon: false },
  c: { label: 'ج', normalizeQuery: true, removeStop: true, useLexicon: true },
};

export function loadEngine() {
  const categories = readCsv(path.join(DATA_DIR, 'categories.csv'));
  const products = readCsv(path.join(DATA_DIR, 'products.csv'));
  const attributeValues = readCsv(path.join(DATA_DIR, 'attribute_values.csv'));
  const lexiconEntries = readCsv(path.join(DATA_DIR, 'lexicon_entries.csv'));
  const lexicon = new Lexicon(lexiconEntries);
  const stopPhrases = loadStopPhrases();
  const docs = buildIndex(categories, products, attributeValues);
  const engine = new SearchEngine(docs, lexicon);
  const processor = new QueryProcessor(lexicon, stopPhrases);
  const byId = new Map(products.map(p => [Number(p.id), p]));
  const catById = new Map(categories.map(c => [Number(c.id), c.name]));
  const valuesByProduct = new Map();
  for (const v of attributeValues) {
    if (!valuesByProduct.has(Number(v.product_id))) valuesByProduct.set(Number(v.product_id), []);
    valuesByProduct.get(Number(v.product_id)).push(v);
  }

  function search(rawText, settingKey = 'c', { limit = 20 } = {}) {
    const cfg = SETTINGS[settingKey] ?? SETTINGS.c;
    const t0 = process.hrtime.bigint();
    const processed = processor.process(rawText ?? '', cfg);
    const tProcessed = process.hrtime.bigint();
    const result = engine.search(processed.query, { limit });
    const tSearched = process.hrtime.bigint();
    const productsOut = result.hits.map(h => {
      const p = byId.get(h.id);
      const values = (valuesByProduct.get(h.id) ?? []).map(v => v.value);
      return {
        id: h.id,
        name: p.name,
        category: catById.get(Number(p.category_id)),
        attributes: values,
        price: Number(p.price),
        image: p.image,
        available: Number(p.stock) > 0,
        url: `/product/${h.id}`,
        score: { words: h.words, typo: h.typo, proximity: h.proximity, attribute: h.attribute },
      };
    });
    const tEnd = process.hrtime.bigint();
    const ms = (a, b) => Number(b - a) / 1e6;
    return {
      query_raw: rawText ?? '',
      query_processed: processed.query,
      stages: processed.stages,
      replacements: processed.replaced,
      strategy: result.strategy,
      query_words: result.queryWords,
      total_hits: productsOut.length,
      results: productsOut,
      timing_ms: {
        processing: ms(t0, tProcessed),
        search: ms(tProcessed, tSearched),
        retrieval: ms(tSearched, tEnd),
        server_total: ms(t0, tEnd),
      },
    };
  }

  const queries = readCsv(path.join(DATA_DIR, 'test_queries.csv'));
  const speakers = readCsv(path.join(DATA_DIR, 'speakers.csv'));
  const manifest = readCsv(path.join(DATA_DIR, 'recordings_manifest.csv'));
  const relevance = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'relevance_judgements.json'), 'utf8'));

  return {
    search, engine, processor, lexicon, docs, products, categories, attributeValues, catById,
    stopPhrases, lexiconEntries, queries, speakers, manifest, relevance,
    index_settings: {
      searchableAttributes: SEARCHABLE_ATTRIBUTES,
      synonyms: lexicon.synonymsSetting(),
      typoTolerance: typoToleranceSetting,
      matchingStrategy: matchingStrategySetting,
    },
  };
}

export const resultsDir = path.join(ROOT, 'docs', 'results');
export function ensureResultsDir() {
  fs.mkdirSync(resultsDir, { recursive: true });
  return resultsDir;
}
