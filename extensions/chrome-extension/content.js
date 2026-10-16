/**
 * Content Script for Chrome Extension
 * Injects Arabic Voice Search into ANY e-commerce website!
 */

(function () {
  // Prevent duplicate injection
  if (window.__arabicVoiceSearchInjected) return;
  window.__arabicVoiceSearchInjected = true;

  console.log('[VoiceSearch Extension] Initialized on page:', window.location.hostname);

  // Bundled Lexicon for fast client-side substitution
  const LEXICON = {
    'شنطه ظهر': 'حقيبة ظهر',
    'شنطه سفر': 'حقيبة سفر',
    'شنطه': 'حقيبة',
    'شنط': 'حقائب',
    'جزمة رياضية': 'حذاء رياضي',
    'جزمة': 'حذاء',
    'كوتشي': 'حذاء رياضي',
    'شوز': 'حذاء',
    'موبايل': 'هاتف ذكي',
    'جوال': 'هاتف ذكي',
    'تلفون': 'هاتف ذكي',
    'لابتوب': 'حاسوب محمول',
    'كمبيوتر': 'حاسوب',
    'براد': 'ثلاجة',
    'كنبة': 'أريكة',
    'طاولة': 'منضدة',
    'تيشيرت': 'قميص قطني',
    'بنطلون': 'سروال',
    'سماعات بلوتوث': 'سماعة لاسلكية'
  };

  const STOP_PHRASES = [
    'ابحث عن', 'دور لي', 'شوف لي', 'لو سمحت', 'من فضلك', 'الله يعافيك', 'هل عندكم', 'هل يوجد',
    'اريد', 'أريد', 'ابغى', 'أبغى', 'ابي', 'أبي', 'احتاج', 'أحتاج', 'ودي', 'اعطني', 'أعطني', 'هل', 'عندكم', 'يوجد'
  ];

  function normalizeText(text) {
    if (!text) return '';
    let s = text;
    s = s.replace(/[\u064B-\u065F\u0670]/g, ''); // Tashkeel
    s = s.replace(/\u0640/g, ''); // Tatweel
    s = s.replace(/[أإآ]/g, 'ا'); // Alef
    s = s.replace(/ة/g, 'ه'); // Taa Marbuta
    s = s.replace(/ى/g, 'ي'); // Alef Maqsura
    const eastern = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    for (let i = 0; i < 10; i++) s = s.split(eastern[i]).join(i.toString());
    s = s.replace(/[\.,\/#!$%\^&\*;:{}=\-_~()؟،؛"'«»\[\]<>?!\\|\+]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  function cleanRequestPhrases(text) {
    let working = ' ' + text + ' ';
    for (const phrase of STOP_PHRASES) {
      const pNorm = normalizeText(phrase);
      const reg = new RegExp(`(^|\\s)${pNorm}(\\s|$)`, 'g');
      if (reg.test(working)) {
        const cand = working.replace(reg, ' ').replace(/\s+/g, ' ').trim();
        if (cand.length > 0) working = ' ' + cand + ' ';
      }
    }
    return working.replace(/\s+/g, ' ').trim() || text;
  }

  function applyLexicon(text) {
    let current = ' ' + text + ' ';
    for (const [term, canonical] of Object.entries(LEXICON)) {
      const tNorm = normalizeText(term);
      const reg = new RegExp(`(^|\\s)${tNorm}(\\s|$)`, 'g');
      if (reg.test(current)) {
        current = current.replace(reg, `$1${canonical}$2`);
      }
    }
    return current.replace(/\s+/g, ' ').trim();
  }

  function processQuery(raw) {
    const norm = normalizeText(raw);
    const withoutStops = cleanRequestPhrases(norm);
    const withLexicon = applyLexicon(withoutStops);
    return withLexicon;
  }

  // Find search bar element on page
  function findSearchInput() {
    const selectors = [
      'input[type="search"]',
      'input[name*="search" i]',
      'input[name="q" i]',
      'input[id*="search" i]',
      'input[placeholder*="بحث" i]',
      'input[placeholder*="search" i]',
      'input[aria-label*="بحث" i]'
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  function injectMicButton(input) {
    if (input.dataset.voiceSearchAttached) return;
    input.dataset.voiceSearchAttached = 'true';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ar-voice-search-btn';
    btn.title = 'البحث الصوتي الذكي (Arabic Voice Search)';
    btn.innerHTML = '🎙️';

    // Position relative to parent container
    const parent = input.parentElement;
    if (parent && getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    input.parentNode.insertBefore(btn, input.nextSibling);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.style.display = 'none';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;

    recognition.onstart = () => {
      isListening = true;
      btn.classList.add('ar-listening');
      btn.innerHTML = '🔴';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('[VoiceSearch] Captured transcript:', transcript);
      
      const finalQuery = processQuery(transcript);
      console.log('[VoiceSearch] Processed Query:', finalQuery);

      input.value = finalQuery;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Submit search form
      const form = input.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }));
        form.submit();
      } else {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
      }
    };

    recognition.onerror = () => {
      isListening = false;
      btn.classList.remove('ar-listening');
      btn.innerHTML = '🎙️';
    };

    recognition.onend = () => {
      isListening = false;
      btn.classList.remove('ar-listening');
      btn.innerHTML = '🎙️';
    };

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  }

  // Observe DOM for dynamic search inputs
  function init() {
    const input = findSearchInput();
    if (input) {
      injectMicButton(input);
    }

    const observer = new MutationObserver(() => {
      const target = findSearchInput();
      if (target && !target.dataset.voiceSearchAttached) {
        injectMicButton(target);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
