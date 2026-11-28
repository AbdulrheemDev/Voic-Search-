# قائمة التحقق والتسجيل الميداني للاختبارات (`TC-01..TC-10` والتجارب الثلاث)

> تُعبّأ هذه القائمة من قِبل الفريق بعد التشغيل الفعلي على **Laragon + Meilisearch + Chrome** وتُرفق نتائجها في `project-knowledge/10_TESTING_AND_EVALUATION.md` والفصل الرابع.

## أولًا: اختبارات التكامل (`TC-01..TC-10`)
| المعرّف | الوصف | الحالة الفعلية | التاريخ | الملاحظات / الدليل |
|---|---|---|---|---|
| `TC-01` | بحث صوتي عربي قياسي يعيد منتجات مطابقة مرتبة | `[ ] ناجح / [ ] فاشل` | | |
| `TC-02` | بحث نصي بديل يعيد النتائج نفسها | `[ ] ناجح / [ ] فاشل` | | |
| `TC-03` | بحث بخاصية منتج (مثل اللون أو المقاس) | `[ ] ناجح / [ ] فاشل` | | |
| `TC-04` | استعلام يحتوي تشكيلًا/تطويلًا/همزات/أرقامًا هندية (جدول 7.3) | `[ ] ناجح / [ ] فاشل` | | |
| `TC-05` | استعلام يحتوي عبارات طلب ولفظًا عاميًا (مثال جدول 9.3) | `[ ] ناجح / [ ] فاشل` | | |
| `TC-06` | استعلام بمصطلح تكافؤ (`synonyms` في Meilisearch) | `[ ] ناجح / [ ] فاشل` | | |
| `TC-07` | استعلام لا توجد له منتجات مطابقة يعرض رسالة «لا توجد منتجات مطابقة» | `[ ] ناجح / [ ] فاشل` | | |
| `TC-08` | عدم التقاط كلام (`no-speech`) يعرض رسالة «لم يُلتقط استعلام» | `[x] ناجح آليًا (node --test)` | 2026-11-25 | يُؤكد يدويًا على Chrome |
| `TC-09` | متصفح غير داعم يُخفي زر الميكروفون تلقائيًا | `[x] ناجح آليًا (node --test)` | 2026-11-25 | يُؤكد يدويًا على Firefox |
| `TC-10` | مزامنة منتج جديد/معدّل تلقائيًا في Meilisearch عبر Scout | `[ ] ناجح / [ ] فاشل` | | |

## ثانيًا: أوامر تشغيل الاختبارات والتجارب على Laragon
```bash
# 1. اختبارات الوحدة والتكامل للحزمة
php artisan test packages/ust/arabic-voice-search/tests

# 2. التحقق من NFR-02 في Bagisto 2.4
php artisan arabic-voice-search:verify-nfr02 --compare=storage/app/bagisto_schema_before.json

# 3. تشغيل حسابات التجارب الثلاث للفصل الرابع
php artisan arabic-voice-search:evaluate --experiment=wer --input=storage/app/wer_input.json --output=storage/app/wer_summary.json
php artisan arabic-voice-search:evaluate --experiment=relevance --input=storage/app/rel_input.json --output=storage/app/rel_summary.json
php artisan arabic-voice-search:evaluate --experiment=latency --input=storage/app/lat_input.json --output=storage/app/lat_summary.json
```
