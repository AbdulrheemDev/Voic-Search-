<?php

namespace Tests\Unit;

use App\Search\Lexicon;
use App\Search\Normalizer;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * اختبارات القاموس التجاري (القسم 3.6.3 والجدول 3.3) — تحقق من الحالة TC-03
 * ومن إعداد المرادفات المستخرج من علاقات التكافؤ (الجدول 10.3).
 */
class LexiconTest extends TestCase
{
    private function lexicon(): Lexicon
    {
        return new Lexicon(new Normalizer());
    }

    public function test_replaces_colloquial_words_with_canonical_terms(): void
    {
        [, $replaced] = $this->lexicon()->apply(['شنطه', 'ظهر']);
        $this->assertNotEmpty($replaced);
        $this->assertSame('حقيبه', $replaced[0]['to'] === 'حقيبه ظهر' ? 'حقيبه' : $replaced[0]['to']);
    }

    public function test_prefers_longest_matching_phrase(): void
    {
        [$words, $replaced] = $this->lexicon()->apply(['شنطه', 'ظهر', 'سوداء']);
        $this->assertSame(['حقيبه', 'ظهر', 'سوداء'], $words);
        $this->assertSame('شنطه ظهر', $replaced[0]['from']);
    }

    public function test_applies_foreign_word_substitutions(): void
    {
        [$words] = $this->lexicon()->apply(['كندشن']);
        $this->assertSame(['مكيف', 'سبليت'], $words);
    }

    public function test_builds_synonyms_from_equivalence_relations(): void
    {
        $synonyms = $this->lexicon()->synonymsSetting();
        $this->assertArrayHasKey('كنبه', $synonyms);
        $this->assertContains('اريكه', $synonyms['كنبه']);
        $this->assertArrayNotHasKey('شنطه', $synonyms, 'علاقات الاستبدال لا تُرسل كمرادفات');
    }
}
