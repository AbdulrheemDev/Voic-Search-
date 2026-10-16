<?php

namespace App\Console\Commands;

use App\Search\Evaluation\Dataset;
use App\Search\Evaluation\Metrics;
use App\Search\SearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * التجربة الثانية (القسم 3.11.3 من الفصل الثالث): قياس أثر مراحل المعالجة في ملاءمة النتائج.
 *
 * يُشغَّل المحرك بثلاثة إعدادات متدرجة على الاستعالمات الاختبارية:
 *   (أ) نص الاستعالم كما هو دون معالجة،
 *   (ب) بعد التطبيع وحذف عبارات الطلب،
 *   (ج) بعد إضافة القاموس التجاري.
 * وتُحسب لكل إعداد الدقة عند 5 ومتوسط الرتبة العكسية وعدد الاستعالمات التي لم تُعد أي نتيجة،
 * مرة على النصوص المرجعية لعزل أثر المعالجة عن أخطاء التعرف على الكلام، ومرة على النصوص
 * الناتجة عن التعرف إن كانت متوفرة.
 */
class ExperimentRelevanceCommand extends Command
{
    protected $signature = 'search:experiment-relevance
        {--source=both : reference أو asr أو both}
        {--setting=all : إعداد واحد (a أو b أو c) أو all}
        {--output= : مسار ملف الإخراج}';

    protected $description = 'تنفيذ التجربة الثانية: الدقة عند 5 ومتوسط الرتبة العكسية للإعدادات المتدرجة';

    public function handle(Dataset $dataset, SearchService $search): int
    {
        $queries = $dataset->queriesForEvaluation();
        $relevance = $dataset->relevance();
        $recognized = $dataset->recognizedTexts();

        $sources = match ($this->option('source')) {
            'reference' => ['reference'],
            'asr' => ['asr'],
            default => $recognized === [] ? ['reference'] : ['reference', 'asr'],
        };
        if (in_array('asr', $sources, true) && $recognized === []) {
            $this->warn('لا توجد نتائج تسجيل محفوظة، شُغِّلت التجربة على النصوص المرجعية فقط.');
            $sources = ['reference'];
        }

        $settings = $this->option('setting') === 'all' ? ['a', 'b', 'c'] : [$this->option('setting')];
        $labels = ['a' => 'أ', 'b' => 'ب', 'c' => 'ج'];
        $rows = [];
        $summary = [];

        foreach ($sources as $source) {
            foreach ($settings as $setting) {
                $sumPrecision = 0.0;
                $sumReciprocal = 0.0;
                $empty = 0;
                $count = 0;
                $perCategory = [];

                foreach ($queries as $query) {
                    $text = $source === 'reference' ? $query['reference'] : ($recognized[$query['id']] ?? '');
                    if (trim((string) $text) === '') {
                        continue;
                    }
                    $result = $search->search($text, $setting, 20);
                    $ids = $result['products']->pluck('id')->map(fn ($id): int => (int) $id)->all();
                    $relevant = $relevance[$query['id']] ?? [];

                    $precision = Metrics::precisionAtK($ids, $relevant);
                    $reciprocal = Metrics::reciprocalRank($ids, $relevant);
                    $sumPrecision += $precision;
                    $sumReciprocal += $reciprocal;
                    $empty += $ids === [] ? 1 : 0;
                    $count++;

                    $perCategory[$query['category']]['count'] = ($perCategory[$query['category']]['count'] ?? 0) + 1;
                    $perCategory[$query['category']]['precision'] = ($perCategory[$query['category']]['precision'] ?? 0) + $precision;
                    $perCategory[$query['category']]['reciprocal'] = ($perCategory[$query['category']]['reciprocal'] ?? 0) + $reciprocal;
                    $perCategory[$query['category']]['empty'] = ($perCategory[$query['category']]['empty'] ?? 0) + ($ids === [] ? 1 : 0);

                    $rows[] = [
                        'source' => $source,
                        'setting' => $labels[$setting],
                        'query_id' => $query['id'],
                        'category' => $query['category'],
                        'query_text' => $text,
                        'processed' => $result['query'],
                        'hits' => implode(' ', array_slice($ids, 0, Metrics::K)),
                        'precision_5' => number_format($precision, 3, '.', ''),
                        'rr' => number_format($reciprocal, 3, '.', ''),
                        'no_results' => $ids === [] ? 1 : 0,
                    ];
                }

                if ($count === 0) {
                    continue;
                }

                $summary[$source][$labels[$setting]] = [
                    'queries' => $count,
                    'P_at_5' => round($sumPrecision / $count, 3),
                    'MRR' => round($sumReciprocal / $count, 3),
                    'no_results' => $empty,
                    'by_category' => array_map(static fn (array $c): array => [
                        'queries' => $c['count'],
                        'P_at_5' => round($c['precision'] / $c['count'], 3),
                        'MRR' => round($c['reciprocal'] / $c['count'], 3),
                        'no_results' => $c['empty'],
                    ], $perCategory),
                ];

                $this->table(['الفئة', 'عدد الاستعالمات', 'الدقة عند 5', 'متوسط الرتبة العكسية', 'دون نتائج'],
                    array_map(static fn (string $category, array $c): array => [
                        $category, $c['queries'], number_format($c['P_at_5'], 3), number_format($c['MRR'], 3), $c['no_results'],
                    ], array_keys($perCategory), $perCategory));
                $this->line(sprintf('الإعداد (%s) على %s: الدقة عند 5 = %.3f، متوسط الرتبة العكسية = %.3f، الاستعالمات دون نتائج = %d',
                    $labels[$setting], $source, $summary[$source][$labels[$setting]]['P_at_5'],
                    $summary[$source][$labels[$setting]]['MRR'], $empty));
            }
        }

        $outputDir = $this->option('output') ?: base_path('docs/results');
        File::ensureDirectoryExists($outputDir);
        File::put($outputDir . '/experiment2_relevance.json',
            json_encode(['summary' => $summary, 'rows' => $rows], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $handle = fopen($outputDir . '/experiment2_relevance.csv', 'w');
        fputcsv($handle, array_keys($rows[0] ?? []));
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);

        $this->info('حُفظت نتائج التجربة الثانية في ' . $outputDir);

        return self::SUCCESS;
    }
}
