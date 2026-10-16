<?php

namespace Tests\Unit;

use App\Search\Normalizer;
use App\Search\StopPhraseFilter;
use PHPUnit\Framework\TestCase;

/**
 * اختبارات حذف عبارات الطلب (الجدول 8.3) — تحقق من الحالة TC-04.
 */
class StopPhraseFilterTest extends TestCase
{
    private StopPhraseFilter $filter;
    private Normalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new Normalizer();
        $this->filter = new StopPhraseFilter($this->normalizer, [
            'أريد', 'أبغى', 'أحتاج', 'ودي', 'ابحث عن', 'دور لي', 'شوف لي', 'أعطني',
            'لو سمحت', 'من فضلك', 'هل', 'عندكم', 'يوجد',
        ]);
    }

    public function test_removes_single_word_request_phrases(): void
    {
        $words = $this->normalizer->tokenize('أبغى شنطة ظهر سوداء لو سمحت');
        $this->assertSame(['شنطه', 'ظهر', 'سوداء'], $this->filter->apply($words));
    }

    public function test_removes_two_word_phrases(): void
    {
        $words = $this->normalizer->tokenize('شوف لي كرسي شغل');
        $this->assertSame(['كرسي', 'شغل'], $this->filter->apply($words));
    }

    public function test_keeps_query_when_removal_would_empty_it(): void
    {
        $words = $this->normalizer->tokenize('هل عندكم');
        $this->assertSame(['هل', 'عندكم'], $this->filter->apply($words));
    }

    public function test_leaves_queries_without_request_phrases_unchanged(): void
    {
        $words = $this->normalizer->tokenize('حقيبة ظهر جلدية');
        $this->assertSame(['حقيبه', 'ظهر', 'جلديه'], $this->filter->apply($words));
    }
}
