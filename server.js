const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');

const SearchController = require('./app/Controllers/SearchController');
const LexiconController = require('./app/Controllers/LexiconController');
const ExperimentController = require('./app/Controllers/ExperimentController');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/docs', express.static(path.join(__dirname, 'docs')));
app.use('/extensions', express.static(path.join(__dirname, 'extensions')));

// --- API Routes ---

// 1. Search endpoints (Algorithm 1.3, FR-01, FR-02, FR-09, FR-10, FR-11, FR-12)
app.post('/api/search', SearchController.processSearch);

// 2. Categories
app.get('/api/categories', (req, res) => {
  try {
    const cats = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.id ASC
    `).all();
    res.json({ success: true, categories: cats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Products listing & details
app.get('/api/products', (req, res) => {
  try {
    const { category_id } = req.query;
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `;
    const params = [];
    if (category_id) {
      query += ` WHERE p.category_id = ?`;
      params.push(category_id);
    }
    query += ` ORDER BY p.id ASC`;

    const products = db.prepare(query).all(...params);
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'المنتج غير موجود' });
    }

    const attrs = db.prepare(`
      SELECT a.name, pav.value
      FROM product_attribute_values pav
      JOIN attributes a ON pav.attribute_id = a.id
      WHERE pav.product_id = ?
    `).all(id);

    res.json({ success: true, product: { ...product, attributes: attrs } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Commercial Lexicon Management (Table 3.3, 11.3)
app.get('/api/lexicon', LexiconController.getEntries);
app.post('/api/lexicon', LexiconController.createEntry);
app.delete('/api/lexicon/:id', LexiconController.deleteEntry);
app.post('/api/reindex', LexiconController.reindex);

// 5. Evaluation, Test Cases (Table 13.3) & Experiments (Table 14.3)
app.get('/api/experiments/functional-tests', ExperimentController.runFunctionalTests);
app.get('/api/experiments/exp1', ExperimentController.getExperiment1Data);
app.get('/api/experiments/exp2', ExperimentController.runExperiment2);
app.get('/api/experiments/exp3', ExperimentController.getExperiment3Data);
app.get('/api/experiments/queries', ExperimentController.getTestQueries);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'Voice Search E-Commerce Engine', timestamp: new Date().toISOString() });
});

// Start listening on 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 خادم محرك البحث الصوتي الذكي يعمل الآن بنجاح!`);
  console.log(`📍 العنوان المحلي: http://localhost:${PORT}`);
  console.log(`🌐 واجهة الاستماع: http://0.0.0.0:${PORT}`);
  console.log(`====================================================`);
});
