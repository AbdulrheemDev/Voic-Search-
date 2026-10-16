<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>أداة تسجيل الاستعلامات الاختبارية</title>
    <link rel="stylesheet" href="/css/voice-search.css">
</head>
<body data-language="ar-SA">
<header class="site-header">
    <div class="container header-inner">
        <a class="brand" href="/"><span class="brand-mark">ص</span>
            <span class="brand-text">أداة التسجيل<small>تجربة قياس دقة تحويل الكلام إلى نص</small></span></a>
        <nav class="site-nav">
            <a href="/">الرئيسية</a><a href="/search">البحث الصوتي</a><a href="/tools/recordings" class="active">أداة التسجيل</a>
        </nav>
    </div>
</header>

<main class="container">
    <section class="search-panel">
        <h1 class="panel-title">تسجيل الاستعلامات الاختبارية</h1>
        <p class="panel-hint">
            تُستخدم هذه الأداة في التجربة الأولى لقياس دقة تحويل الكلام إلى نص. اختر المتحدث، ثم اضغط
            «ابدأ التسجيل» واتلُ الجملة المعروضة، وتُحفظ نتيجة التعرف وزمنه تلقائيًا. لا يُحفظ صوت المتحدث،
            وإنما النص الناتج عن التعرف وزمنه فقط.
        </p>
        <div class="recorder-controls">
            <label for="speaker-select">المتحدث</label>
            <select id="speaker-select"></select>
            <label for="category-select">فئة الاستعلامات</label>
            <select id="category-select"></select>
            <label for="entry-mode-select">نوع الإدخال</label>
            <select id="entry-mode-select">
                <option value="voice">منطوق</option>
                <option value="typed">مكتوب</option>
            </select>
            <button id="start-recording" type="button" class="search-button">ابدأ التسجيل</button>
            <button id="reset-recording" type="button" class="ghost-button">تصفير النتائج</button>
        </div>
    </section>

    <section class="search-panel">
        <div class="recorder-progress">
            <div><span id="progress-text">0 / 0</span></div>
            <div class="progress-bar"><span id="progress-fill"></span></div>
        </div>
        <div class="recorder-target">
            <p class="recorder-label">الجملة المطلوب نطقها</p>
            <p id="target-text" class="recorder-text">—</p>
            <input id="typed-input" class="query-input" type="text" placeholder="اكتب نص الاستعالم كما تريد إدخاله ثم اضغط حفظ" hidden>
        </div>
        <div id="voice-status" class="voice-status" hidden></div>
        <div class="recorder-actions">
            <button id="save-typed" type="button" class="search-button" hidden>حفظ الإدخال المكتوب</button>
            <button id="replay-next" type="button" class="search-button" disabled>التالي</button>
            <button id="repeat-current" type="button" class="ghost-button" disabled>إعادة الجملة الحالية</button>
            <button id="download-results" type="button" class="ghost-button">تنزيل ملف النتائج</button>
        </div>
        <div id="message-box" class="message-box" hidden></div>
    </section>

    <section class="search-panel">
        <h2 class="section-title">سجل التسجيلات المكتملة</h2>
        <div class="table-wrap">
            <table id="records-table" class="records-table">
                <thead>
                <tr>
                    <th>المعرّف</th><th>المتحدث</th><th>الفئة</th><th>الجملة المرجعية</th>
                    <th>النص المتعرَّف عليه</th><th>نسبة خطأ الكلمات</th><th>زمن التعرف (مللي ثانية)</th>
                </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </section>
</main>

<footer class="site-footer"><div class="container"><p>محرك بحث صوتي عربي — مشروع تخرج 2026/2027.</p></div></footer>
<script src="/js/recordings.js"></script>
</body>
</html>
