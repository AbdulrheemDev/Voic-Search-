# دليل التنفيذ خطوة بخطوة وتوثيق التحقق

يوثق هذا الملف **كل خطوة من خطوات تنفيذ الفصل الرابع** كما نُفذت فعلًا في المشروع، ويقابل كل خطوة:
موضعها في الفصل الثالث (التصميم)، وملف التنفيذ، والأمر أو الاختبار الذي يتحقق منه، والنتيجة المتحصلة.

> المرجع: الفصل الثالث من وثيقة المشروع (منهجية وتقنيات البحث)، ووثيقة الفصل الرابع
> `docs/الفصل-الرابع-التنفيذ-والنتائج.docx`.

---

## المجموعة الأولى: تهيئة المشروع والبيئة

| # | الخطوة | موضعها في التصميم | ملف التنفيذ | أمر التحقق | النتيجة |
| --- | --- | --- | --- | --- | --- |
| 1 | بناء هيكل تطبيق Laravel 12 | الجدول (2.1) في الفصل الأول | `composer.json`، `bootstrap/app.php`، `artisan` | `composer install && php artisan --version` | هيكل جاهز بإطار Laravel 12 |
| 2 | ضبط الإعدادات | الجدول (2.1) | `.env.example`، `config/scout.php`، `config/services.php` | فحص ملفات الإعداد | اتصال MySQL وMeilisearch معرَّف |
| 3 | تعريف مسارات المتجر ونقاط التكامل | القسم (2.5.3) | `routes/web.php`، `routes/api.php` | `php artisan route:list` | مسار واحد للبحث: `POST /api/voice-search` |

## المجموعة الثانية: بناء بيانات التجربة

| # | الخطوة | موضعها في التصميم | ملف التنفيذ | أمر التحقق | النتيجة |
| --- | --- | --- | --- | --- | --- |
| 4 | إنشاء جداول المتجر | القسم (1.3.3) والشكل (5.3) | الترحيلات 1 إلى 4 | `php artisan migrate` | 4 جداول: `categories`، `attributes`، `products`، `attribute_values` |
| 5 | إنشاء جدول القاموس التجاري (نقطة التكامل 4) | الجدول (11.3) | الترحيل 5 | `php artisan migrate` | جدول `lexicon_entries` بحقوله الأربعة + قيد `unique` |
| 6 | توليد بيانات المنتجات | القسم (1.3.3) | `resources/data/products.csv` | `wc -l resources/data/products.csv` | 216 منتجًا في 12 فئة و336 قيمة خصائص |
| 7 | استيراد بيانات المتجر | القسم (1.3.3) | `app/Console/Commands/ImportStoreDataCommand.php` | `php artisan store:import-data --fresh` | جداول المتجر معبأة |
| 8 | بناء القاموس التجاري | القسم (2.3.3) والجدول (3.3) | `resources/data/lexicon_entries.csv` | `wc -l resources/data/lexicon_entries.csv` | 67 مدخلًا: 58 استبدالًا و9 تكافؤ |
| 9 | استيراد القاموس مع توليد الصيغة المطبَّعة | الجدول (11.3) | `ImportLexiconCommand.php` | `php artisan lexicon:import --fresh` | كل مدخل بـ `normalized_term` محسوب بالتطبيع |
| 10 | إعداد مجموعة الاستعلامات الاختبارية | القسم (3.3.3) والجدول (4.3) | `resources/data/test_queries.csv` | `wc -l resources/data/test_queries.csv` | 100 استعلام في 5 فئات (20 لكل فئة) |
| 11 | إعداد أحكام الصلة قبل تشغيل المحرك | القسم (3.3.3) | `resources/data/relevance_judgements.json` | فحص الملف | مجموعة صلة لكل استعلام (2 إلى 4 منتجات، بمتوسط 3.6) |
| 12 | إعداد المتحدثين وقائمة التسجيلات | القسم (3.11.3) | `speakers.csv`، `recordings_manifest.csv` | فحص الملفين | 5 متحدثين و400 تسجيل مطلوب |

## المجموعة الثالثة: تنفيذ وحدات المحرك

