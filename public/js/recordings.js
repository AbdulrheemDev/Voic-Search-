/**
 * أداة تسجيل الاستعلامات الاختبارية (التجربة الأولى في القسم 3.11.3 من الفصل الثالث).
 *
 * تعرض الأداة الجملة المرجعية على المتحدث، فتلتقط واجهة التعرف على الكلام نص الاستعالم
 * وتقيس زمن التعرف من الحدث speechend إلى الحدث result، ثم تحسب نسبة خطأ الكلمات مباشرة
 * وتحفظ النتيجة في الخادم (storage/app/experiments/recordings_results.csv) وفي ملف يُنزَّل
 * من المتصفح للاحتفاظ بنسخة لدى فريق العمل.
 */
(function () {
    'use strict';

    const speakerSelect = document.getElementById('speaker-select');
    const categorySelect = document.getElementById('category-select');
    const modeSelect = document.getElementById('entry-mode-select');
    const startButton = document.getElementById('start-recording');
    const nextButton = document.getElementById('replay-next');
    const repeatButton = document.getElementById('repeat-current');
    const resetButton = document.getElementById('reset-recording');
    const downloadButton = document.getElementById('download-results');
    const saveTypedButton = document.getElementById('save-typed');
    const typedInput = document.getElementById('typed-input');
    const targetText = document.getElementById('target-text');
    const statusBox = document.getElementById('voice-status');
    const messageBox = document.getElementById('message-box');
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    const tableBody = document.querySelector('#records-table tbody');
    const language = document.body.dataset.language || 'ar-SA';

    const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;

    let queries = [];
    let speakers = [];
    let manifest = [];
    let records = [];
    let queue = [];
    let index = 0;
    let recognition = null;
    let listening = false;
    let speechEndAt = null;

    const storageKey = 'voice-search-recordings';

    function escapeHtml(value) {
        return String(value === null || value === undefined ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.className = 'message-box ' + (type || 'info');
        messageBox.hidden = false;
    }

    function showStatus(text, listeningState) {
        statusBox.textContent = text;
        statusBox.className = 'voice-status' + (listeningState ? ' is-listening' : '');
        statusBox.hidden = false;
    }

    function hideStatus() {
        statusBox.hidden = true;
    }

    /** حساب نسبة خطأ الكلمات في المتصفح للعرض المباشر (S + D + I) / N */
    function wordErrorRate(reference, hypothesis) {
        const ref = reference.trim().split(/\s+/).filter(Boolean);
        const hyp = hypothesis.trim().split(/\s+/).filter(Boolean);
        const d = Array.from({length: ref.length + 1}, function () {
            return new Array(hyp.length + 1).fill(0);
        });
        for (let i = 0; i <= ref.length; i++) { d[i][0] = i; }
        for (let j = 0; j <= hyp.length; j++) { d[0][j] = j; }
        for (let i = 1; i <= ref.length; i++) {
            for (let j = 1; j <= hyp.length; j++) {
                const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
                d[i][j] = Math.min(d[i - 1][j - 1] + cost, d[i - 1][j] + 1, d[i][j - 1] + 1);
            }
        }
        const total = Math.max(ref.length, 1);
        return {wer: d[ref.length][hyp.length] / total, distance: d[ref.length][hyp.length], words: ref.length};
    }

    function buildQueue() {
        const speaker = speakerSelect.value;
        const category = categorySelect.value;
        const mode = modeSelect.value;

        if (mode === 'voice') {
            queue = manifest.filter(function (item) {
                return item.speaker_id === speaker && (category === 'all' || item.category === category);
            }).map(function (item) {
                return {
                    recording_id: item.recording_id,
                    query_id: item.query_id,
                    speaker_id: item.speaker_id,
                    category: item.category,
                    reference_text: item.reference_text,
                    mode: 'voice'
                };
            });
        } else {
            queue = queries.filter(function (query) {
                return query.entry_mode === 'typed' && (category === 'all' || query.category === category);
            }).map(function (query) {
                return {
                    recording_id: 'T' + query.id,
                    query_id: query.id,
                    speaker_id: speaker,
                    category: query.category,
                    reference_text: query.query_text,
                    mode: 'typed'
                };
            });
        }

        index = Math.min(index, Math.max(queue.length - 1, 0));
        renderCurrent();
    }

    function current() {
        return queue[index] || null;
    }

    function renderCurrent() {
        const item = current();
        const total = queue.length;
        const done = total ? records.filter(function (record) {
            return queue.some(function (q) { return q.recording_id === record.recording_id; });
        }).length : 0;

        progressText.textContent = done + ' / ' + total;
        progressFill.style.width = total ? Math.round((done / total) * 100) + '%' : '0%';

        if (!item) {
            targetText.textContent = '—';
            return;
        }

        const already = records.find(function (record) { return record.recording_id === item.recording_id; });
        targetText.textContent = item.mode === 'voice' ? item.reference_text : item.reference_text;
        nextButton.disabled = false;
        repeatButton.disabled = false;

        const isTyped = item.mode === 'typed';
        typedInput.hidden = !isTyped;
        saveTypedButton.hidden = !isTyped;
        startButton.hidden = isTyped;
        typedInput.value = already && already.recognized_text ? already.recognized_text : '';

        if (already) {
            showMessage('سُجِّل هذا الاستعالم سابقًا: «' + already.recognized_text + '» (نسبة خطأ الكلمات ' +
                (already.wer * 100).toFixed(1) + '%).', 'info');
        } else {
            messageBox.hidden = true;
        }
    }

    function storeRecord(item, recognized, recognitionMs, confidence) {
        const metrics = wordErrorRate(item.reference_text, recognized);
        const record = {
            recording_id: item.recording_id,
            query_id: item.query_id,
            speaker_id: item.speaker_id,
            category: item.category,
            reference_text: item.reference_text,
            recognized_text: recognized,
            recognition_ms: recognitionMs || 0,
            confidence: confidence === undefined ? '' : confidence,
            wer: metrics.wer,
            distance: metrics.distance,
            reference_words: metrics.words,
            at: new Date().toISOString()
        };
        records = records.filter(function (r) { return r.recording_id !== item.recording_id; });
        records.push(record);
        persist();
        renderTable();
        renderCurrent();
        saveToServer([record]);
    }

    function renderTable() {
        tableBody.innerHTML = records.map(function (record) {
            return '<tr><td>' + escapeHtml(record.recording_id) + '</td><td>' + escapeHtml(record.speaker_id) +
                '</td><td>' + escapeHtml(record.category) + '</td><td>' + escapeHtml(record.reference_text) +
                '</td><td>' + escapeHtml(record.recognized_text) + '</td><td>' +
                (record.wer * 100).toFixed(1) + '%</td><td>' + Math.round(record.recognition_ms) + '</td></tr>';
        }).join('');
    }

    function persist() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(records));
        } catch (error) {
            console.warn('تعذر حفظ النتائج محليًا', error);
        }
    }

    function restore() {
        try {
            const raw = localStorage.getItem(storageKey);
            records = raw ? JSON.parse(raw) : [];
        } catch (error) {
            records = [];
        }
        renderTable();
    }

    function saveToServer(batch) {
        fetch('/api/recordings', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: JSON.stringify({records: batch})
        }).then(function (response) {
            return response.ok ? response.json() : Promise.reject(response.status);
        }).then(function (data) {
            showMessage('حُفظت النتيجة في الخادم (إجمالي التسجيلات المحفوظة: ' + data.saved + ').', 'info');
        }).catch(function () {
            showMessage('تعذر الحفظ في الخادم، النتيجة محفوظة في المتصفح ويمكن تنزيلها كملف.', 'warning');
        });
    }

    function downloadResults() {
        const header = ['recording_id', 'query_id', 'speaker_id', 'category', 'reference_text',
            'recognized_text', 'recognition_ms', 'confidence', 'wer'];
        const lines = [header.join(',')].concat(records.map(function (record) {
            return header.map(function (key) {
                return '"' + String(record[key] === undefined ? '' : record[key]).replace(/"/g, '""') + '"';
            }).join(',');
        }));
        const blob = new Blob(['\uFEFF' + lines.join('\n') + '\n'], {type: 'text/csv;charset=utf-8'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'recordings_results.csv';
        link.click();
    }

    function buildRecognition() {
        const instance = new SpeechRecognitionImpl();
        instance.lang = language;
        instance.continuous = false;
        instance.interimResults = false;
        instance.maxAlternatives = 1;

        instance.onstart = function () {
            listening = true;
            speechEndAt = null;
            showStatus('جارٍ الاستماع… انطق الجملة المعروضة', true);
        };
        instance.onspeechend = function () {
            speechEndAt = Date.now();
            showStatus('تم التقاط الكلام، جارٍ تحويله إلى نص…', true);
        };
        instance.onresult = function (event) {
            const alternative = event.results[0][0];
            const transcript = (alternative.transcript || '').trim();
            const recognitionMs = speechEndAt ? Date.now() - speechEndAt : 0;
            listening = false;
            hideStatus();
            const item = current();
            if (!item) { return; }
            if (!transcript) {
                showMessage('لم يُلتقط أي كلام، أعد المحاولة.', 'warning');
                return;
            }
            storeRecord(item, transcript, recognitionMs, alternative.confidence);
            if (index < queue.length - 1) {
                index += 1;
                renderCurrent();
            } else {
                showMessage('اكتملت جميع استعلامات هذه المجموعة، يمكنك تنزيل ملف النتائج.', 'info');
            }
        };
        instance.onerror = function (event) {
            listening = false;
            hideStatus();
            showMessage('خطأ في التعرف على الكلام: ' + event.error, 'warning');
        };
        instance.onend = function () { listening = false; };

        return instance;
    }

    startButton.addEventListener('click', function () {
        if (!SpeechRecognitionImpl) {
            showMessage('هذا المتصفح لا يدعم التعرف على الكلام، استخدم Google Chrome.', 'warning');
            return;
        }
        const item = current();
        if (!item) { return; }
        recognition = recognition || buildRecognition();
        try {
            recognition.start();
        } catch (error) {
            showMessage('التعرف على الكلام يعمل بالفعل.', 'info');
        }
    });

    saveTypedButton.addEventListener('click', function () {
        const item = current();
        if (!item) { return; }
        const value = typedInput.value.trim();
        if (!value) {
            showMessage('اكتب نص الاستعالم أولًا.', 'info');
            return;
        }
        storeRecord(item, value, 0, '');
        if (index < queue.length - 1) { index += 1; }
        renderCurrent();
    });

    nextButton.addEventListener('click', function () {
        if (index < queue.length - 1) { index += 1; }
        renderCurrent();
    });

    repeatButton.addEventListener('click', function () { renderCurrent(); });

    resetButton.addEventListener('click', function () {
        if (!confirm('سيُحذف سجل التسجيلات المحفوظ في المتصفح، هل تريد المتابعة؟')) { return; }
        records = [];
        persist();
        renderTable();
        renderCurrent();
    });

    downloadButton.addEventListener('click', downloadResults);
    speakerSelect.addEventListener('change', function () { index = 0; buildQueue(); });
    categorySelect.addEventListener('change', function () { index = 0; buildQueue(); });
    modeSelect.addEventListener('change', function () { index = 0; buildQueue(); });

    fetch('/api/test-queries', {headers: {'Accept': 'application/json'}})
        .then(function (response) { return response.json(); })
        .then(function (data) {
            queries = data.queries || [];
            speakers = data.speakers || [];
            manifest = data.manifest || [];

            speakerSelect.innerHTML = speakers.map(function (speaker) {
                return '<option value="' + escapeHtml(speaker.speaker_id) + '">' + escapeHtml(speaker.speaker_id) +
                    ' — ' + escapeHtml(speaker.gender) + ' — ' + escapeHtml(speaker.dialect) + '</option>';
            }).join('');

            const categories = Array.from(new Set(manifest.map(function (item) { return item.category; })));
            categorySelect.innerHTML = '<option value="all">جميع الفئات</option>' + categories.map(function (category) {
                return '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>';
            }).join('');

            restore();
            buildQueue();
        })
        .catch(function () {
            showMessage('تعذر تحميل قائمة الاستعلامات الاختبارية من الخادم.', 'warning');
        });
})();
