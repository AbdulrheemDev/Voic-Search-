const LexiconService = require('../Services/LexiconService');
const SearchEngineService = require('../Services/SearchEngineService');

/**
 * Lexicon Controller
 * Manages CRUD operations on commercial lexicon entries and triggers index rebuild
 */
class LexiconController {
  static getEntries(req, res) {
    try {
      const entries = LexiconService.getAllEntries();
      return res.json({ success: true, count: entries.length, entries });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static createEntry(req, res) {
    try {
      const { term, canonical_term, relation_type } = req.body || {};
      if (!term || !canonical_term || !relation_type) {
        return res.status(400).json({ success: false, error: 'جميع الحقول مطلوبة' });
      }

      const id = LexiconService.addEntry(term, canonical_term, relation_type);
      // Rebuild search index to register new synonyms if equivalence
      SearchEngineService.buildIndex();

      return res.json({ success: true, message: 'تمت إضافة المدخل بنجاح إلى القاموس التجاري', id });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static deleteEntry(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      LexiconService.deleteEntry(id);
      SearchEngineService.buildIndex();
      return res.json({ success: true, message: 'تم حذف المدخل وتحديث الفهرس' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static reindex(req, res) {
    try {
      const count = SearchEngineService.buildIndex();
      return res.json({ success: true, message: `تمت إعادة بناء فهرس المنتجات بنجاح (${count} منتج)` });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = LexiconController;
