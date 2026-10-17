/**
 * القاموس التجاري والمكوّنات الأساسية للمحرك المرجعي.
 * تُطبَّق هنا نفس القواعد المعرَّفة في الفصل الثالث (الجداول 7.3 و8.3 و9.3 و10.3)
 * وتُنفَّذ في مسار Laravel بالملفات المقابلة لها في app/Search.
 */
import fs from 'node:fs';
import path from 'node:path';

function findRoot() {
  let dir = path.dirname(new URL(import.meta.url).pathname);
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'resources', 'data', 'products.csv'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(dir, '..');
}

export const ROOT = findRoot();
export const DATA_DIR = path.join(ROOT, 'resources', 'data');

/** قارئ CSV بسيط يدعم علامات التنصيص */
export function readCsv(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length === header.length).map(r =>
    Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// ---------------------------------------------------------------------------
// قواعد التطبيع (جدول 7.3 في الفصل الثالث)
// ---------------------------------------------------------------------------
const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g;
const ARABIC_INDIC = /[\u0660-\u0669]/g;
const EXT_ARABIC_INDIC = /[\u06F0-\u06F9]/g;
const PUNCT = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~\u060C\u061B\u061F\u066A-\u066D\u06D4\u2010-\u2015\u2018\u2019\u201C\u201D\u2026\u00AB\u00BB]/g;

function toAsciiDigits(s) {
  return s
    .replace(ARABIC_INDIC, d => String(d.charCodeAt(0) - 0x0660))
    .replace(EXT_ARABIC_INDIC, d => String(d.charCodeAt(0) - 0x06F0));
}

