/**
 * خادم المعاينة الحيّة للمشروع.
 *
 * يخدم هذا الخادم ملفات الواجهة نفسها التي يخدمها تطبيق Laravel
 * (resources/views وpublic)، وينفذ نقاط التكامل البرمجية نفسها:
 *   POST /api/voice-search   (نقطة التكامل الثانية: مسار البحث)
 *   GET  /api/products…      (بيانات المتجر المستضيف)
 *   GET  /api/test-queries   و POST /api/recordings (أدوات التجارب)
 *
 * ويستخدم المحرك المرجعي في tools/preview/engine الذي يطبق قواعد الفصل الثالث نفسها
 * (التطبيع، حذف عبارات الطلب، القاموس التجاري، وإعدادات البحث المعرَّفة في الجدول 10.3)،
 * وذلك لتجربة الواجهات وتشغيل التجارب قبل تثبيت Meilisearch ومقارنة النتائج به.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { loadEngine, SETTINGS } from './engine/pipeline.mjs';

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';
const engine = loadEngine();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const VIEWS = {
  '/': 'resources/views/store/index.blade.php',
  '/search': 'resources/views/search/index.blade.php',
  '/tools/recordings': 'resources/views/tools/recordings.blade.php',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Frame-Options': 'ALLOWALL',
  });
  res.end(body);
}

function sendJson(res, data, status = 200) {
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}

function sendFile(res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, 'غير موجود');
  }
  const ext = path.extname(file).toLowerCase();
  send(res, 200, fs.readFileSync(file), MIME[ext] || 'application/octet-stream');
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function productPayload(id) {
  const product = engine.products.find((p) => Number(p.id) === Number(id));
  if (!product) return null;
  const values = engine.attributeValues.filter((v) => Number(v.product_id) === Number(id)).map((v) => v.value);
  return {
    id: Number(product.id),
    name: product.name,
    category: engine.catById.get(Number(product.category_id)),
    attributes: values,
    price: Number(product.price),
    image: '/' + product.image,
    description: product.description,
    available: Number(product.stock) > 0,
    url: `/product/${product.id}`,
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'OPTIONS') return send(res, 204, '');

  // الواجهات
  if (VIEWS[pathname]) return sendFile(res, VIEWS[pathname]);
  if (pathname.startsWith('/category/')) return sendFile(res, 'resources/views/store/category.blade.php');
  if (pathname.startsWith('/product/')) return sendFile(res, 'resources/views/products/show.blade.php');

  // ملفات الواجهة الثابتة
  if (pathname.startsWith('/css/') || pathname.startsWith('/js/') || pathname.startsWith('/images/')) {
    return sendFile(res, path.join('public', pathname));
  }

  // نقاط التكامل البرمجية
  if (pathname === '/api/voice-search' && req.method === 'POST') {
    const body = await readBody(req);
    const query = typeof body.query === 'string' ? body.query : '';
    const setting = SETTINGS[body.setting] ? body.setting : 'c';
    const result = engine.search(query, setting, { limit: 12 });
    const products = result.results.map((r) => ({
      ...productPayload(r.id),
      attributes: r.attributes,
      url: `/product/${r.id}`,
    }));
    const message = query.trim() === ''
      ? 'لم يُلتقط أي استعالم، يُرجى إعادة المحاولة والتحدث بوضوح.'
      : (products.length === 0 ? 'لا توجد منتجات مطابقة لاستعلامك، جرّب كلمات أخرى.' : null);
    return sendJson(res, {
      query: result.query_processed,
      stages: result.stages,
      replacements: result.replacements,
      count: products.length,
      products,
      message,
      timing_ms: result.timing_ms,
    });
  }

  if (pathname === '/api/categories') {
    const categories = engine.categories.map((c) => ({
      id: Number(c.id),
      name: c.name,
      products_count: engine.products.filter((p) => Number(p.category_id) === Number(c.id)).length,
    }));
    return sendJson(res, { categories });
  }

  if (pathname === '/api/products') {
    const limit = Math.min(Number(url.searchParams.get('limit') || 12), 60);
    const category = url.searchParams.get('category');
    let list = engine.products.map((p) => productPayload(p.id));
    if (category) list = list.filter((p) => String(engine.products.find((x) => x.id === p.id).category_id) === String(category));
    return sendJson(res, { products: list.slice(0, limit) });
  }

  if (pathname.startsWith('/api/products/')) {
    const id = pathname.split('/').pop();
    const product = productPayload(id);
    if (!product) return sendJson(res, { message: 'المنتج غير موجود' }, 404);
    const related = engine.products
      .filter((p) => String(p.category_id) === String(engine.products.find((x) => x.id === product.id).category_id) && Number(p.id) !== Number(id))
      .slice(0, 4).map((p) => productPayload(p.id));
    // وصف المنتج مضاف إلى بيانات المنتج
    const full = engine.products.find((p) => Number(p.id) === Number(id));
    return sendJson(res, { product: { ...product, description: full.description }, related });
  }

  if (pathname === '/api/test-queries') {
    const resultsFile = path.join('storage', 'app', 'experiments', 'recordings_results.csv');
    const existing = fs.existsSync(resultsFile) ? fs.readFileSync(resultsFile, 'utf8') : '';
    return sendJson(res, {
      queries: engine.queries,
      speakers: engine.speakers,
      manifest: engine.manifest,
      existing,
    });
  }

  if (pathname === '/api/recordings' && req.method === 'POST') {
    const body = await readBody(req);
    const dir = path.join('storage', 'app', 'experiments');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'recordings_results.csv');
    const header = ['recording_id', 'query_id', 'speaker_id', 'category', 'reference_text',
      'recognized_text', 'recognition_ms', 'confidence'];
    const rows = new Map();
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
      for (const line of lines.slice(1)) {
        const cols = line.split(',');
        rows.set(cols[0], cols);
      }
    }
    for (const record of body.records || []) {
      rows.set(String(record.recording_id), header.map((key) => `"${String(record[key] ?? '').replace(/"/g, '""')}"`));
    }
    fs.writeFileSync(file, [header.join(','), ...[...rows.values()].map((r) => r.join(','))].join('\n') + '\n', 'utf8');
    return sendJson(res, { saved: rows.size, file });
  }

  return send(res, 404, 'المسار غير موجود');
});

server.listen(PORT, HOST, () => {
  console.log(`خادم المعاينة يعمل على http://${HOST}:${PORT}`);
  console.log(`المنتجات المفهرسة: ${engine.docs.length} — مداخل القاموس: ${engine.lexiconEntries.length}`);
  console.log(`الإعدادات المطبقة: searchableAttributes=${engine.index_settings.searchableAttributes.join('، ')} | matchingStrategy=${engine.index_settings.matchingStrategy}`);
});
