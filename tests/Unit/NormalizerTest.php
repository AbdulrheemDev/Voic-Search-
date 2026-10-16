<?php

namespace Tests\Unit;

use App\Search\Normalizer;
use PHPUnit\Framework\TestCase;

/**
 * اختبارات قواعد التطبيع (الجدول 7.3 من الفصل الثالث) — تحقق من الحالة TC-05.
 */
class NormalizerTest extends TestCase
{
    private Normalizer $normalizer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->normalizer = new Normalizer();
    }

    public function test_removes_diacritics_and_tatweel(): void
    {
        $this->assertSame('حقيبة', $this->normalizer->normalize('حَقِيبَة'));
        $this->assertSame('حقيبه', $this->normalizer->normalize('حقيـبة'));
    }

    public function test_unifies_hamza_forms_to_alef(): void
    {
        $this->assertSame('اسود', $this->normalizer->normalize('أسود'));
        $this->assertSame('ان', $this->normalizer->normalize('إن'));
        $this->assertSame('اخر', $this->normalizer->normalize('آخر'));
    }

    public function test_word_final_taa_marbuta_and_alef_maqsura(): void
    {
        $this->assertSame('حقيبه', $this->normalizer->normalize('حقيبة'));
        $this->assertSame('حلوي', $this->normalizer->normalize('حلوى'));
        // التاء المربوطة في وسط الكلمة لا تُحوَّل
        $this->assertSame('فاطمه', $this->normalizer->normalize('فاطمة'));
    }

    public function test_converts_arabic_indic_digits(): void
    {
        $this->assertSame('24', $this->normalizer->normalize('٢٤'));
        $this->assertSame('100 مل', $this->normalizer->normalize('١٠٠ مل'));
    }

    public function test_removes_punctuation_and_collapses_spaces(): void
    {
        $this->assertSame('حقيبه ظهر', $this->normalizer->normalize('!حقيبة،  ظهر '));
    }

    public function test_identical_normalized_forms_are_equal(): void
    {
        $this->assertSame(
            $this->normalizer->normalize('حقيبة ظهر جلدية'),
            $this->normalizer->normalize('حقيبه ظهر جلديه')
        );
    }
}