/** تطبيع النص: حذف التشكيل والتطويل، توحيد الهمزات والألف المقصورة والتاء المربوطة، الأرقام، الترقيم */
export function normalize(input) {
  if (!input) return '';
  let s = String(input).normalize('NFC');
  s = s.replace(DIACRITICS, '');
  s = s.replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627');
  s = toAsciiDigits(s);
  s = s.replace(PUNCT, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  // التاء المربوطة في آخر الكلمة والقصورة في آخر الكلمة
  s = s.split(' ').map(w => {
    if (w.endsWith('\u0629')) w = w.slice(0, -1) + '\u0647';
    if (w.endsWith('\u0649')) w = w.slice(0, -1) + '\u064A';
    return w;
  }).join(' ');
  return s.replace(/\s+/g, ' ').trim();
}

export const tokenize = (s) => (s ? s.split(' ').filter(Boolean) : []);

/**
 * معالجة Meilisearch الداخلية للنص العربي: حذف التشكيل والتطويل وعلامات الترقيم
 * وفصل أداة التعريف (مطابقةً لما ورد في القسم 2.2.2 والقسم 6.2.2 من الفصل الثاني).
 * لا توحّد هذه المعالجة الهمزات ولا التاء المربوطة ولا الألف المقصورة،
 * ولذلك يحتاج المحرك إلى التطبيع المسبق (الجدول 7.3).
 */
export function meiliProcess(input) {
  if (!input) return '';
  let s = String(input).normalize('NFC').toLowerCase();
  s = s.replace(DIACRITICS, '');
  s = s.replace(PUNCT, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** حذف أداة التعريف للمطابقة (تقوم به Meilisearch للنص العربي) */
export const stripDefiniteArticle = (w) =>
  (w.length > 4 && w.startsWith('\u0627\u0644')) ? w.slice(2) : w;

export const matchVariants = (w) => {
  const v = new Set([w]);
  const s = stripDefiniteArticle(w);
  if (s !== w) v.add(s);
  return [...v];
};

// ---------------------------------------------------------------------------
// عبارات الطلب (جدول 8.3) — تُحذف بصيغتها المطبَّعة
// ---------------------------------------------------------------------------
export function loadStopPhrases() {
  const file = path.join(DATA_DIR, 'stop_phrases.txt');
  return fs.readFileSync(file, 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(normalize).filter(Boolean);
}

/**
 * يحذف عبارات الطلب من كلمات الاستعالم.
 * لا يُحذف شيء إذا كان الحذف سيُفرغ الاستعالم (شرط الخوارزمية 1.3).
 */
export function removeStopPhrases(words, stopPhrases) {
  const singles = new Set(stopPhrases.filter(p => !p.includes(' ')));
  const doubles = new Set(stopPhrases.filter(p => p.includes(' ')));
  const kept = [];
  for (let i = 0; i < words.length; i++) {
    const pair = (i + 1 < words.length) ? words[i] + ' ' + words[i + 1] : null;
    if (pair && doubles.has(pair)) { i++; continue; }
    if (singles.has(words[i])) continue;
    kept.push(words[i]);
  }
  return kept.length ? kept : words.slice();
}

// ---------------------------------------------------------------------------
// القاموس التجاري (جدول 11.3): استبدال أحادي الاتجاه + تكافؤ متبادل
// ---------------------------------------------------------------------------
export class Lexicon {
  constructor(entries) {
    this.entries = entries;
    this.substitutions = new Map();     // normalized_term -> canonical (normalized)
    this.equivalences = [];             // [ [term, term] ]
    for (const e of entries) {
      const term = normalize(e.term);
      const canonical = normalize(e.canonical_term);
      if (e.relation_type === 'equivalence') this.equivalences.push([term, canonical]);
      else this.substitutions.set(term, canonical);
    }
    this.multiWord = [...this.substitutions.keys()].filter(k => k.includes(' '));
    this.singleWord = new Set([...this.substitutions.keys()].filter(k => !k.includes(' ')));
  }

  /** تطبيق الاستبدال: العبارات من كلمتين أولًا ثم الكلمات المفردة (المطابقة الأطول أولًا) */
  apply(words) {
    const out = [];
    const replaced = [];
    for (let i = 0; i < words.length; i++) {
      const pair = (i + 1 < words.length) ? words[i] + ' ' + words[i + 1] : null;
      if (pair && this.substitutions.has(pair)) {
        const canonical = this.substitutions.get(pair);
        out.push(...canonical.split(' '));
        replaced.push({ from: pair, to: canonical });
        i++;
        continue;
      }
      if (this.singleWord.has(words[i])) {
        const canonical = this.substitutions.get(words[i]);
        out.push(...canonical.split(' '));
        replaced.push({ from: words[i], to: canonical });
        continue;
      }
      out.push(words[i]);
    }
    return { words: out, replaced };
  }

  /** إعداد المرادفات المُرسل إلى Meilisearch: علاقات التكافؤ فقط (جدول 10.3) */
  synonymsSetting() {
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const [a, b] of this.equivalences) {
      for (const t of [a, b]) if (!parent.has(t)) parent.set(t, t);
      const ra = find(a), rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    }
    const groups = new Map();
    for (const [term] of parent) {
      const r = find(term);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(term);
    }
    const synonyms = {};
    for (const members of groups.values()) {
      if (members.length < 2) continue;
      for (const m of members) synonyms[m] = members.filter(x => x !== m);
    }
    return synonyms;
  }
}

// ---------------------------------------------------------------------------
// الاستعالم: المعالجة الكاملة (الخوارزمية 1.3، الخطوات 2 إلى 6)
// ---------------------------------------------------------------------------
export class QueryProcessor {
  constructor(lexicon, stopPhrases) {
    this.lexicon = lexicon;
    this.stopPhrases = stopPhrases;
  }

  process(raw, { normalizeQuery = true, removeStop = true, useLexicon = true } = {}) {
    const stages = { raw: raw ?? '' };
    let text = raw ?? '';
    if (normalizeQuery) text = normalize(text);
    stages.normalized = text;
    let words = tokenize(text);
    if (removeStop) words = removeStopPhrases(words, this.stopPhrases);
    stages.afterStopPhrases = words.join(' ');
    let replaced = [];
    if (useLexicon) {
      const r = this.lexicon.apply(words);
      words = r.words;
      replaced = r.replaced;
    }
    stages.afterLexicon = words.join(' ');
    return { stages, words, replaced, query: words.join(' ') };
  }
}
