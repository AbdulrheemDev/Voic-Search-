<?php

namespace App\Console\Commands;

use App\Search\Evaluation\Dataset;
use App\Search\SearchService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * التجربة الثالثة (القسم 3.11.3 من الفصل الثالث): قياس زمن الاستجابة.
 *
 * يقيس الأمر زمن المعالجة في الخادم من استلام الطلب حتى إرسال الاستجابة، ويفصله إلى
 * مرحلتي المعالجة (التطبيع وحذف عبارات الطلب والقاموس) والبحث والاسترجاع، ويحسب لكل جزء
 * المتوسط والوسيط والقيمة العظمى. أما زمن التعرف على الكلام (من انتهاء الكلام إلى استلام
 * النص) فيُقاس في الواجهة من توقيت الحدثين speechend وresult وتُحفظ قيمه مع نتائج التسجيل.
 */
class ExperimentLatencyCommand extends Command
{
    protected $signature = 'search:experiment-latency
        {--runs=3 : عدد دورات التشغيل}
        {--setting=c : إعداد المعالجة}
        {--output= : مسار ملف الإخراج}';

    protected $description = 'تنفيذ التجربة الثالثة: قياس زمن معالجة الاستعالم وزمن البحث والزمن الكلي';

    public function handle(Dataset $dataset, SearchService $search): int
    {
        $queries = $dataset->queriesForEvaluation();
        $runs = max(1, (int) $this->option('runs'));
        $samples = [];

        for ($run = 1; $run <= $runs; $run++) {
            foreach ($queries as $query) {
                $result = $search->search($query['text'], (string) $this->option('setting'), 12);
                $samples[] = array_merge(
                    ['run' => $run, 'query_id' => $query['id'], 'category' => $query['category']],
                    $result['timing_ms']
                );
            }
        }

        $stat = static function (array $values): array {
            sort($values);
            $count = count($values);
            $mean = array_sum($values) / max($count, 1);
            $median = $count % 2
                ? $values[intdiv($count, 2)]
                : ($values[$count / 2 - 1] + $values[$count / 2]) / 2;

            return [
                'mean' => round($mean, 2),
                'median' => round($median, 2),
                'max' => round(max($values), 2),
                'min' => round(min($values), 2),
            ];
        };

        $summary = [
            'runs' => $runs,
            'samples' => count($samples),
            'processing' => $stat(array_column($samples, 'processing')),
            'search' => $stat(array_column($samples, 'search')),
            'retrieval' => $stat(array_column($samples, 'retrieval')),
            'server_total' => $stat(array_column($samples, 'server_total')),
        ];

        $this->table(['الجزء', 'المتوسط (مللي ثانية)', 'الوسيط', 'القيمة العظمى'],
            array_map(static fn (string $part, array $s): array => [$part, $s['mean'], $s['median'], $s['max']],
                ['المعالجة في الخادم', 'البحث في الفهرس', 'الاسترجاع من قاعدة البيانات', 'الزمن الكلي في الخادم'],
                [$summary['processing'], $summary['search'], $summary['retrieval'], $summary['server_total']]));

        $outputDir = $this->option('output') ?: base_path('docs/results');
        File::ensureDirectoryExists($outputDir);
        File::put($outputDir . '/experiment3_latency.json',
            json_encode(['summary' => $summary, 'samples' => $samples], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        $this->info('حُفظت نتائج التجربة الثالثة في ' . $outputDir);

        return self::SUCCESS;
    }
}
