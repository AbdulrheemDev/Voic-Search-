{{--
    مكوّن واجهة البحث الصوتي والنصي القابل للدمج (نقطة التكامل 1 — القسم 2.5.3).
    الاستخدام في أي متجر Laravel أو Bagisto:
        <x-arabic-voice-search::search-bar />

    المتطلبات المرتبطة: FR-01, FR-02, FR-03, FR-12, FR-13, NFR-04, NFR-07
--}}
@php
    $routePrefix = trim((string) config('arabic-voice-search.route.prefix', 'api'), '/');
    $routePath = trim((string) config('arabic-voice-search.route.path', 'voice-search'), '/');
    $endpoint = '/' . trim($routePrefix . '/' . $routePath, '/');
    $queryParam = (string) config('arabic-voice-search.route.query_param', 'q');
    $lang = (string) config('arabic-voice-search.speech.lang', 'ar-SA');
    $messages = (array) config('arabic-voice-search.messages', []);
@endphp

<div
    class="avs-container"
    dir="rtl"
    data-avs-root
    data-endpoint="{{ $endpoint }}"
    data-query-param="{{ $queryParam }}"
    data-lang="{{ $lang }}"
    data-msg-listening="{{ $messages['listening'] ?? 'جارٍ الاستماع... تحدث الآن' }}"
    data-msg-no-speech="{{ $messages['no_speech'] ?? 'لم يُلتقط استعلام، يرجى المحاولة مرة أخرى أو الكتابة في حقل البحث.' }}"
    data-msg-mic-denied="{{ $messages['mic_denied'] ?? 'تعذر الوصول إلى الميكروفون.' }}"
    data-msg-error="{{ $messages['error_generic'] ?? 'حدث خطأ أثناء البحث.' }}"
>
    <form class="avs-form" data-avs-form role="search" aria-label="البحث عن المنتجات">
        <input
            type="search"
            name="{{ $queryParam }}"
            class="avs-input"
            data-avs-input
            placeholder="{{ $messages['placeholder'] ?? 'ابحث عن منتج بالكتابة أو بالصوت...' }}"
            autocomplete="off"
        />

        <button
            type="button"
            class="avs-mic-btn"
            data-avs-mic
            aria-label="البحث بالصوت"
            aria-pressed="false"
            title="اضغط للتحدث بالعربية"
        >
            🎤
        </button>

        <button type="submit" class="avs-submit-btn">
            بحث
        </button>
    </form>

    <div class="avs-status" data-avs-status role="status" aria-live="polite" hidden></div>
    <div class="avs-message" data-avs-message role="alert" hidden></div>
    <div class="avs-results" data-avs-results aria-live="polite"></div>
</div>
