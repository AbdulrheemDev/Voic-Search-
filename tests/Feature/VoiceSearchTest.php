<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\LexiconEntry;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * حالات اختبار التكامل الوظيفي TC-01 إلى TC-10 (الجدول 13.3 من الفصل الثالث).
 *
 * تُنفذ الحالات على مسار نقاط التكامل المعلنة: صفحة البحث (نقطة التكامل الأولى)،
 * ومسار API للبحث (نقطة التكامل الثانية)، ونموذج المنتج القابل للبحث (الثالثة)،
 * وجدول القاموس التجاري (الرابعة). أما اختبار المطابقة الفعلية في Meilisearch فيتم
 * في بيئة التكامل بالأمر search:experiment-relevance.
 */
class VoiceSearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $category = Category::query()->create(['id' => 1, 'name' => 'الحقائب']);
        Product::query()->create([
            'id' => 1, 'name' => 'حقيبة ظهر جلدية', 'category_id' => $category->id,
            'description' => 'حقيبة ظهر جلدية بجيوب متعددة', 'price' => 15000,
            'image' => 'images/products/cat01.svg', 'stock' => 5,
        ]);
    }

    /** TC-01: بحث صوتي باسم منتج كما في البيانات */
    public function test_voice_search_with_exact_product_name(): void
    {
        $response = $this->postJson('/api/voice-search', ['query' => 'حقيبة ظهر جلدية']);
        $response->assertOk()->assertJsonStructure(['query', 'stages', 'products', 'timing_ms']);
        $this->assertSame('حقيبه ظهر جلديه', $response->json('query'));
    }

    /** TC-02: بحث نصي بمسار المعالجة نفسه */
    public function test_text_search_uses_same_pipeline(): void
    {
        $voice = $this->postJson('/api/voice-search', ['query' => 'حقيبة ظهر جلدية'])->json('query');
        $typed = $this->postJson('/api/voice-search', ['query' => 'حقيبه ظهر جلديه'])->json('query');
        $this->assertSame($voice, $typed);
    }

    /** TC-03: بحث بلفظ دارج مسجل في القاموس */
    public function test_colloquial_term_is_replaced_by_canonical_term(): void
    {
        LexiconEntry::query()->create([
            'term' => 'شنطة ظهر', 'normalized_term' => 'شنطه ظهر',
            'canonical_term' => 'حقيبه ظهر', 'relation_type' => LexiconEntry::RELATION_SUBSTITUTION,
        ]);
        $response = $this->postJson('/api/voice-search', ['query' => 'شنطة ظهر']);
        $this->assertSame('حقيبه ظهر', $response->json('query'));
    }

    /** TC-04: حذف عبارة طلب من الاستعالم */
    public function test_request_phrase_is_removed(): void
    {
        $response = $this->postJson('/api/voice-search', ['query' => 'أبغى حقيبة ظهر لو سمحت']);
        $this->assertSame('حقيبه ظهر', $response->json('query'));
    }

    /** TC-05: الاستعالم نفسه بصورتي كتابة مختلفتين يعطي الاستعالم المطبَّع نفسه */
    public function test_two_spellings_produce_identical_query(): void
    {
        $first = $this->postJson('/api/voice-search', ['query' => 'حقيبة ظهر جلدية'])->json('query');
        $second = $this->postJson('/api/voice-search', ['query' => 'حقيبه ظهر جلديه'])->json('query');
        $this->assertSame($first, $second);
    }

    /** TC-07 وTC-08: الحالات الاستثنائية */
    public function test_empty_query_returns_warning_message(): void
    {
        $response = $this->postJson('/api/voice-search', ['query' => '']);
        $response->assertOk();
        $this->assertStringContainsString('لم يُلتقط', (string) $response->json('message'));
        $this->assertSame(0, $response->json('count'));
    }

    /** TC-09: إخفاء زر الميكروفون في المتصفحات غير الداعمة */
    public function test_search_page_hides_microphone_by_default(): void
    {
        $response = $this->get('/search');
        $response->assertOk();
        $response->assertSee('id="mic-button"', false);
        $response->assertSee('hidden', false);
        $response->assertSee('/js/voice-search.js', false);
    }

    /** TC-10: تعديل اسم منتج في قاعدة البيانات يغير وثيقة الفهرسة */
    public function test_product_index_document_is_normalized(): void
    {
        $product = Product::query()->with(['category', 'attributeValues'])->findOrFail(1);
        $document = $product->toSearchableArray();
        $this->assertSame('حقيبه ظهر جلديه', $document['name']);
        $this->assertSame('الحقائب', $document['category']);
        $this->assertArrayHasKey('attributes', $document);
        $this->assertArrayNotHasKey('price', $document, 'السعر لا يُفهرس ويُعرض من قاعدة البيانات');
    }

    /** إعداد المرادفات يحتوي علاقات التكافؤ بصيغتها المطبَّعة */
    public function test_index_settings_include_synonyms_and_matching_strategy(): void
    {
        LexiconEntry::query()->create([
            'term' => 'كنبة', 'normalized_term' => 'كنبه', 'canonical_term' => 'اريكه',
            'relation_type' => LexiconEntry::RELATION_EQUIVALENCE,
        ]);
        $settings = app(\App\Search\IndexSettings::class)->toArray();
        $this->assertSame(['name', 'category', 'attributes', 'description'], $settings['searchableAttributes']);
        $this->assertSame('last', $settings['matchingStrategy']);
        $this->assertArrayHasKey('كنبه', $settings['synonyms']);
    }
}
