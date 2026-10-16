/**
 * أدوات تجارب الفصل الرابع (نظير الأوامر في app/Console/Commands):
 *   node tools/preview/experiments.mjs relevance   → التجربة الثانية (P@5، MRR، الاستعالمات دون نتائج)
 *   node tools/preview/experiments.mjs latency     → التجربة الثالثة (زمن الاستجابة)
 *   node tools/preview/experiments.mjs wer --file <csv>  → التجربة الأولى (نسبة خطأ الكلمات)
 *   node tools/preview/experiments.mjs all
 */
import fs from 'node:fs';
import path from 'node:path';
import { readCsv, DATA_DIR } from './engine/text.mjs';
import { loadEngine, SETTINGS, ensureResultsDir } from './engine/pipeline.mjs';

const K = 5;

function loadQueries() {
  const rows = readCsv(path.join(DATA_DIR, 'test_queries.csv'));
  return rows.map(r => ({ id: Number(r.id), category: r.category, text: r.query_text,
    reference: r.reference_text, mode: r.entry_mode }));
}

function loadRelevance() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'relevance_judgements.json'), 'utf8'));
  return new Map(Object.entries(raw).map(([k, v]) => [Number(k), new Set(v.map(Number))]));
}

export function precisionAtK(hitIds, relevant, k = K) {
  const top = hitIds.slice(0, k);
  if (!top.length) return 0;
  return top.filter(id => relevant.has(id)).length / k;
}

export function reciprocalRank(hitIds, relevant) {
  for (let i = 0; i < hitIds.length; i++) if (relevant.has(hitIds[i])) return 1 / (i + 1);
  return 0;
}

export function runRelevance(engine, queries, relevance, source, textsOf) {
  const rows = [];
  for (const key of Object.keys(SETTINGS)) {
    let sumP = 0, sumRR = 0, empty = 0, count = 0;
    for (const q of queries) {
      const text = textsOf(q);
      if (text === null || text === undefined || text === '') continue;
      const res = engine.search(text, key, { limit: 20 });
      const ids = res.results.map(r => r.id);
      const rel = relevance.get(q.id) ?? new Set();
      sumP += precisionAtK(ids, rel);
      sumRR += reciprocalRank(ids, rel);
      if (!ids.length) empty++;
      count++;
      rows.push({ query_id: q.id, category: q.category, setting: SETTINGS[key].label,
        source, query_text: text, processed: res.query_processed,
        hits: ids.slice(0, K).join(' '), precision_5: precisionAtK(ids, rel).toFixed(3),
        rank_first_relevant: (() => { const i = ids.findIndex(id => rel.has(id)); return i < 0 ? 0 : i + 1; })(),
        rr: reciprocalRank(ids, rel).toFixed(3), no_results: ids.length ? 0 : 1 });
    }
    rows.push({ query_id: '—', category: 'الإجمالي', setting: SETTINGS[key].label, source,
      query_text: `عدد الاستعالمات: ${count}`, processed: '',
      hits: '', precision_5: (sumP / count).toFixed(3), rank_first_relevant: '',
      rr: (sumRR / count).toFixed(3), no_results: empty });
  }
  return rows;
}

function summaryFromRows(rows, source) {
  const out = {};
  for (const key of Object.keys(SETTINGS)) {
    const label = SETTINGS[key].label;
    const total = rows.find(r => r.setting === label && r.source === source && r.category === 'الإجمالي');
    out[label] = {
      queries: Number(String(total.query_text).replace(/\D/g, '')),
      P_at_5: Number(total.precision_5),
      MRR: Number(total.rr),
      no_results: Number(total.no_results),
    };
    // تفصيل حسب فئة الاستعالم
    const byCat = {};
    const cats = [...new Set(rows.filter(r => r.source === source && r.setting === label
      && r.category !== 'الإجمالي').map(r => r.category))];
    for (const c of cats) {
      const items = rows.filter(r => r.source === source && r.setting === label && r.category === c);
      byCat[c] = {
        queries: items.length,
        P_at_5: Number((items.reduce((s, r) => s + Number(r.precision_5), 0) / items.length).toFixed(3)),
        MRR: Number((items.reduce((s, r) => s + Number(r.rr), 0) / items.length).toFixed(3)),
        no_results: items.reduce((s, r) => s + Number(r.no_results), 0),
      };
    }
    out[label].by_category = byCat;
  }
  return out;
}

function csvOf(rows) {
  const header = ['query_id', 'category', 'setting', 'source', 'query_text', 'processed', 'hits',
    'precision_5', 'rank_first_relevant', 'rr', 'no_results'];
  return [header.join(','), ...rows.map(r => header.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))]
    .join('\n') + '\n';
}

