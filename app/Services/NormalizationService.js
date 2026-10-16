/**
 * Normalization Service
 * Implements Arabic Text Normalization according to Table 7.3 of Chapter 3.
 */
class NormalizationService {
  /**
   * Normalize an Arabic string following the exact specifications:
   * 1. Remove Tashkeel (diacritics)
   * 2. Remove Tatweel (kashida)
   * 3. Unify Alef forms (أ, إ, آ -> ا)
   * 4. Convert Taa Marbuta (ة) to Haa (ه)
   * 5. Convert Alef Maqsura (ى) to Yaa (ي)
   * 6. Convert Eastern Arabic numerals (٠-٩) to Western numerals (0-9)
   * 7. Remove punctuation & symbols and unify whitespace
   */
  static normalize(text) {
    if (!text || typeof text !== 'string') return '';
    let s = text;

    // 1. Remove Tashkeel (diacritics: Fathatan, Dammatan, Kasratan, Fatha, Damma, Kasra, Shadda, Sukun, Superscript Alef)
    s = s.replace(/[\u064B-\u065F\u0670]/g, '');

    // 2. Remove Tatweel / Kashida
    s = s.replace(/\u0640/g, '');

    // 3. Unify Alef forms (أ, إ, آ) -> ا
    s = s.replace(/[أإآ]/g, 'ا');

    // 4. Convert Eastern Arabic numerals to standard Arabic numerals
    const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    for (let i = 0; i < 10; i++) {
      s = s.split(easternDigits[i]).join(i.toString());
    }

    // 5. Convert Taa Marbuta (ة) to Haa (ه)
    s = s.replace(/ة/g, 'ه');

    // 6. Convert Alef Maqsura (ى) to Yaa (ي)
    s = s.replace(/ى/g, 'ي');

    // 7. Remove punctuation, symbols, and special characters
    // Using explicit unicode / standard punctuation without unescaped backticks
    s = s.replace(/[\.,\/#!$%\^&\*;:{}=\-_~()؟،؛"'«»\[\]<>?!\\|\+]/g, ' ');

    // 8. Collapse whitespace and trim
    s = s.replace(/\s+/g, ' ').trim();

    return s;
  }

  /**
   * Tokenize normalized text into an array of words
   */
  static tokenize(text) {
    if (!text) return [];
    return text.split(/\s+/).filter(w => w.length > 0);
  }
}

module.exports = NormalizationService;
