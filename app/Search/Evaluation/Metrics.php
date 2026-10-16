<?php

namespace App\Search\Evaluation;

/**
 * مقاييس التقييم المعرَّفة في القسم 2.11.3 من الفصل الثالث:
 * الدقة عند k، ومتوسط الرتبة العكسية، ونسبة خطأ الكلمات.
 */
class Metrics
{
    public const K = 5;

    /**
     * الدقة عند k: نسبة المنتجات ذات الصلة بين أول k نتيجة، المعادلة (2.3).
     *
     * @param  array<int, int>  $hitIds
     * @param  array<int, int>  $relevant
     */
    public static function precisionAtK(array $hitIds, array $relevant, int $k = self::K): float
    {
        $top = array_slice($hitIds, 0, $k);
        if ($top === []) {
            return 0.0;
        }
        $relevant = array_flip($relevant);
        $hits = count(array_filter($top, static fn (int $id): bool => isset($relevant[$id])));

        return $hits / $k;
    }

    /**
     * مقلوب رتبة أول نتيجة ذات صلة، وتُحسب منها متوسط الرتبة العكسية، المعادلة (3.3).
     *
     * @param  array<int, int>  $hitIds
     * @param  array<int, int>  $relevant
     */
    public static function reciprocalRank(array $hitIds, array $relevant): float
    {
        $relevant = array_flip($relevant);
        foreach ($hitIds as $index => $id) {
            if (isset($relevant[$id])) {
                return 1 / ($index + 1);
            }
        }

        return 0.0;
    }

    /**
     * نسبة خطأ الكلمات: WER = (S + D + I) / N، المعادلة (1.3).
     *
     * @return array{S: int, D: int, I: int, C: int, N: int, wer: float}
     */
    public static function wordErrorRate(string $reference, string $hypothesis): array
    {
        $ref = preg_split('/\s+/u', trim($reference), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $hyp = preg_split('/\s+/u', trim($hypothesis), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $n = count($ref);
        $m = count($hyp);

        $distance = [];
        $operation = [];
        for ($i = 0; $i <= $n; $i++) {
            $distance[$i][0] = $i;
            $operation[$i][0] = 'D';
        }
        for ($j = 0; $j <= $m; $j++) {
            $distance[0][$j] = $j;
            $operation[0][$j] = 'I';
        }

        for ($i = 1; $i <= $n; $i++) {
            for ($j = 1; $j <= $m; $j++) {
                $substitution = $distance[$i - 1][$j - 1] + ($ref[$i - 1] === $hyp[$j - 1] ? 0 : 1);
                $deletion = $distance[$i - 1][$j] + 1;
                $insertion = $distance[$i][$j - 1] + 1;
                $best = min($substitution, $deletion, $insertion);
                $distance[$i][$j] = $best;
                $operation[$i][$j] = match ($best) {
                    $substitution => $ref[$i - 1] === $hyp[$j - 1] ? '=' : 'S',
                    $deletion => 'D',
                    default => 'I',
                };
            }
        }

        $i = $n;
        $j = $m;
        $counts = ['S' => 0, 'D' => 0, 'I' => 0, 'C' => 0];
        while ($i > 0 || $j > 0) {
            $op = ($i > 0 && $j > 0) ? $operation[$i][$j] : ($i > 0 ? 'D' : 'I');
            if ($op === 'S') {
                $counts['S']++;
                $i--;
                $j--;
            } elseif ($op === 'D') {
                $counts['D']++;
                $i--;
            } elseif ($op === 'I') {
                $counts['I']++;
                $j--;
            } else {
                $counts['C']++;
                $i--;
                $j--;
            }
        }

        $referenceWords = max($n, 1);
        $wer = ($counts['S'] + $counts['D'] + $counts['I']) / $referenceWords;

        return [
            'S' => $counts['S'],
            'D' => $counts['D'],
            'I' => $counts['I'],
            'C' => $counts['C'],
            'N' => $n,
            'wer' => round($wer, 4),
        ];
    }
}
