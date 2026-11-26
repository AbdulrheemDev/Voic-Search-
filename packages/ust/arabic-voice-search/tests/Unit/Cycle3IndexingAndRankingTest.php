<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Tests\Unit;

use Illuminate\Database\Eloquent\Model;
use PHPUnit\Framework\TestCase;
use Ust\ArabicVoiceSearch\Indexing\MeilisearchSettingsBuilder;
use Ust\ArabicVoiceSearch\Search\VoiceSearchService;

/**
 * اختبارات الوحدة للدورة 3 — إعدادات Meilisearch (الجدول 10.3) والحفاظ على ترتيب النتائج (R-08).
 */
class Cycle3IndexingAndRankingTest extends TestCase
{
    public function test_meilisearch_settings_match_table_10_3_literally(): void
    {
        $builder = new MeilisearchSettingsBuilder();
        $settings = $builder->build([
            ['normalized_term' => 'جوال', 'canonical_term' => 'هاتف'],
            ['normalized_term' => 'حقيبة', 'canonical_term' => 'شنطة'],
        ]);

        // ترتيب searchableAttributes المعتمد: الاسم، الفئة، قيم الخصائص، الوصف
        $this->assertSame(
            ['name', 'category', 'attributes', 'description'],
            $settings['searchableAttributes']
        );

        // استراتيجية المطابقة last
        $this->assertSame('last', $settings['matchingStrategy']);
        $this->assertTrue($settings['typoTolerance']['enabled']);

        // المرادفات المتكافئة ثنائية الاتجاه ومطبّعة
        $this->assertSame(['هاتف'], $settings['synonyms']['جوال']);
        $this->assertSame(['جوال'], $settings['synonyms']['هاتف']);
        $this->assertSame(['شنطه'], $settings['synonyms']['حقيبه']);
        $this->assertSame(['حقيبه'], $settings['synonyms']['شنطه']);
    }

    public function test_preserve_meilisearch_order_keeps_exact_ranking_from_index(): void
    {
        $makeRecord = static function (int $id): Model {
            $m = new class extends Model {
                protected $guarded = [];
            };
            $m->setAttribute('id', $id);
            return $m;
        };

        // MySQL أعادت السجلات بترتيب تصاعدي [1, 2, 3]
        $dbRecords = [$makeRecord(1), $makeRecord(2), $makeRecord(3)];
        // بينما Meilisearch رتّبتها حسب الصلة [3, 1, 2]
        $ordered = VoiceSearchService::preserveMeilisearchOrder([3, 1, 2], $dbRecords);

        $ids = array_map(static fn (Model $m): int => (int) $m->getKey(), $ordered);
        $this->assertSame([3, 1, 2], $ids);
    }
}
