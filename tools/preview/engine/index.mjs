/**
 * فهرس المنتجات والبحث فيه.
 * يعيد هذا الملف تنفيذ الإعدادات المعرَّفة في الجدول (10.3) من الفصل الثالث:
 *   searchableAttributes = الاسم، الفئة، قيم الخصائص، الوصف (بهذا الترتيب)
 *   synonyms             = علاقات التكافؤ من القاموس التجاري
 *   typoTolerance        = الإعداد الافتراضي (خطأ لكل 5 أحرف و5+، وخطأان لكل 9 أحرف و9+)
 *   matchingStrategy     = last (إسقاط الكلمات من آخر الاستعالم عند غياب المطابقة الكاملة)
 * وترتيب النتائج يتبع قواعد Meilisearch: words ثم typo ثم proximity ثم attribute ثم exactness.
 */
import { normalize, tokenize, matchVariants, meiliProcess } from './text.mjs';

export const SEARCHABLE_ATTRIBUTES = ['name', 'category', 'attributes', 'description'];

export function buildIndex(categories, products, attributeValues) {
  const catById = new Map(categories.map(c => [c.id, c.name]));
  const valuesByProduct = new Map();
  for (const v of attributeValues) {
    if (!valuesByProduct.has(v.product_id)) valuesByProduct.set(v.product_id, []);
    valuesByProduct.get(v.product_id).push(v.value);
  }
  return products.map(p => {
    const values = valuesByProduct.get(p.id) ?? [];
    const doc = {
      id: Number(p.id),
      name: normalize(p.name),
      category: normalize(catById.get(p.category_id) ?? ''),
      attributes: normalize(values.join('، ')),
      description: normalize(p.description),
      // الحقول غير المفهرسة (تُعرض في النتائج فقط)
      raw_name: p.name,
      price: Number(p.price),
      image: p.image,
      stock: Number(p.stock),
    };
    doc.tokens = SEARCHABLE_ATTRIBUTES.map(f => tokenize(doc[f]));
    return doc;
  });
}

// ------------------------- مسافة التحرير والتسامح مع الأخطاء -------------------------
export function editDistance(a, b, max = Infinity) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

/** عدد الأخطاء المسموح بها حسب طول الكلمة (الإعداد الافتراضي لـ Meilisearch) */
export function typoBudget(word) {
  if (word.length >= 9) return 2;
  if (word.length >= 5) return 1;
  return 0;
}

// ------------------------- البحث والترتيب -------------------------
export class SearchEngine {
  constructor(docs, lexicon) {
    this.docs = docs;
    this.synonyms = lexicon ? lexicon.synonymsSetting() : {};
  }

  /** مطابقة كلمة الاستعالم مع كلمة في الوثيقة: مطابقة تامة أو خطأ إملائي، مع المرادفات وأداة التعريف */
  matchWord(queryWord, docWord) {
    const variants = matchVariants(queryWord);
    const docVariants = matchVariants(docWord);
    // مرادفات التكافؤ (تُطبَّقها Meilisearch عند البحث)
    const syn = [];
    for (const v of variants) if (this.synonyms[v]) syn.push(...this.synonyms[v]);
    const candidates = [...new Set([...variants, ...syn])];
    const budget = typoBudget(queryWord);
    let best = Infinity;
    for (const c of candidates) {
      for (const d of docVariants) {
        if (c === d) return 0;
        const dist = editDistance(c, d, budget);
        if (dist <= budget && dist < best) best = dist;
      }
    }
    return best;
  }

  search(queryText, { limit = 20 } = {}) {
    // ما تنفذه Meilisearch على الاستعالم نفسه (قبل قواعد المحرك): التشكيل والترقيم وأداة التعريف
    const words = tokenize(meiliProcess(queryText));
    if (!words.length) return { hits: [], strategy: 'empty', queryWords: [] };

    // matchingStrategy = last: إسقاط الكلمات من آخر الاستعالم حتى توجد مطابقة
    let used = words.slice();
    let strategy = 'all';
    let scored = [];
    for (;;) {
      scored = this.scoreDocs(used);
      if (scored.length || used.length === 0) break;
      used = used.slice(0, -1);
      strategy = 'dropped-' + (words.length - used.length);
    }
    scored.sort(compareHits);
    return {
      hits: scored.slice(0, limit).map(h => ({ id: h.doc.id, words: h.words, typo: h.typo,
        proximity: h.proximity, attribute: h.attribute, exactness: h.exactness })),
      strategy, queryWords: used,
    };
  }

  scoreDocs(words) {
    const hits = [];
    for (const doc of this.docs) {
      let missing = 0, typos = 0, bestAttribute = Infinity, bestProximity = Infinity, exact = 0;
      let matchedAny = false, nameLast = null;
      for (const qw of words) {
        let best = null;
        for (let f = 0; f < SEARCHABLE_ATTRIBUTES.length; f++) {
          const fieldTokens = doc.tokens[f];
          for (let k = 0; k < fieldTokens.length; k++) {
            const typo = this.matchWord(qw, fieldTokens[k]);
            if (typo === Infinity) continue;
            const cand = { field: f, pos: k, typo };
            if (!best || typo < best.typo || (typo === best.typo && f < best.field)) best = cand;
          }
        }
        if (!best) missing++;
        else {
          matchedAny = true;
          typos += best.typo;
          if (best.field < bestAttribute) bestAttribute = best.field;
          if (best.typo === 0) exact++;
          if (best.field === 0) {
            // القرب: المسافة بين مواضع الكلمات المطابقة في حقل الاسم
            if (nameLast !== null) bestProximity = Math.min(bestProximity, best.pos - nameLast);
            nameLast = best.pos;
          }
        }
      }
      if (!matchedAny) continue;
      hits.push({ doc, words: missing, typo: typos, attribute: bestAttribute,
        proximity: bestProximity === Infinity ? 1000 : bestProximity, exactness: -exact });
    }
    return hits;
  }
}

/** ترتيب النتائج بترتيب قواعد Meilisearch: words, typo, proximity, attribute, exactness */
export function compareHits(a, b) {
  if (a.words !== b.words) return a.words - b.words;
  if (a.typo !== b.typo) return a.typo - b.typo;
  if (a.proximity !== b.proximity) return a.proximity - b.proximity;
  if (a.attribute !== b.attribute) return a.attribute - b.attribute;
  if (a.exactness !== b.exactness) return a.exactness - b.exactness;
  return a.doc.id - b.doc.id;
}

export const matchingStrategySetting = 'last';
export const typoToleranceSetting = {
  enabled: true,
  minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
};