export function experimentRelevance() {
  const engine = loadEngine();
  const queries = loadQueries();
  const relevance = loadRelevance();
  const canUseAsr = asrTexts();
  let rows = runRelevance(engine, queries, relevance, 'reference', q => q.reference);
  const summary = { reference: summaryFromRows(rows, 'reference') };
  const asrRows = [];
  if (canUseAsr.size) {
    const aRows = runRelevance(engine, queries, relevance, 'asr', q => canUseAsr.get(q.id) ?? null);
    asrRows.push(...aRows);
    summary.asr = summaryFromRows(aRows, 'asr');
  }
  rows = rows.concat(asrRows);
  const dir = ensureResultsDir();
  fs.writeFileSync(path.join(dir, 'experiment2_relevance.csv'), csvOf(rows), 'utf8');
  fs.writeFileSync(path.join(dir, 'experiment2_relevance.json'), JSON.stringify({ summary, rows }, null, 1), 'utf8');
  return { summary, rows };
}

/** نصوص التعرف على الكلام إن وُجدت نتائج تسجيل (تُنتجها أداة التسجيل أو أمر Laravel) */
function asrTexts() {
  const candidates = [
    path.join(process.cwd(), 'storage/app/experiments/recordings_results.csv'),
    path.join(ensureResultsDir(), 'recordings_results.csv'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const rows = readCsv(file);
    const map = new Map();
    for (const r of rows) {
      const id = Number(r.query_id ?? r['معرف_الاستعلام'] ?? 0);
      if (!id) continue;
      const text = r.recognized_text ?? r['النص_المتعرف_عليه'] ?? '';
      if (!map.has(id)) map.set(id, text);
    }
    if (map.size) return map;
  }
  return new Map();
}

export function experimentLatency(runs = 3) {
  const engine = loadEngine();
  const queries = loadQueries();
  const all = [];
  for (let i = 0; i < runs; i++) {
    for (const q of queries) {
      const res = engine.search(q.text, 'c', { limit: 20 });
      all.push({ run: i + 1, query_id: q.id, category: q.category, ...res.timing_ms });
    }
  }
  const stat = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    const mean = s.reduce((x, y) => x + y, 0) / s.length;
    const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    return { mean: +mean.toFixed(2), median: +median.toFixed(2), max: +s[s.length - 1].toFixed(2),
      min: +s[0].toFixed(2), p95: +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(2) };
  };
  const summary = {
    runs, samples: all.length,
    processing: stat(all.map(a => a.processing ?? 0)),
    search: stat(all.map(a => a.search ?? 0)),
    retrieval: stat(all.map(a => a.retrieval ?? 0)),
    server_total: stat(all.map(a => a.server_total ?? 0)),
  };
  const dir = ensureResultsDir();
  fs.writeFileSync(path.join(dir, 'experiment3_latency.json'), JSON.stringify({ summary, samples: all }, null, 1), 'utf8');
  return summary;
}

/**
 * قياس الزمن الكلي عبر طلب HTTP حقيقي إلى خادم المعاينة (زمن الاستجابة كما يراه المستخدم
 * بعد انتهاء التعرف على الكلام)، ويضاف إلى نتائج التجربة الثالثة.
 */
export async function experimentLatencyHttp(baseUrl = 'http://127.0.0.1:4173', runs = 3) {
  const queries = loadQueries();
  const samples = [];
  for (let run = 1; run <= runs; run++) {
    for (const q of queries) {
      const started = performance.now();
      const response = await fetch(baseUrl + '/api/voice-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.text, setting: 'c' }),
      });
      const data = await response.json();
      const roundTrip = performance.now() - started;
      samples.push({
        run, query_id: q.id, category: q.category,
        http_round_trip: +roundTrip.toFixed(2),
        server_total: data.timing_ms?.server_total ?? 0,
        processing: data.timing_ms?.processing ?? 0,
        search: data.timing_ms?.search ?? 0,
      });
    }
  }
  const stat = (values) => {
    const s = [...values].sort((a, b) => a - b);
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const median = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
    return { mean: +mean.toFixed(2), median: +median.toFixed(2), max: +s[s.length - 1].toFixed(2),
      min: +s[0].toFixed(2), p95: +s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(2) };
  };
  const summary = {
    runs, samples: samples.length,
    http_round_trip: stat(samples.map(s => s.http_round_trip)),
    server_total: stat(samples.map(s => s.server_total)),
    processing: stat(samples.map(s => s.processing)),
    search: stat(samples.map(s => s.search)),
  };
  const dir = ensureResultsDir();
  const file = path.join(dir, 'experiment3_latency.json');
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  existing.http = { summary, samples };
  fs.writeFileSync(file, JSON.stringify(existing, null, 1), 'utf8');
  return summary;
}

