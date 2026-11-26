<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Ust\ArabicVoiceSearch\Processing\ArabicNormalizer;
use Ust\ArabicVoiceSearch\Processing\CommercialLexicon;
use Ust\ArabicVoiceSearch\Processing\QueryProcessor;
use Ust\ArabicVoiceSearch\Processing\StopPhraseFilter;

/**
 * اختبارات الوحدة للدورة 2 — التطبيع، حذف عبارات الطلب، والقاموس التجاري.
 *
 * تغطي معايير الخروج E2-1، E2-2، E2-3، والجداول (7.3)، (8.3)، (9.3).
 */
class Cycle2QueryProcessingTest extends TestCase
{
    public function test_normalizer_applies_all_seven_rules_from_table_7_3(): void
    {
        $normalizer = new ArabicNormalizer();

        // 1. حذف التشكيل + 4. التاء المربوطة
        $this->assertSame('حقيبه', $normalizer->normalize('حَقِيبَة'));
        // 2. حذف التطويل + 4. التاء المربوطة
        $this->assertSame('حقيبه', $normalizer->normalize('حقيــبة'));
        // 3. توحيد الألف المهموزة (أ، إ، آ) إلى ا
        $this->assertSame('اسود', $normalizer->normalize('أسود'));
        $this->assertSame('ابره', $normalizer->normalize('إبرة'));
        $this->assertSame('اخر', $normalizer->normalize('آخر'));
        // 5. تحويل الألف المقصورة في آخر الكلمة إلى ي
        $this->assertSame('حلوي', $normalizer->normalize('حلوى'));
        // 6. توحيد الأرقام الهندية إلى الأرقام العربية
        $this->assertSame('42', $normalizer->normalize('٤٢'));
        // 7. حذف علامات الترقيم وتوحيد المسافات
        $this->assertSame('حقيبه ظهر', $normalizer->normalize('حقيبة، ظهر!'));
    }

    public function test_stop_phrase_filter_removes_single_and_two_word_phrases_without_emptying_query(): void
    {
        $normalizer = new ArabicNormalizer();
        $filter = new StopPhraseFilter($normalizer);

        // حذف عبارات من كلمة وكلمتين
        $tokens = $normalizer->tokenize($normalizer->normalize('أبغى شنطة ظهر سوداء لو سمحت'));
        $this->assertSame(['شنطه', 'ظهر', 'سوداء'], $filter->filter($tokens));

        // شرط عدم إفراغ الاستعلام (الخوارزمية 1.3 الخطوة 4)
        $onlyStop = $normalizer->tokenize($normalizer->normalize('أريد لو سمحت'));
        $this->assertSame(['اريد', 'لو', 'سمحت'], $filter->filter($onlyStop));
    }

    public function test_commercial_lexicon_prefers_two_word_match_before_single_word(): void
    {
        $normalizer = new ArabicNormalizer();
        $lexicon = new CommercialLexicon($normalizer, [
            'شنطة ظهر' => 'حقيبة ظهر مدرسية',
            'شنطة' => 'حقيبة',
        ]);

        $this->assertSame(
            ['حقيبه', 'ظهر', 'مدرسيه', 'سوداء'],
            $lexicon->applyReplacements(['شنطه', 'ظهر', 'سوداء'])
        );
    }

    public function test_table_9_3_end_to_end_example_matches_literally(): void
    {
        $normalizer = new ArabicNormalizer();
        $filter = new StopPhraseFilter($normalizer);
        $lexicon = new CommercialLexicon($normalizer, [
            'شنطة' => 'حقيبة',
        ]);
        $processor = new QueryProcessor($normalizer, $filter, $lexicon);

        $result = $processor->process('أبغى شنطة ظهر سوداء لو سمحت');

        $this->assertSame('أبغى شنطة ظهر سوداء لو سمحت', $result['raw']);
        $this->assertSame('ابغي شنطه ظهر سوداء لو سمحت', $result['normalized']);
        $this->assertSame('شنطه ظهر سوداء', $result['after_stop_phrases']);
        $this->assertSame('حقيبه ظهر سوداء', $result['processed']);
    }
}
