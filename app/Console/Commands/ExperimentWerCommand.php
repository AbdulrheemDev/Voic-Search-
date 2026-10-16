<?php

namespace App\Console\Commands;

use App\Search\Evaluation\Dataset;
use App\Search\Evaluation\Metrics;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * التجربة الأولى (القسم 3.11.3 من الفصل الثالث): قياس دقة تحويل الكلام إلى نص.
 *
 * تُقرأ نتائج التسجيل المحفوظة من أداة التسجيل (storage/app/experiments/recordings_results.csv)،
 * وهي تضم لكل تسجيل النص المتعرَّف عليه وزمن التعرف، فتُحسب نسبة خطأ الكلمات إجمالًا ولكل فئة
 * استعالم ولكل متحدث، ويُستخرج ملف النتائج التفصيلي لاستخدامه في الفصل الرابع.
 */
class ExperimentWerCommand extends Command
{
    protected $signature = 'search:experiment-wer
        {--file= : مسار ملف نتائج التسجيل}
        {--output= : مسار مجلد الإخراج}';

    protected $description = 'تنفيذ التجربة الأولى: حساب نسبة خطأ الكلمات (WER) من نتائج التسجيل';

    public function handle(Dataset $dataset): int
    {
        $file = $this->option('file') ?: storage_path('app/experiments/recordings_results.csv');
        if (! File::exists($file)) {
            $this->error('لم يُعثر على ملف نتائج التسجيل: ' . $file);
            $this->line('استخدم أداة التسجيل من صفحة /tools/recordings لتسجيل الاستعالمات الاختبارية.');
            $this->line('قائمة التسجيلات المطلوبة: ' . count($dataset->manifest()) . ' تسجيلًا '
                . '(80 استعالمًا منطوقًا × 5 متحدثين).');

            return self::FAILURE;
        }

        $handle = fopen($file, 'r');
        $header = fgetcsv($handle) ?: [];
        $records = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) === count($header)) {
                $records[] = array_combine($header, $line);
            }
        }
        fclose($handle);

        $byRecording = [];
        foreach ($records as $record) {
            $byRecording[(string) $record['recording_id']] = $record;
        }

        $speakerMeta = [];
        foreach ($dataset->speakers() as $speaker) {
            $speakerMeta[$speaker['speaker_id']] = $speaker;
        }

        $rows = [];
        foreach ($dataset->manifest() as $item) {
            $record = $byRecording[$item['recording_id']] ?? null;
            if ($record === null) {
                continue;
            }
            $metrics = Metrics::wordErrorRate($item['reference_text'], (string) ($record['recognized_text'] ?? ''));
            $rows[] = [
                'recording_id' => $item['recording_id'],
                'query_id' => $item['query_id'],
                'speaker_id' => $item['speaker_id'],
                'speaker_gender' => $speakerMeta[$item['speaker_id']]['gender'] ?? '',
                'speaker_dialect' => $speakerMeta[$item['speaker_id']]['dialect'] ?? '',
                'category' => $item['category'],
                'reference_text' => $item['reference_text'],
                'recognized_text' => (string) ($record['recognized_text'] ?? ''),
                'S' => $metrics['S'],
                'D' => $metrics['D'],
                'I' => $metrics['I'],
                'N' => $metrics['N'],
                'wer' => number_format($metrics['wer'], 4, '.', ''),
                'recognition_ms' => (string) ($record['recognition_ms'] ?? ''),
            ];
        }

        if ($rows === []) {
            $this->error('لا توجد تسجيلات مكتملة في الملف.');

            return self::FAILURE;
        }

        $aggregate = static function (array $subset): array {
            $s = array_sum(array_column($subset, 'S'));
            $d = array_sum(array_column($subset, 'D'));
            $i = array_sum(array_column($subset, 'I'));
            $n = array_sum(array_column($subset, 'N'));

            return [
                'recordings' => count($subset),
                'WER' => round(($s + $d + $i) / max($n, 1), 4),
                'S' => $s, 'D' => $d, 'I' => $i, 'reference_words' => $n,
            ];
        };

        $byCategory = [];
        foreach (array_unique(array_column($rows, 'category')) as $category) {
            $byCategory[$category] = $aggregate(array_values(array_filter($rows,
                static fn (array $r): bool => $r['category'] === $category)));
        }
        $bySpeaker = [];
        foreach (array_unique(array_column($rows, 'speaker_id')) as $speaker) {
            $bySpeaker[$speaker] = $aggregate(array_values(array_filter($rows,
                static fn (array $r): bool => $r['speaker_id'] === $speaker)));
        }

        $latencies = array_values(array_filter(array_map(static fn (array $r): float => (float) $r['recognition_ms'], $rows),
            static fn (float $v): bool => $v > 0));
        sort($latencies);
        $latencySummary = $latencies === [] ? null : [
            'mean' => round(array_sum($latencies) / count($latencies)),
            'median' => round($latencies[intdiv(count($latencies), 2)]),
            'max' => round(max($latencies)),
            'samples' => count($latencies),
        ];

        $summary = [
            'recordings' => count($rows),
            'total' => $aggregate($rows),
            'by_category' => $byCategory,
            'by_speaker' => $bySpeaker,
            'recognition_latency_ms' => $latencySummary,
        ];

        $this->table(['البند', 'عدد التسجيلات', 'نسبة خطأ الكلمات'],
            array_merge([['الإجمالي', $summary['total']['recordings'], number_format($summary['total']['WER'], 4)]],
                array_map(static fn (string $k, array $v): array => [$k, $v['recordings'], number_format($v['WER'], 4)],
                    array_keys($byCategory), $byCategory),
                array_map(static fn (string $k, array $v): array => ['المتحدث ' . $k, $v['recordings'], number_format($v['WER'], 4)],
                    array_keys($bySpeaker), $bySpeaker)));

        $outputDir = $this->option('output') ?: base_path('docs/results');
        File::ensureDirectoryExists($outputDir);
        File::put($outputDir . '/experiment1_wer.json',
            json_encode(['summary' => $summary, 'rows' => $rows], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $handle = fopen($outputDir . '/experiment1_wer.csv', 'w');
        fputcsv($handle, array_keys($rows[0]));
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);

        $this->info('حُفظت نتائج التجربة الأولى في ' . $outputDir);

        return self::SUCCESS;
    }
}