/** نسبة خطأ الكلمات: WER = (S + D + I) / N */
export function wer(reference, hypothesis) {
  const ref = reference.trim().split(/\s+/).filter(Boolean);
  const hyp = hypothesis.trim().split(/\s+/).filter(Boolean);
  const d = Array.from({ length: ref.length + 1 }, () => new Array(hyp.length + 1).fill(0));
  const op = Array.from({ length: ref.length + 1 }, () => new Array(hyp.length + 1).fill(''));
  for (let i = 0; i <= ref.length; i++) { d[i][0] = i; op[i][0] = 'D'; }
  for (let j = 0; j <= hyp.length; j++) { d[0][j] = j; op[0][j] = 'I'; }
  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= hyp.length; j++) {
      const sub = d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1);
      const del = d[i - 1][j] + 1;
      const ins = d[i][j - 1] + 1;
      const best = Math.min(sub, del, ins);
      d[i][j] = best;
      op[i][j] = best === sub ? (ref[i - 1] === hyp[j - 1] ? '=' : 'S') : (best === del ? 'D' : 'I');
    }
  }
  let i = ref.length, j = hyp.length;
  let S = 0, D = 0, I = 0, C = 0;
  while (i > 0 || j > 0) {
    const o = (i > 0 && j > 0) ? op[i][j] : (i > 0 ? 'D' : 'I');
    if (o === 'S') { S++; i--; j--; }
    else if (o === 'D') { D++; i--; }
    else if (o === 'I') { I++; j--; }
    else { C++; i--; j--; }
  }
  const N = ref.length || 1;
  return { S, D, I, C, N, wer: (S + D + I) / N };
}

export function experimentWer(recordsFile) {
  const manifest = readCsv(path.join(DATA_DIR, 'recordings_manifest.csv'));
  const speakers = readCsv(path.join(DATA_DIR, 'speakers.csv'));
  const bySpeakerMeta = new Map(speakers.map(s => [s.speaker_id, s]));
  if (!fs.existsSync(recordsFile)) {
    return { error: 'لم يُعثر على ملف نتائج التسجيل: ' + recordsFile, manifest_rows: manifest.length };
  }
  const records = readCsv(recordsFile);
  const byId = new Map(records.map(r => [r.recording_id, r]));
  const rows = [];
  for (const m of manifest) {
    const rec = byId.get(m.recording_id);
    if (!rec) continue;
    const hyp = rec.recognized_text ?? '';
    const r = wer(m.reference_text, hyp);
    rows.push({ ...m, recognized_text: hyp, ...r, speaker_gender: bySpeakerMeta.get(m.speaker_id)?.gender ?? '',
      speaker_dialect: bySpeakerMeta.get(m.speaker_id)?.dialect ?? '',
      recognition_ms: rec.recognition_ms ?? rec.total_ms ?? '' });
  }
  const group = (keyFn) => {
    const g = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      if (!g.has(k)) g.set(k, { S: 0, D: 0, I: 0, N: 0, n: 0 });
      const o = g.get(k);
      o.S += r.S; o.D += r.D; o.I += r.I; o.N += r.N; o.n++;
    }
    return [...g.entries()].map(([k, o]) => ({ key: k, recordings: o.n,
      WER: +(((o.S + o.D + o.I) / (o.N || 1)).toFixed(4)),
      substitutions: o.S, deletions: o.D, insertions: o.I, reference_words: o.N }));
  };
  const summary = {
    recordings: rows.length,
    total: group(() => 'الإجمالي').map(x => ({ ...x, key: 'الإجمالي' })),
    by_category: group(r => r.category).sort((a, b) => a.key.localeCompare(b.key)),
    by_speaker: group(r => r.speaker_id).sort((a, b) => a.key.localeCompare(b.key)),
    recognition_latency_ms: (() => {
      const vals = rows.map(r => Number(r.recognition_ms)).filter(v => v > 0).sort((a, b) => a - b);
      if (!vals.length) return null;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      return { mean: +mean.toFixed(0), median: +vals[Math.floor(vals.length / 2)].toFixed(0), max: vals[vals.length - 1] };
    })(),
  };
  const dir = ensureResultsDir();
  const header = ['recording_id', 'query_id', 'speaker_id', 'speaker_gender', 'speaker_dialect',
    'category', 'reference_text', 'recognized_text', 'S', 'D', 'I', 'N', 'wer', 'recognition_ms'];
  fs.writeFileSync(path.join(dir, 'experiment1_wer.csv'),
    [header.join(','), ...rows.map(r => header.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'experiment1_wer.json'), JSON.stringify({ summary, rows }, null, 1), 'utf8');
  return summary;
}

// ---------------------------------- CLI ----------------------------------
const cmd = process.argv[2] ?? 'all';
if (import.meta.url === `file://${process.argv[1]}`) {
  if (cmd === 'relevance') {
    const { summary } = experimentRelevance();
    console.log(JSON.stringify(summary.reference, null, 1));
  } else if (cmd === 'latency') {
    console.log(JSON.stringify(experimentLatency(), null, 1));
  } else if (cmd === 'latency-http') {
    const idx = process.argv.indexOf('--base');
    const base = idx > -1 ? process.argv[idx + 1] : 'http://127.0.0.1:4173';
    const summary = await experimentLatencyHttp(base);
    console.log('زمن الاستجابة عبر HTTP:');
    console.log(JSON.stringify(summary, null, 1));
  } else if (cmd === 'wer') {
    const idx = process.argv.indexOf('--file');
    console.log(JSON.stringify(experimentWer(idx > -1 ? process.argv[idx + 1] : ''), null, 1));
  } else {
    const { summary } = experimentRelevance();
    const lat = experimentLatency();
    console.log('التجربة الثانية (النصوص المرجعية):');
    console.log(JSON.stringify(summary.reference, null, 1));
    console.log('التجربة الثالثة:');
    console.log(JSON.stringify(lat, null, 1));
  }
}
