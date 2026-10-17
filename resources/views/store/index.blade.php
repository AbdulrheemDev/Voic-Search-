<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>المتجر التجريبي</title>
    <link rel="stylesheet" href="/css/voice-search.css">
</head>
<body>
<header class="site-header">
    <div class="container header-inner">
        <a class="brand" href="/">
            <span class="brand-mark">ص</span>
            <span class="brand-text">متجر صوتي<small>بحث بالصوت والكتابة</small></span>
        </a>
        <nav class="site-nav">
            <a href="/" class="active">الرئيسية</a>
            <a href="/search">البحث الصوتي</a>
            <a href="/tools/recordings">أداة التسجيل</a>
        </nav>
    </div>
</header>

<main class="container">
    <section class="hero">
        <h1>متجر إلكتروني تجريبي مبني بإطار Laravel</h1>
        <p>يمثل هذا المتجر المنصة المستضيفة التي يُدمج فيها محرك البحث الصوتي، ويُقرأ منه بيانات المنتجات دون تعديل بنية جداوله.</p>
        <a class="hero-action" href="/search">تجربة البحث الصوتي</a>
    </section>

    <section>
        <h2 class="section-title">الفئات</h2>
        <div id="categories" class="category-grid"></div>
    </section>

    <section>
        <h2 class="section-title">أحدث المنتجات</h2>
        <div id="products" class="results-grid"></div>
    </section>
</main>

<footer class="site-footer">
    <div class="container"><p>محرك بحث صوتي عربي لمنصات التجارة الإلكترونية — مشروع تخرج 2026/2027.</p></div>
</footer>

<script src="/js/store.js"></script>
</body>
</html>
