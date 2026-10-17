/**
 * Salla Twilight Storefront Script
 * Injected automatically by Salla App Marketplace into Salla Merchant Themes
 */

(function () {
  'use strict';

  function attachSallaVoiceSearch() {
    const sallaSearchInputs = document.querySelectorAll('input[type="search"], .salla-search-input, [name="q"]');
    
    sallaSearchInputs.forEach(input => {
      if (input.dataset.sallaVoiceAttached) return;
      input.dataset.sallaVoiceAttached = 'true';

      // Create Mic Button
      const micBtn = document.createElement('button');
      micBtn.type = 'button';
      micBtn.className = 'salla-voice-btn';
      micBtn.innerHTML = '🎙️';
      micBtn.title = 'البحث الصوتي الذكي';

      // Styles
      micBtn.style.cssText = `
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        font-size: 18px;
        cursor: pointer;
        z-index: 10;
        transition: transform 0.2s;
      `;

      if (input.parentElement) {
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(micBtn);
      }

      // Voice recognition handling
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';

      micBtn.addEventListener('click', () => {
        try {
          recognition.start();
          micBtn.style.transform = 'translateY(-50%) scale(1.2)';
          micBtn.innerHTML = '🔴';
        } catch (e) {
          recognition.stop();
        }
      });

      recognition.onresult = async (e) => {
        const transcript = e.results[0][0].transcript;
        input.value = transcript;

        // Call Central Voice Search API
        try {
          const res = await fetch('/api/voice-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: transcript, mode: 'voice' })
          });
          const data = await res.json();
          if (data.trace && data.trace.step5_search_query) {
            input.value = data.trace.step5_search_query;
          }
          // Submit Salla form
          const form = input.form || input.closest('form');
          if (form) form.submit();
        } catch (err) {
          const form = input.form || input.closest('form');
          if (form) form.submit();
        }
      };

      recognition.onend = () => {
        micBtn.style.transform = 'translateY(-50%) scale(1)';
        micBtn.innerHTML = '🎙️';
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachSallaVoiceSearch);
  } else {
    attachSallaVoiceSearch();
  }
})();
