/**
 * وحدة الإدخال الصوتي والنصي لمحرك البحث الصوتي العربي (ust/arabic-voice-search).
 *
 * المتطلبات المرتبطة:
 * - FR-01: زر الميكروفون لإدخال الاستعلام بالصوت.
 * - FR-02: حقل الإدخال النصي كمسار بديل.
 * - FR-03: تحويل الكلام العربي إلى نص عبر Web Speech API.
 * - FR-12: رسائل الحالات الاستثنائية (لا كلام / خطأ / لا نتائج).
 * - FR-13: إخفاء زر الميكروفون تلقائيًا في المتصفحات غير الداعمة (TC-09).
 * - NFR-04: إظهار مؤشر حالة الاستماع بوضوح أثناء التعرف.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.ArabicVoiceSearch = factory();
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /**
     * فحص دعم المتصفح لواجهة Web Speech API (FR-13).
     *
     * @param {Window|Object} win
     * @returns {Function|null}
     */
    function getSpeechRecognitionConstructor(win) {
        if (!win) {
            return null;
        }
        return win.SpeechRecognition || win.webkitSpeechRecognition || null;
    }

    /**
     * التحقق المنطقي من دعم التعرف على الكلام (FR-13).
     *
     * @param {Window|Object} win
     * @returns {boolean}
     */
    function isSpeechRecognitionSupported(win) {
        return getSpeechRecognitionConstructor(win) !== null;
    }

    /**
     * تهيئة مكوّن البحث الصوتي والنصي داخل عنصر DOM.
     *
     * @param {HTMLElement} container
     * @param {Object} [customOptions]
     * @returns {Object} واجهة تحكم للاختبار والتكامل
     */
    function initVoiceSearch(container, customOptions) {
        if (!container) {
            throw new Error('ArabicVoiceSearch: container element is required.');
        }

        const win = (customOptions && customOptions.window) || (typeof window !== 'undefined' ? window : null);
        const fetchImpl = (customOptions && customOptions.fetch) || (win && win.fetch ? win.fetch.bind(win) : null);

        const options = Object.assign(
            {
                endpoint: container.dataset?.endpoint || '/api/voice-search',
                queryParam: container.dataset?.queryParam || 'q',
                lang: container.dataset?.lang || 'ar-SA',
                continuous: false,
                interimResults: false,
                messages: {
                    listening: container.dataset?.msgListening || 'جارٍ الاستماع... تحدث الآن',
                    noSpeech: container.dataset?.msgNoSpeech || 'لم يُلتقط استعلام، يرجى المحاولة مرة أخرى أو الكتابة في حقل البحث.',
                    micDenied: container.dataset?.msgMicDenied || 'تعذر الوصول إلى الميكروفون. يرجى السماح بالوصول أو استخدام البحث النصي.',
                    errorGeneric: container.dataset?.msgError || 'حدث خطأ أثناء البحث، يرجى المحاولة مجددًا.',
                },
                onResults: null,
            },
            customOptions || {}
        );

        const form = container.querySelector('[data-avs-form]');
        const input = container.querySelector('[data-avs-input]');
        const micBtn = container.querySelector('[data-avs-mic]');
        const statusEl = container.querySelector('[data-avs-status]');
        const messageEl = container.querySelector('[data-avs-message]');
        const resultsEl = container.querySelector('[data-avs-results]');

        const state = {
            listening: false,
            supported: isSpeechRecognitionSupported(win),
        };

        function setStatus(text, isListening) {
            state.listening = Boolean(isListening);
            if (statusEl) {
                statusEl.textContent = text || '';
                statusEl.hidden = !text;
            }
            if (micBtn) {
                micBtn.setAttribute('aria-pressed', state.listening ? 'true' : 'false');
                if (micBtn.classList) {
                    micBtn.classList.toggle('avs-listening', state.listening);
                }
            }
        }

        function setMessage(text) {
            if (messageEl) {
                messageEl.textContent = text || '';
                messageEl.hidden = !text;
            }
        }

        function escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        /**
         * عرض قائمة النتائج المرتبة (FR-11): الاسم، الصورة، السعر، التوفر، رابط صفحة المنتج.
         */
        function renderResults(items) {
            if (!resultsEl) {
                return;
            }
            if (!Array.isArray(items) || items.length === 0) {
                resultsEl.innerHTML = '';
                return;
            }
            resultsEl.innerHTML = items
                .map(function (item) {
                    const imgHtml = item.image_url
                        ? `<img class="avs-card-img" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" loading="lazy" />`
                        : '';
                    const priceHtml = item.price !== null && item.price !== undefined
                        ? `<span class="avs-card-price">${escapeHtml(item.price)}</span>`
                        : '';
                    const stockText = item.in_stock ? 'متوفر' : 'غير متوفر';
                    const stockClass = item.in_stock ? 'avs-in-stock' : 'avs-out-of-stock';
                    return `<article class="avs-card">` +
                        `<a class="avs-card-link" href="${escapeHtml(item.url || '#')}">` +
                        imgHtml +
                        `<h3 class="avs-card-title">${escapeHtml(item.name)}</h3>` +
                        `<div class="avs-card-meta">${priceHtml}<span class="avs-card-stock ${stockClass}">${stockText}</span></div>` +
                        `</a></article>`;
                })
                .join('');
        }

        async function sendQuery(rawQuery, source) {
            const trimmed = String(rawQuery || '').trim();
            if (!trimmed) {
                setMessage(options.messages.noSpeech);
                renderResults([]);
                return null;
            }

            setMessage('');
            if (!fetchImpl) {
                return null;
            }

            const sep = options.endpoint.includes('?') ? '&' : '?';
            const url = `${options.endpoint}${sep}${encodeURIComponent(options.queryParam)}=${encodeURIComponent(trimmed)}&source=${encodeURIComponent(source)}`;

            try {
                const response = await fetchImpl(url, {
                    method: 'GET',
                    headers: { Accept: 'application/json' },
                });
                const payload = await response.json();

                renderResults(payload && Array.isArray(payload.results) ? payload.results : []);

                if (payload && payload.message) {
                    setMessage(payload.message);
                }
                if (typeof options.onResults === 'function') {
                    options.onResults(payload);
                }
                return payload;
            } catch (_err) {
                renderResults([]);
                setMessage(options.messages.errorGeneric);
                return null;
            }
        }

        // FR-13 (TC-09): إخفاء زر الميكروفون تلقائيًا في المتصفحات غير الداعمة
        if (!state.supported && micBtn) {
            micBtn.hidden = true;
            micBtn.style.display = 'none';
        }

        let recognition = null;
        if (state.supported && micBtn) {
            const SpeechRecognitionCtor = getSpeechRecognitionConstructor(win);
            recognition = new SpeechRecognitionCtor();
            recognition.lang = options.lang;
            recognition.continuous = Boolean(options.continuous);
            recognition.interimResults = Boolean(options.interimResults);

            recognition.onstart = function () {
                setMessage('');
                setStatus(options.messages.listening, true);
            };

            recognition.onend = function () {
                setStatus('', false);
            };

            recognition.onresult = function (event) {
                const transcript =
                    event &&
                    event.results &&
                    event.results[0] &&
                    event.results[0][0] &&
                    event.results[0][0].transcript
                        ? String(event.results[0][0].transcript).trim()
                        : '';

                if (!transcript) {
                    setMessage(options.messages.noSpeech);
                    return;
                }

                if (input) {
                    input.value = transcript;
                }
                sendQuery(transcript, 'voice');
            };

            recognition.onerror = function (event) {
                setStatus('', false);
                const errCode = event && event.error ? event.error : '';
                if (errCode === 'no-speech') {
                    setMessage(options.messages.noSpeech);
                } else if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
                    setMessage(options.messages.micDenied);
                } else {
                    setMessage(options.messages.errorGeneric);
                }
            };

            micBtn.addEventListener('click', function () {
                if (state.listening) {
                    recognition.stop();
                } else {
                    recognition.start();
                }
            });
        }

        // FR-02: مسار الإدخال النصي البديل
        if (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                const value = input ? input.value : '';
                sendQuery(value, 'text');
            });
        }

        return {
            state,
            recognition,
            sendQuery,
        };
    }

    return {
        getSpeechRecognitionConstructor,
        isSpeechRecognitionSupported,
        initVoiceSearch,
    };
});
