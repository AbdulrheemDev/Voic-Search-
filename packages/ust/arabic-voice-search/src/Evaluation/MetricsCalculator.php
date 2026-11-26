<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Evaluation;

use Ust\ArabicVoiceSearch\Processing\ArabicNormalizer;

/**
 * حاسبة مقاييس التقييم المعتمدة للتجارب الثلاث في الفصل الرابع (القسم 11.3 من التقرير المعتمد).
 *
 * - التجربة 1: معدل خطأ الكلمة (WER = (S + D + I) / N) على مستوى الكلمات.
 * - التجربة 2: الدقة عند أول 5 نتائج (P@5)، متوسط مقلوب الرتبة (MRR)، ونسبة الاستعلامات بلا نتائج.
 * - التجربة 3: إحصاءات زمن الاستجابة بالملي ثانية (min, avg, p50, p95, max) دون تخزين نصوص الاستعلامات (NFR-06).
 *
 * المتطلبات المرتبطة: O6, TR-01..TR-03, NFR-06
 */
class MetricsCalculator
{
    public function __construct(
        private readonly ArabicNormalizer $normalizer = new ArabicNormalizer()
    ) {}

    /**
     * حساب معدل خطأ الكلمة (WER) بين النص المرجعي ونص التعرف الصوتي.
     * WER = (S + D + I) / N
     */
    public function wer(string $reference, string $hypothesis, bool $normalize = true): float
    {
        $refText = $normalize ? $this->normalizer->normalize($reference) : trim($reference);
        $hypText = $normalize ? $this->normalizer->normalize($hypothesis) : trim($hypothesis);

        $refWords = $this->normalizer->tokenize($refText);
        $hypWords = $this->normalizer->tokenize($hypText);

        $n = count($refWords);
        if ($n === 0) {
            return count($hypWords) === 0 ? 0.0 : 1.0;
        }

        $distance = $this->wordLevenshtein($refWords, $hypWords);

        return round($distance / $n, 4);
    }

    /**
     * حساب الدقة عند أول k نتيجة (P@k — القيمة المعتمدة k=5 وفق القرار D-06).
     *
     * @param list<int|string> $retrievedIds
     * @param list<int|string> $relevantIds
     */
    public function precisionAtK(array $retrievedIds, array $relevantIds, int $k = 5): float
    {
        if ($k <= 0) {
            return 0.0;
        }

        $topK = array_slice($retrievedIds, 0, $k);
        if ($topK === []) {
            return 0.0;
        }

        $relevantLookup = array_flip(array_map('strval', $relevantIds));
        $hits = 0;

        foreach ($topK as $id) {
            if (isset($relevantLookup[(string) $id])) {
                $hits++;
            }
        }

        return round($hits / $k, 4);
    }

    /**
     * حساب مقلوب الرتبة لأول نتيجة ذات صلة (Reciprocal Rank) لحساب MRR.
     *
     * @param list<int|string> $retrievedIds
     * @param list<int|string> $relevantIds
     */
    public function reciprocalRank(array $retrievedIds, array $relevantIds): float
    {
        $relevantLookup = array_flip(array_map('strval', $relevantIds));

        foreach ($retrievedIds as $index => $id) {
            if (isset($relevantLookup[(string) $id])) {
                return round(1.0 / ($index + 1), 4);
            }
        }

        return 0.0;
    }

    /**
     * تلخيص نتائج التجربة 2 لمجموعة استعلامات (P@5، MRR، نسبة عدم وجود نتائج).
     *
     * @param list<array{retrieved: list<int|string>, relevant: list<int|string>}> $evaluations
     * @return array{total_queries: int, mean_p_at_k: float, mrr: float, zero_result_rate: float}
     */
    public function summarizeRelevance(array $evaluations, int $k = 5): array
    {
        $total = count($evaluations);
        if ($total === 0) {
            return [
                'total_queries' => 0,
                'mean_p_at_k' => 0.0,
                'mrr' => 0.0,
                'zero_result_rate' => 0.0,
            ];
        }

        $sumP = 0.0;
        $sumRR = 0.0;
        $zeroCount = 0;

        foreach ($evaluations as $item) {
            $retrieved = $item['retrieved'] ?? [];
            $relevant = $item['relevant'] ?? [];

            if ($retrieved === []) {
                $zeroCount++;
            }

            $sumP += $this->precisionAtK($retrieved, $relevant, $k);
            $sumRR += $this->reciprocalRank($retrieved, $relevant);
        }

        return [
            'total_queries' => $total,
            'mean_p_at_k' => round($sumP / $total, 4),
            'mrr' => round($sumRR / $total, 4),
            'zero_result_rate' => round($zeroCount / $total, 4),
        ];
    }

    /**
     * تلخيص أزمنة الاستجابة للتجربة 3 بالملي ثانية (دون تخزين نص الاستعلام — NFR-06).
     *
     * @param list<float|int> $samplesMs
     * @return array{count: int, min_ms: float, avg_ms: float, p50_ms: float, p95_ms: float, max_ms: float}
     */
    public function summarizeLatency(array $samplesMs): array
    {
        $count = count($samplesMs);
        if ($count === 0) {
            return [
                'count' => 0,
                'min_ms' => 0.0,
                'avg_ms' => 0.0,
                'p50_ms' => 0.0,
                'p95_ms' => 0.0,
                'max_ms' => 0.0,
            ];
        }

        $sorted = array_map('floatval', $samplesMs);
        sort($sorted, SORT_NUMERIC);

        $sum = array_sum($sorted);

        return [
            'count' => $count,
            'min_ms' => round($sorted[0], 2),
            'avg_ms' => round($sum / $count, 2),
            'p50_ms' => round($this->percentile($sorted, 50), 2),
            'p95_ms' => round($this->percentile($sorted, 95), 2),
            'max_ms' => round($sorted[$count - 1], 2),
        ];
    }

    /**
     * مسافة ليفنشتاين على مستوى الكلمات لحساب (S + D + I).
     *
     * @param list<string> $a
     * @param list<string> $b
     */
    private function wordLevenshtein(array $a, array $b): int
    {
        $m = count($a);
        $n = count($b);

        $dp = [];
        for ($i = 0; $i <= $m; $i++) {
            $dp[$i][0] = $i;
        }
        for ($j = 0; $j <= $n; $j++) {
            $dp[0][$j] = $j;
        }

        for ($i = 1; $i <= $m; $i++) {
            for ($j = 1; $j <= $n; $j++) {
                $cost = $a[$i - 1] === $b[$j - 1] ? 0 : 1;
                $dp[$i][$j] = min(
                    $dp[$i - 1][$j] + 1,       // حذف (Deletion)
                    $dp[$i][$j - 1] + 1,       // إدراج (Insertion)
                    $dp[$i - 1][$j - 1] + $cost // استبدال (Substitution)
                );
            }
        }

        return $dp[$m][$n];
    }

    /**
     * حساب المئين (Percentile) لقائمة مرتبة من الأزمنة.
     *
     * @param list<float> $sorted
     */
    private function percentile(array $sorted, float $p): float
    {
        $n = count($sorted);
        if ($n === 1) {
            return $sorted[0];
        }

        $rank = ($p / 100.0) * ($n - 1);
        $lower = (int) floor($rank);
        $upper = (int) ceil($rank);

        if ($lower === $upper) {
            return $sorted[$lower];
        }

        $weight = $rank - $lower;
        return $sorted[$lower] * (1.0 - $weight) + $sorted[$upper] * $weight;
    }
}
