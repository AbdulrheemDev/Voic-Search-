/**
 * وحدة الإدخال الصوتي في المتجر (القسم 1.6.3 من الفصل الثالث).
 *
 * خطوات الوحدة كما وردت في التصميم:
 *  1) التحقق عند تحميل الصفحة من توفر واجهة التعرف على الكلام في المتصفح، فإن لم تتوفر
 *     أُخفي زر الميكروفون وبقي حقل البحث النصي (المتطلب FR-13).
 *  2) عند الضغط على الزر يُطلب إذن استخدام الميكروفون، ويبدأ التعرف بعد ضبط لغته على
 *     العربية (lang) وضبط continuous على false ليتوقف بانتهاء الجملة، وinterimResults
 *     على false لاستلام النص النهائي فقط.
 *  3) عند وقوع الحدث result يُقرأ النص من البديل الأول ويُرسل إلى الخادم، وعند وقوع الحدث
 *     error أو انتهاء التعرف دون نص تُعرض رسالة توضح ذلك (المتطلبات FR-01 وFR-03 وFR-12).
 *  4) يُقاس زمن التعرف على الكلام من توقيت الحدثين speechend وresult (التجربة الثالثة).
 */
(function () {
    'use strict';

    const form = document.getElementById('search-form');
    const input = document.getElementById('query-input');
    const micButton = document.getElementById('mic-button');
    const statusBox = document.getElementById('voice-status');
    const messageBox = document.getElementById('message-box');
    const stageBox = document.getElementById('stage-box');
    const resultsBox = document.getElementById('results');
    const resultsMeta = document.getElementById('results-meta');
    const body = document.body;
    const language = body.dataset.language || 'ar-SA';
    const setting = body.dataset.setting || 'c';

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = typeof SpeechRecognitionImpl === 'function';

    let recognition = null;
    let listening = false;
    let speechEndAt = null;

    /** الخطوة 1: إظهار زر الميكروفون في المتصفحات الداعمة فقط */
    if (supported) {
        micButton.hidden = false;
    } else {
        micButton.hidden = true;
        showMessage('متصفحك لا يدعم الإدخال الصوتي، يمكنك البحث بكتابة الاستعلام في الحقل.', 'info');
    }

    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.className = 'message-box ' + (type || 'info');
        messageBox.hidden = false;
    }

    function clearMessage() {
        messageBox.hidden = true;
        messageBox.textContent = '';
    }

    function showStatus(text, listeningState) {
        statusBox.textContent = text;
        statusBox.className = 'voice-status' + (listeningState ? ' is-listening' : '');
        statusBox.hidden = false;
        micButton.classList.toggle('is-listening', Boolean(listeningState));
    }

    function hideStatus() {
        statusBox.hidden = true;
        micButton.classList.remove('is-listening');
    }

    /** الخطوة 2: تهيئة واجهة التعرف على الكلام بالخصائص الواردة في التصميم */
    function buildRecognition() {
        const instance = new SpeechRecognitionImpl();
        instance.lang = language;
        instance.continuous = false;
        instance.interimResults = false;
        instance.maxAlternatives = 1;

        instance.onstart = function () {
            listening = true;
            speechEndAt = null;
            showStatus('جارٍ الاستماع… انطق استعلامك الآن', true);
        };

        instance.onspeechend = function () {
            speechEndAt = Date.now();
            showStatus('تم التقاط الكلام، جارٍ تحويله إلى نص…', true);
        };

        instance.onresult = function (event) {
            const result = event.results[0][0];
            const transcript = (result.transcript || '').trim();
            const recognitionMs = speechEndAt ? (Date.now() - speechEndAt) : null;
            listening = false;
            hideStatus();
            if (!transcript) {
                showMessage('لم يُلتقط أي استعالم، يُرجى إعادة المحاولة والتحدث بوضوح.', 'warning');
                return;
            }
            input.value = transcript;
            runSearch(transcript, recognitionMs);
        };

        instance.onerror = function (event) {
            listening = false;
            hideStatus();
            const messages = {
                'no-speech': 'لم يُلتقط أي استعالم، يُرجى إعادة المحاولة والتحدث بوضوح.',
                'audio-capture': 'لم يُعثر على ميكروفون متصل بالجهاز.',
                'not-allowed': 'لم يُمنح إذن استخدام الميكروفون، يُرجى السماح به من إعدادات المتصفح.',
                'network': 'تعذر الوصول إلى خدمة التعرف على الكلام، تأكد من اتصال الإنترنت.',
                'aborted': 'أُوقف الاستماع قبل التقاط الاستعالم.'
            };
            showMessage(messages[event.error] || 'تعذر التعرف على الكلام، يُرجى إعادة المحاولة.', 'warning');
        };

        instance.onend = function () {
            listening = false;
            if (!statusBox.hidden && statusBox.textContent.indexOf('الاستماع') === 0) {
                hideStatus();
            }
        };

        return instance;
    }

    /** إرسال نص الاستعالم إلى نقطة التكامل الثانية (POST /api/voice-search) */
    async function runSearch(query, recognitionMs) {
        clearMessage();
        resultsBox.innerHTML = '';
        resultsMeta.hidden = true;
        stageBox.hidden = true;

        try {
            const response = await fetch('/api/voice-search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
                body: JSON.stringify({query: query, setting: setting})
            });

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();
            renderStages(data.stages, data.replacements, data.query);
            renderResults(data);

            if (typeof recognitionMs === 'number' && recognitionMs > 0) {
                const total = recognitionMs + (data.timing_ms ? data.timing_ms.server_total : 0);
                console.info('[زمن الاستجابة] التعرف على الكلام: ' + recognitionMs +
                    ' مللي ثانية، الخادم: ' + (data.timing_ms ? data.timing_ms.server_total : 0) +
                    ' مللي ثانية، الكلي: ' + Math.round(total) + ' مللي ثانية');
            }
        } catch (error) {
            showMessage('تعذر تنفيذ البحث، تحقق من تشغيل خدمة البحث أو اتصال الشبكة.', 'warning');
            console.error(error);
        }
    }

    /** عرض مراحل معالجة الاستعالم (يُستفاد منه في توضيح عمل المحرك وتشخيص النتائج) */
    function renderStages(stages, replacements, processedQuery) {
        if (!stages || !processedQuery) {
            return;
        }
        const parts = [];
        parts.push('النص كما ورد: <span>' + escapeHtml(stages.raw) + '</span>');
        parts.push('بعد التطبيع: <span>' + escapeHtml(stages.normalized) + '</span>');
        parts.push('بعد حذف عبارات الطلب: <span>' + escapeHtml(stages.after_stop_phrases) + '</span>');
        if (replacements && replacements.length) {
            const applied = replacements.map(function (item) {
                return escapeHtml(item.from) + ' ← ' + escapeHtml(item.to);
            }).join('، ');
            parts.push('تطبيق القاموس التجاري: <span>' + applied + '</span>');
        }
        parts.push('الاستعالم المنفَّذ: <span class="query-final">' + escapeHtml(processedQuery) + '</span>');
        stageBox.innerHTML = parts.join('<br>');
        stageBox.hidden = false;
    }

    /** عرض المنتجات المطابقة، أو رسالة الحالات الاستثنائية (المتطلبان FR-11 وFR-12) */
    function renderResults(data) {
        if (!data.products || data.products.length === 0) {
            showMessage(data.message || 'لا توجد منتجات مطابقة لاستعلامك، جرّب كلمات أخرى.', 'warning');
            return;
        }
        resultsMeta.textContent = 'عدد النتائج: ' + data.count + ' — زمن المعالجة في الخادم: ' +
            (data.timing_ms ? data.timing_ms.server_total : 0) + ' مللي ثانية';
        resultsMeta.hidden = false;

        const html = data.products.map(function (product) {
            const attributes = (product.attributes || []).map(function (value) {
                return '<span class="chip">' + escapeHtml(value) + '</span>';
            }).join('');
            const availability = product.available
                ? '<span class="availability in-stock">متوفر</span>'
                : '<span class="availability out-of-stock">غير متوفر</span>';
            const image = product.image
                ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" onerror="this.classList.add(\'is-missing\')">'
                : '';
            return '<article class="product-card">' +
                '<a class="product-image" href="' + escapeHtml(product.url) + '">' + image +
                '<span class="product-initial">' + escapeHtml(product.name.trim().charAt(0)) + '</span></a>' +
                '<div class="product-body">' +
                '<h3 class="product-name"><a href="' + escapeHtml(product.url) + '">' + escapeHtml(product.name) + '</a></h3>' +
                '<p class="product-category">' + escapeHtml(product.category || '') + '</p>' +
                '<p class="product-attributes">' + attributes + '</p>' +
                '<p class="product-price">' + formatPrice(product.price) + ' <small>ريال يمني</small></p>' +
                availability +
                '</div></article>';
        }).join('');

        resultsBox.innerHTML = html;
    }

    function formatPrice(value) {
        return new Intl.NumberFormat('ar-YE', {maximumFractionDigits: 0}).format(value || 0);
    }

    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    /** الخطوة 2: بدء التعرف عند الضغط على زر الميكروفون */
    micButton.addEventListener('click', function () {
        if (!supported) {
            return;
        }
        clearMessage();
        if (listening) {
            recognition.stop();
            hideStatus();
            return;
        }
        recognition = recognition || buildRecognition();
        try {
            recognition.start();
        } catch (error) {
            showMessage('جارٍ الاستماع بالفعل، يُرجى الانتظار قليلًا.', 'info');
        }
    });

    /** الإدخال النصي: يمر عبر مسار المعالجة نفسه (المتطلب FR-02) */
    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const query = input.value.trim();
        if (query === '') {
            showMessage('اكتب استعلامك أولًا أو استخدم زر الميكروفون.', 'info');
            return;
        }
        runSearch(query, null);
    });

    window.voiceSearchDebug = {runSearch: runSearch, supported: supported};
})();
