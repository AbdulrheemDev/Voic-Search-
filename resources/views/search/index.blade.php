<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>البحث الصوتي | متجر تجريبي</title>
    <link rel="stylesheet" href="/css/voice-search.css">
</head>
<body data-setting="c" data-language="ar-SA">
<header class="site-header">
    <div class="container header-inner">
        <a class="brand" href="/">
            <span class="brand-mark">ص</span>
            <span class="brand-text">متجر صوتي<small>بحث بالصوت والكتابة</small></span>
        </a>
        <nav class="site-nav">
            <a href="/">الرئيسية</a>
            <a href="/search" class="active">البحث الصوتي</a>
            <a href="/tools/recordings">أداة التسجيل</a>
        </nav>
    </div>
</header>

<main class="container">
    <section class="search-panel">
        <h1 class="panel-title">ابحث عن منتجاتك بالصوت</h1>
        <p class="panel-hint">اضغط زر الميكروفون وانطق ما تريده بالعربية، مثل: «أبغى شنطة ظهر سوداء لو سمحت»، أو اكتب استعلامك في الحقل.</p>

        <form id="search-form" class="search-form" autocomplete="off">
            <div class="search-box">
                <input id="query-input" name="query" type="search" class="query-input"
                       placeholder="اكتب ما تبحث عنه…" aria-label="حقل البحث">
                <button id="mic-button" type="button" class="mic-button" hidden
                        aria-label="بدء البحث الصوتي">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"/>
                        <path fill="currentColor" d="M18 12a6 6 0 0 1-4 5.66V21h-1.5v-3.34A6 6 0 0 1 6 12h1.5a4.5 4.5 0 0 0 9 0H18Z"/>
                    </svg>
                </button>
                <button id="search-button" type="submit" class="search-button">بحث</button>
            </div>
        </form>

        <div id="voice-status" class="voice-status" hidden></div>
        <div id="message-box" class="message-box" hidden></div>
        <div id="stage-box" class="stage-box" hidden></div>
    </section>

    <section id="results-section" class="results-section">
        <div id="results-meta" class="results-meta" hidden></div>
        <div id="results" class="results-grid"></div>
    </section>
</main>

<footer class="site-footer">
    <div class="container">
        <p>محرك بحث صوتي عربي لمنصات التجارة الإلكترونية — مشروع تخرج 2026/2027، جامعة العلوم والتكنولوجيا فرع إب.</p>
    </div>
</footer>

<script src="/js/voice-search.js"></script>
</body>
</html>