| # | الخطوة | موضعها في التصميم | ملف التنفيذ | أمر التحقق | النتيجة |
| --- | --- | --- | --- | --- | --- |
| 13 | تنفيذ قواعد التطبيع السبع | الجدول (7.3) | `app/Search/Normalizer.php` | `php artisan test --filter=NormalizerTest` | 6 حالات اختبار ناجحة |
| 14 | تنفيذ حذف عبارات الطلب | الجدول (8.3) | `app/Search/StopPhraseFilter.php` + `resources/data/stop_phrases.txt` | `php artisan test --filter=StopPhraseFilterTest` | 4 حالات ناجحة، منها حماية الاستعلام من الإفراغ |
| 15 | تنفيذ القاموس التجاري | القسم (3.6.3) | `app/Search/Lexicon.php` | `php artisan test --filter=LexiconTest` | 4 حالات ناجحة، منها تفضيل المطابقة الأطول |
| 16 | تنفيذ معالجة الاستعلام | الخوارزمية (1.3) الخطوات 2–6 | `app/Search/QueryProcessor.php` | `php artisan test --filter=VoiceSearchTest` | المسار الكامل ناجح |
| 17 | تنفيذ وثيقة الفهرسة | الجدولان (1.3) و(2.3) | `app/Models/Product.php` → `toSearchableArray()` | `php artisan test --filter=test_product_index_document_is_normalized` | الحقول الخمسة مفهرسة بعد التطبيع، والسعر والصورة والمخزون غير مفهرسة |
| 18 | تنفيذ إعدادات الفهرس | الجدول (10.3) | `app/Search/IndexSettings.php` + `config/scout.php` | `php artisan search:index-settings --show` | الحقول والمرادفات والتسامح مع الأخطاء واستراتيجية المطابقة |
| 19 | فهرسة المنتجات | المتطلبان FR-07 وFR-08 | `IndexProductsCommand.php` | `php artisan search:index-products --flush` | 216 وثيقة في فهرس `products` |
| 20 | تنفيذ البحث والاسترجاع | القسم (5.6.3) | `app/Search/SearchService.php` | `POST /api/voice-search` | نتائج مرتبة + أزمنة المراحل |
| 21 | تنفيذ الاستجابة ونقطة التكامل 2 | القسم (2.5.3) | `SearchController.php` + `ProductResource.php` | `curl -X POST /api/voice-search` | JSON بالحقول الستة المعروضة |
| 22 | تنفيذ الحالات الاستثنائية | المتطلب FR-12 | `SearchController::message()` + `voice-search.js` | استعلام فارغ / بلا نتائج | رسالة عربية واضحة في الحالتين |

## المجموعة الرابعة: تنفيذ الواجهات

| # | الخطوة | موضعها في التصميم | ملف التنفيذ | التحقق | النتيجة |
| --- | --- | --- | --- | --- | --- |
| 23 | وحدة الإدخال الصوتي | القسم (1.6.3) | `public/js/voice-search.js` | فتح `/search` في Chrome | ضبط `lang` و`continuous=false` و`interimResults=false`، وإظهار الزر في المتصفحات الداعمة فقط |
| 24 | واجهة البحث وعرض النتائج | القسم (5.6.3) | `resources/views/search/index.blade.php` | فتح `/search` | حقل نصي + زر ميكروفون + شريط مراحل + شبكة نتائج |
| 25 | واجهات المتجر المستضيف | القسم (1.3.3) | `resources/views/store/*`، `products/show.blade.php` | فتح `/` و`/product/{id}` | صفحات المتجر التي تُعرض فيها النتائج |
| 26 | أداة تسجيل الاستعلامات | القسم (3.3.3) | `resources/views/tools/recordings.blade.php` + `public/js/recordings.js` | فتح `/tools/recordings` | عرض الجملة، وقياس زمن التعرف، وحساب WER، والحفظ |
| 27 | حماية خصوصية المتحدث | المتطلب NFR-06 | `TestToolsController::storeRecordings()` | فحص الملف المحفوظ | يُحفظ النص وزمنه فقط، ولا يُحفظ صوت |

## المجموعة الخامسة: تنفيذ التجارب وقياس النتائج

