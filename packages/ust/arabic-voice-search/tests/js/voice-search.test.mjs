import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ArabicVoiceSearch = require('../../resources/js/voice-search.js');

/**
 * إنشاء محاكاة خفيفة لعناصر DOM لاختبار وحدة الواجهة دون متصفح.
 */
function createMockContainer() {
    const listeners = {};
    const makeEl = () => ({
        value: '',
        hidden: false,
        textContent: '',
        style: {},
        attrs: {},
        classes: new Set(),
        setAttribute(k, v) {
            this.attrs[k] = v;
        },
        classList: {
            toggle(name, force) {
                if (force) this._set.add(name);
                else this._set.delete(name);
            },
            _set: new Set(),
        },
        addEventListener(evt, fn) {
            listeners[evt] = listeners[evt] || [];
            listeners[evt].push(fn);
        },
    });

    const form = makeEl();
    const input = makeEl();
    const micBtn = makeEl();
    const statusEl = makeEl();
    const messageEl = makeEl();
    const resultsEl = makeEl();
    resultsEl.innerHTML = '';

    // ربط مجموعات الـ classList
    micBtn.classList._set = micBtn.classes;

    const map = {
        '[data-avs-form]': form,
        '[data-avs-input]': input,
        '[data-avs-mic]': micBtn,
        '[data-avs-status]': statusEl,
        '[data-avs-message]': messageEl,
        '[data-avs-results]': resultsEl,
    };

    return {
        container: {
            dataset: {
                endpoint: '/api/voice-search',
                queryParam: 'q',
                lang: 'ar-SA',
            },
            querySelector(selector) {
                return map[selector] || null;
            },
        },
        els: { form, input, micBtn, statusEl, messageEl, resultsEl },
        listeners,
    };
}

test('TC-09 / FR-13: إخفاء زر الميكروفون تلقائيًا عند عدم دعم Web Speech API', () => {
    const { container, els } = createMockContainer();
    const instance = ArabicVoiceSearch.initVoiceSearch(container, {
        window: {}, // لا يوجد SpeechRecognition ولا webkitSpeechRecognition
    });

    assert.equal(instance.state.supported, false);
    assert.equal(els.micBtn.hidden, true);
    assert.equal(els.micBtn.style.display, 'none');
});

test('FR-01 / FR-03 / NFR-04: التعرف الصوتي يعرض حالة الاستماع ويرسل النص العربي إلى مسار API', async () => {
    const { container, els } = createMockContainer();
    let fetchedUrl = null;
    let receivedPayload = null;

    class MockSpeechRecognition {
        start() {
            this.onstart && this.onstart();
        }
        stop() {
            this.onend && this.onend();
        }
    }

    const instance = ArabicVoiceSearch.initVoiceSearch(container, {
        window: { webkitSpeechRecognition: MockSpeechRecognition },
        fetch: async (url) => {
            fetchedUrl = url;
            return {
                json: async () => ({
                    status: 'ok',
                    cycle: 1,
                    query: { raw: 'شنطة ظهر سوداء', source: 'voice' },
                    results: [],
                    message: null,
                }),
            };
        },
        onResults: (payload) => {
            receivedPayload = payload;
        },
    });

    assert.equal(instance.state.supported, true);
    assert.equal(instance.recognition.lang, 'ar-SA');
    assert.equal(instance.recognition.continuous, false);
    assert.equal(instance.recognition.interimResults, false);

    // بدء الاستماع (NFR-04)
    instance.recognition.start();
    assert.equal(instance.state.listening, true);
    assert.equal(els.statusEl.hidden, false);
    assert.equal(els.micBtn.attrs['aria-pressed'], 'true');

    // استلام نتيجة عربية من المتصفح
    instance.recognition.onresult({
        results: [[{ transcript: 'شنطة ظهر سوداء' }]],
    });
    instance.recognition.stop();

    await new Promise((r) => setTimeout(r, 10));

    assert.equal(instance.state.listening, false);
    assert.equal(els.input.value, 'شنطة ظهر سوداء');
    assert.ok(fetchedUrl.includes('/api/voice-search?q='));
    assert.ok(fetchedUrl.includes('source=voice'));
    assert.equal(receivedPayload.status, 'ok');
    assert.equal(receivedPayload.query.raw, 'شنطة ظهر سوداء');
});

test('TC-08 / FR-12: عرض رسالة واضحة عند عدم التقاط كلام (no-speech)', () => {
    const { container, els } = createMockContainer();

    class MockSpeechRecognition {
        start() {}
        stop() {}
    }

    const instance = ArabicVoiceSearch.initVoiceSearch(container, {
        window: { SpeechRecognition: MockSpeechRecognition },
    });

    instance.recognition.onerror({ error: 'no-speech' });

    assert.equal(instance.state.listening, false);
    assert.equal(els.messageEl.hidden, false);
    assert.ok(els.messageEl.textContent.includes('لم يُلتقط استعلام'));
});

test('FR-02: مسار الإدخال النصي البديل يرسل الاستعلام إلى المسار نفسه بمصدر text', async () => {
    const { container } = createMockContainer();
    let fetchedUrl = null;

    const instance = ArabicVoiceSearch.initVoiceSearch(container, {
        window: {},
        fetch: async (url) => {
            fetchedUrl = url;
            return {
                json: async () => ({
                    status: 'ok',
                    cycle: 1,
                    query: { raw: 'سماعة بلوتوث', source: 'text' },
                    results: [],
                    message: null,
                }),
            };
        },
    });

    const payload = await instance.sendQuery('سماعة بلوتوث', 'text');
    assert.ok(fetchedUrl.includes('/api/voice-search?q='));
    assert.ok(fetchedUrl.includes('source=text'));
    assert.equal(payload.query.raw, 'سماعة بلوتوث');
});

test('FR-11 / FR-12 (الدورة 3): عرض بطاقات المنتجات المرتبة وعرض رسالة عدم وجود نتائج', async () => {
    const { container, els } = createMockContainer();

    const instance = ArabicVoiceSearch.initVoiceSearch(container, {
        window: {},
        fetch: async (url) => {
            if (url.includes(encodeURIComponent('حقيبة'))) {
                return {
                    json: async () => ({
                        status: 'ok',
                        cycle: 3,
                        results: [
                            {
                                id: 10,
                                name: 'حقيبة ظهر سوداء',
                                price: 120,
                                image_url: '/img/bag.jpg',
                                in_stock: true,
                                url: '/products/10',
                            },
                        ],
                        total: 1,
                        message: null,
                    }),
                };
            }
            return {
                json: async () => ({
                    status: 'ok',
                    cycle: 3,
                    results: [],
                    total: 0,
                    message: 'لا توجد منتجات مطابقة لاستعلامك.',
                }),
            };
        },
    });

    await instance.sendQuery('حقيبة', 'text');
    assert.ok(els.resultsEl.innerHTML.includes('حقيبة ظهر سوداء'));
    assert.ok(els.resultsEl.innerHTML.includes('/products/10'));
    assert.ok(els.resultsEl.innerHTML.includes('متوفر'));

    await instance.sendQuery('منتج غير موجود', 'text');
    assert.equal(els.resultsEl.innerHTML, '');
    assert.equal(els.messageEl.textContent, 'لا توجد منتجات مطابقة لاستعلامك.');
});
