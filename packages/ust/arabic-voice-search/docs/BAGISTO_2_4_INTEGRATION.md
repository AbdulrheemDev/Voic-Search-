# دليل دمج حزمة `ust/arabic-voice-search` في متجر Bagisto 2.4 (الدورة 4)

هذا الدليل يوثّق خطوات دمج الحزمة في **Bagisto 2.4** (المبني على Laravel 12 — قرار `D-23` و`D-26`) عبر **نقاط التكامل الأربع المعتمدة فقط** دون تعديل بنية جداول Bagisto القائمة (`NFR-02`).

## 1. أخذ لقطة المخطط المرجعي قبل الدمج (`P0-6`)
```bash
php artisan arabic-voice-search:verify-nfr02 --save=storage/app/bagisto_schema_before.json
```

## 2. تثبيت الحزمة ونشر الإعدادات والأصول
```bash
composer require ust/arabic-voice-search
php artisan vendor:publish --tag=arabic-voice-search-config
php artisan vendor:publish --tag=arabic-voice-search-assets
php artisan migrate
```

## 3. التحقق الآلي من `NFR-02` (`C4-1`)
```bash
php artisan arabic-voice-search:verify-nfr02 --compare=storage/app/bagisto_schema_before.json
```
النتيجة المتوقعة: **نجاح `NFR-02`: الجدول الوحيد المضاف هو `lexicon_entries`**.

## 4. ضبط نقاط التكامل الأربع في Bagisto 2.4
1. **إعداد `.env`:**
   ```env
   SCOUT_DRIVER=meilisearch
   MEILISEARCH_HOST=http://127.0.0.1:7700
   VOICE_SEARCH_LANG=ar-SA
   VOICE_SEARCH_PRODUCT_MODEL="Webkul\\Product\\Models\\Product"
   ```
2. **نموذج المنتج:** إضافة `use \Ust\ArabicVoiceSearch\Traits\HasArabicVoiceSearch;` إلى نموذج المنتج وتخصيص `voiceSearchName()` و`voiceSearchCategory()` و`voiceSearchAttributes()` لقراءة حقول Bagisto (EAV).
3. **الواجهة:** إدراج المكوّن في قالب البحث في Bagisto:
   ```blade
   <x-arabic-voice-search::search-bar />
   <script src="{{ asset('vendor/arabic-voice-search/js/voice-search.js') }}"></script>
   <script>
       document.querySelectorAll('[data-avs-root]').forEach(el => ArabicVoiceSearch.initVoiceSearch(el));
   </script>
   ```
4. **مزامنة الفهرس والإعدادات (جدول `10.3`):**
   ```bash
   php artisan arabic-voice-search:sync-settings
   php artisan scout:import "Webkul\Product\Models\Product"
   ```

## 5. تشغيل اختبارات الحزمة على Laragon
```bash
php artisan test packages/ust/arabic-voice-search/tests
```
