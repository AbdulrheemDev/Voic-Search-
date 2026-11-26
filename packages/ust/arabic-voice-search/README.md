# حزمة محرك البحث الصوتي العربي (`ust/arabic-voice-search`)

حزمة Laravel معيارية قابلة للدمج في أي متجر إلكتروني مبني بـ **Laravel + MySQL** (بما في ذلك **Bagisto 2.4**) دون تعديل بنية جداول المتجر القائمة (`NFR-02`).

## نقاط التكامل الأربع (القسم 2.5.3 من التقرير المعتمد)
1. **مكوّن واجهة البحث (Blade + JS):** زر ميكروفون (Web Speech API) + حقل إدخال نصي بديل + مؤشر حالة الاستماع.
2. **مسار API واحد للبحث:** افتراضيًا `GET /api/voice-search?q=...` (قابل للتخصيص بالكامل من `config/arabic-voice-search.php`).
3. **فهرسة المنتجات:** إضافة `Laravel\Scout\Searchable` وتعريف `toSearchableArray()` في نموذج المنتج بالمتجر المستضيف.
4. **جدول القاموس التجاري (`lexicon_entries`):** ملف ترحيل واحد فقط دون أي تعديل على جداول المتجر القائمة.

## التثبيت في أي متجر Laravel
```bash
composer require ust/arabic-voice-search
php artisan vendor:publish --tag=arabic-voice-search-config
php artisan vendor:publish --tag=arabic-voice-search-assets
php artisan migrate
```

## التخصيص (`.env` أو `config/arabic-voice-search.php`)
- `VOICE_SEARCH_LANG=ar-SA` — رمز اللغة في `Web Speech API`.
- `VOICE_SEARCH_ROUTE_PREFIX=api` — بادئة المسار.
- `VOICE_SEARCH_ROUTE_PATH=voice-search` — مسار نقطة البحث.
- `VOICE_SEARCH_PRODUCT_MODEL="App\\Models\\Product"` — نموذج المنتج في المتجر المستضيف.

## خطة التطوير المرحلية
- [x] **المرحلة 0:** هيكل الحزمة، مزوّد الخدمة، ملف الإعدادات القابل للتعديل.
- [ ] **الدورة 1:** مكوّن الإدخال الصوتي والنصي + مسار الصدى + اختبارات `TC-08` و`TC-09`.
- [ ] **الدورة 2:** التطبيع (7 قواعد) + حذف عبارات الطلب + القاموس التجاري (`lexicon_entries`).
- [ ] **الدورة 3:** الفهرسة في Meilisearch عبر Laravel Scout + البحث والاسترجاع والعرض.
- [ ] **الدورة 4:** الدمج في Bagisto 2.4 + التحقق من `NFR-02` + التجارب الثلاث.
