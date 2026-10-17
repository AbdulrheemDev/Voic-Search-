/**
 * Chrome Extension - Content Script
 * Injects Arabic Voice Search into any e-commerce storefront (Salla, Zid, Amazon, Noon, Shopify, etc.)
 */

(function () {
  'use strict';

  // Common search bar selectors on popular e-commerce platforms
  const SEARCH_SELECTORS = [
    'input[type="search"]',
    'input[name="q"]',
    'input[name="keyword"]',
    'input[name="search"]',
    'input[name="search_query"]',
    '#search-input',
    '#search',
    '.salla-search-input',
    '.search-field',
    '.search-input'
  ];

  function findSearchInput() {
    for (const selector of SEARCH_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) { // visible
        return el;
      }
    }
    return null;
  }

  function initVoiceSearch() {
    const searchInput = findSearchInput();
    if (!searchInput || searchInput.dataset.voiceInjected) return;

    searchInput.dataset.voiceInjected = 'true';

    // Create Mic Button
    const micBtn = document.createElement('button');
    micBtn.type = 'button';
    micBtn.className = 'arabic-voice-mic-btn';
    micBtn.title = 'البحث الصوتي الذكي (انطق بلهجتك الدارجة)';
    micBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    `;

    // Position container
    const parent = searchInput.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      micBtn.style.position = 'absolute';
      micBtn.style.left = '12px';
      micBtn.style.top = '50%';
      micBtn.style.transform = 'translateY(-50%)';
      micBtn.style.zIndex = '9999';
      parent.appendChild(micBtn);
    }

    // Speech Recognition Setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      micBtn.style.display = 'none';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = true;
    recognition.continuous = false;

    let isListening = false;

    // Toast Notification Indicator
    const toast = document.createElement('div');
    toast.className = 'arabic-voice-toast';
    toast.style.display = 'none';
    document.body.appendChild(toast);

    function showToast(msg, active = false) {
      toast.textContent = msg;
      toast.style.display = 'block';
      if (active) toast.classList.add('pulse');
      else toast.classList.remove('pulse');
    }

    function hideToast() {
      toast.style.display = 'none';
    }

    micBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isListening) {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
        isListening = true;
        micBtn.classList.add('listening');
        showToast('🎙️ جاري الاستماع... تحدث بلهجتك الدارجة الآن', true);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    });

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript) {
        searchInput.value = transcript;
        showToast(`🗣️ تم التقاط: "${transcript}"`, true);
      }
    };

    recognition.onspeechend = () => {
      showToast('⚡ جاري المعالجة وسد الفجوة بالقاموس التجاري...', false);
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('listening');
      const rawText = searchInput.value.trim();

      if (rawText) {
        // Apply Client-Side Normalization & Dialect Substitution
        const processedText = processArabicSearch(rawText);
        searchInput.value = processedText;
        showToast(`✅ الاستعلام المطبَّع: "${processedText}"`, false);
        setTimeout(hideToast, 2000);

        // Auto Submit Search Form
        const form = searchInput.form || searchInput.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true }));
          if (typeof form.submit === 'function') form.submit();
        } else {
          // Trigger Enter Key
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }
      } else {
        hideToast();
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      micBtn.classList.remove('listening');
      if (event.error === 'no-speech') {
        showToast('⚠️ لم يتم التقاط أي صوت، يرجى التحدث بوضوح.', false);
      } else {
        showToast(`⚠️ خطأ: ${event.error}`, false);
      }
      setTimeout(hideToast, 2500);
    };
  }

  /**
   * Arabic Query Normalization & Lexicon Mapping
   */
  function processArabicSearch(text) {
    let s = text;
    // 1. Remove diacritics & tatweel
    s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    // 2. Unify Alef
    s = s.replace(/[أإآ]/g, 'ا');
    // 3. Remove Request Phrases (Table 8.3)
    const requestPhrases = ['ابحث عن', 'دور لي', 'شوف لي', 'لو سمحت', 'من فضلك', 'الله يعافيك', 'اريد', 'ابغى', 'ابي', 'احتاج', 'ودي', 'اعطني', 'هل عندكم'];
    for (const p of requestPhrases) {
      const reg = new RegExp(`(^|\\s)${p}(\\s|$)`, 'gi');
      s = s.replace(reg, ' ');
    }
    // 4. Dialect Lexicon Substitutions (Table 3.3)
    const lexiconMap = {
      'شنطة ظهر': 'حقيبة ظهر',
      'شنطة سفر': 'حقيبة سفر',
      'شنطة': 'حقيبة',
      'جزمة رياضية': 'حذاء رياضي',
      'جزمة': 'حذاء',
      'كوتشي': 'حذاء رياضي',
      'موبايل': 'هاتف ذكي',
      'جوال': 'هاتف ذكي',
      'لابتوب': 'حاسوب محمول',
      'براد': 'ثلاجة',
      'كنبة': 'أريكة',
      'تيشيرت': 'قميص قطني',
      'بنطلون': 'سروال'
    };
    for (const [dialect, canonical] of Object.entries(lexiconMap)) {
      const reg = new RegExp(`(^|\\s)${dialect}(\\s|$)`, 'gi');
      s = s.replace(reg, `$1${canonical}$2`);
    }

    return s.replace(/\s+/g, ' ').trim() || text;
  }

  // Observe dynamic DOM changes for Single Page Apps (SPA)
  const observer = new MutationObserver(() => initVoiceSearch());
  observer.observe(document.body, { childList: true, subtree: true });
  initVoiceSearch();
})();
