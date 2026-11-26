<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Ust\ArabicVoiceSearch\Evaluation\MetricsCalculator;

/**
 * اختبارات الوحدة لحاسبة مقاييس التجارب الثلاث (WER، P@5، MRR، Latency).
 */
class Cycle4EvaluationMetricsTest extends TestCase
{
    public function test_wer_calculation_for_exact_and_partial_matches(): void
    {
        $calc = new MetricsCalculator();

        // تطابق كامل بعد التطبيع (حقيبة == حقيبه)
        $this->assertSame(0.0, $calc->wer('حقيبة ظهر سوداء', 'حقيبه ظهر سوداء'));

        // خطأ واحد (استبدال) من أصل 3 كلمات => 1/3 = 0.3333
        $this->assertSame(0.3333, $calc->wer('حقيبة ظهر سوداء', 'شنطة ظهر سوداء'));
    }

    public function test_relevance_metrics_p_at_5_mrr_and_zero_result_rate(): void
    {
        $calc = new MetricsCalculator();

        $summary = $calc->summarizeRelevance([
            // الاستعلام 1: نتيجتان ذواتا صلة في الموضعين 1 و3 => P@5 = 0.4، RR = 1.0
            ['retrieved' => [10, 20, 30, 40, 50], 'relevant' => [10, 30]],
            // الاستعلام 2: بلا نتائج => P@5 = 0.0، RR = 0.0
            ['retrieved' => [], 'relevant' => [99]],
        ], 5);

        $this->assertSame(2, $summary['total_queries']);
        $this->assertSame(0.2, $summary['mean_p_at_k']);
        $this->assertSame(0.5, $summary['mrr']);
        $this->assertSame(0.5, $summary['zero_result_rate']);
    }

    public function test_latency_summary_computes_min_avg_percentiles_and_max(): void
    {
        $calc = new MetricsCalculator();
        $summary = $calc->summarizeLatency([10, 20, 30, 40, 50]);

        $this->assertSame(5, $summary['count']);
        $this->assertSame(10.0, $summary['min_ms']);
        $this->assertSame(30.0, $summary['avg_ms']);
        $this->assertSame(30.0, $summary['p50_ms']);
        $this->assertSame(50.0, $summary['max_ms']);
    }
}