| # | الخطوة | موضعها في التصميم | ملف التنفيذ | أمر التحقق | النتيجة |
| --- | --- | --- | --- | --- | --- |
| 28 | تنفيذ مقاييس التقييم | المعادلات (1.3) و(2.3) و(3.3) | `app/Search/Evaluation/Metrics.php` | `php artisan test` | WER وP@k وRR منفذة ومختبرة |
| 29 | التجربة الثانية (أثر المعالجة) | القسم (3.11.3) | `ExperimentRelevanceCommand.php` | `php artisan search:experiment-relevance --setting=all` | P@5: 0.580 ← 0.604 ← 0.720، وMRR: 0.817 ← 0.856 ← 1.000، ودون نتائج: 9 ← 4 ← 0 |
| 30 | التجربة الثالثة (زمن الاستجابة) | القسم (3.11.3) | `ExperimentLatencyCommand.php` | `php artisan search:experiment-latency --runs=3` | الزمن الكلي في الخادم 2.38 مللي ثانية (متوسط) و3.82 عبر HTTP |
| 31 | التجربة الأولى (دقة التحويل) | القسم (3.11.3) | `ExperimentWerCommand.php` + أداة التسجيل | `php artisan search:experiment-wer` | الأداة والقياس جاهزان؛ النتائج تُستكمل بعد النطق |
| 32 | اختبار التكامل الوظيفي | الجدول (13.3) | `tests/Feature/VoiceSearchTest.php` و`tests/Unit/*` | `php artisan test` | الحالات TC-01 إلى TC-10 ناجحة |

## المجموعة السادسة: التوثيق وإخراج الفصل

| # | الخطوة | ملف التنفيذ | التحقق |
| --- | --- | --- | --- |
| 33 | توليد الأشكال (1.4) إلى (9.4) | `docs/figures/*.png` | 9 أشكال: بنية الملفات، الواجهات الأربع، نتائج التجربتين، أثر المراحل |
| 34 | كتابة الوثيقة بكامل أقسامها | `docs/الفصل-الرابع-التنفيذ-والنتائج.md` | 11 قسمًا و25 جدولًا و9 أشكال، موزعة على الأقسام التي يطلبها الدليل |
| 35 | إخراج نسخة وورد وفق دليل التنسيق | `docs/الفصل-الرابع-التنفيذ-والنتائج.docx` | A4، الهوامش (2.5 يمين، 2 يسار، 2 أعلى وأسفل)، Simplified Arabic 14 و15، عناوين الجداول أعلاها والأشكال أسفلها بحجم 12، ضبط كلي، ترقيم الصفحات أسفل الوسط |
| 36 | إخراج نسخة PDF للعرض | `docs/الفصل-الرابع-التنفيذ-والنتائج.pdf` | 32 صفحة بترويسة (عنوان المشروع وعنوان الفصل) وترقيم سفلي |

## الاختبارات ومكانها

```bash
php artisan test               # اختبارات الوحدة والتكامل (تحتاج قاعدة بيانات اختبار)
php artisan test --filter=NormalizerTest        # قواعد التطبيع (الجدول 7.3)
php artisan test --filter=StopPhraseFilterTest  # حذف عبارات الطلب (الجدول 8.3)
php artisan test --filter=LexiconTest           # القاموس التجاري (القسم 3.6.3)
php artisan test --filter=VoiceSearchTest       # حالات التكامل TC-01 إلى TC-10
```

## التزام التنفيذ بالحدود الموثقة

| القيد في الفصل الأول | كيف التُزم به |
| --- | --- |
| تحويل الكلام بواجهة Web Speech API دون تطوير نموذج تعرف أو تدريبه | لا يوجد في المشروع أي ملف تدريب أو نموذج تعلم آلي؛ الاستدعاء كله لواجهة المتصفح |
| Laravel وقاعدة MySQL | جميع الملفات بلغة PHP داخل إطار Laravel، وكل الاستعلامات على MySQL عبر Eloquent |
| Meilisearch للفهرسة والبحث | الإعدادات والبحث عبر Laravel Scout بمشغل `meilisearch` |
| القابلية للدمج دون تعديل بنية بيانات المتجر | لم يُضف أي عمود إلى جداول المتجر؛ الإضافات: مسار واحد، وسمتا واجهة، جدول مستقل |
| دعم العربية في كل المراحل | التطبيع في الخادم، والمرادفات والتسامح مع الأخطاء في Meilisearch، والعربية في الواجهة والقوائم |
| عدم حفظ صوت المستخدم أو نصوص استعلاماته | لا يوجد أي جدول لاستعلامات المستخدمين؛ ملف التجارب يحوي النصوص المرجعية المعدّة مسبقًا فقط |
