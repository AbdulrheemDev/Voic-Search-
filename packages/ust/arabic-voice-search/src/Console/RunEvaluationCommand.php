<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Console;

use Illuminate\Console\Command;
use Ust\ArabicVoiceSearch\Evaluation\MetricsCalculator;

/**
 * أمر Artisan لتشغيل حسابات التجارب الثلاث الميدانية للفصل الرابع (O6).
 *
 * يقرأ ملف JSON للبيانات المجمّعة ميدانيًا ويصدر ملخصًا رقميًا موثّقًا بالتاريخ
 * دون تخزين أي صوت أو نصوص استعلامات في قاعدة البيانات (NFR-06).
 *
 * الاستخدام:
 *   php artisan arabic-voice-search:evaluate --experiment=wer --input=storage/app/wer_input.json --output=storage/app/wer_summary.json
 *   php artisan arabic-voice-search:evaluate --experiment=relevance --input=storage/app/rel_input.json --output=storage/app/rel_summary.json
 *   php artisan arabic-voice-search:evaluate --experiment=latency --input=storage/app/lat_input.json --output=storage/app/lat_summary.json
 */
class RunEvaluationCommand extends Command
{
    protected $signature = 'arabic-voice-search:evaluate
        {--experiment= : نوع التجربة: wer | relevance | latency}
        {--input= : مسار ملف JSON المدخل}
        {--output= : مسار ملف JSON لتصدير النتائج (اختياري)}';

    protected $description = 'حساب مقاييس التجارب الثلاث المعتمدة للفصل الرابع (WER, P@5/MRR, Latency)';

    public function handle(MetricsCalculator $calculator): int
    {
        $experiment = (string) $this->option('experiment');
        $inputPath = (string) $this->option('input');
        $outputPath = (string) $this->option('output');

        if ($inputPath === '' || ! file_exists($inputPath)) {
            $this->error("ملف الإدخال غير موجود: {$inputPath}");
            return self::FAILURE;
        }

        $data = json_decode((string) file_get_contents($inputPath), true);
        if (! is_array($data)) {
            $this->error('تعذر قراءة ملف JSON المدخل.');
            return self::FAILURE;
        }

        $summary = match ($experiment) {
            'wer' => $this->runWer($calculator, $data),
            'relevance' => $calculator->summarizeRelevance($data, 5),
            'latency' => $calculator->summarizeLatency($data),
            default => null,
        };

        if ($summary === null) {
            $this->error('نوع التجربة غير مدعوم. القيم المتاحة: wer | relevance | latency');
            return self::INVALID;
        }

        $report = [
            'experiment' => $experiment,
            'executed_at' => now()->toIso8601String(),
            'summary' => $summary,
        ];

        $json = (string) json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $this->line($json);

        if ($outputPath !== '') {
            file_put_contents($outputPath, $json);
            $this->info("تم حفظ ملخص التجربة في: {$outputPath}");
        }

        return self::SUCCESS;
    }

    /**
     * @param list<array{reference: string, hypothesis: string}> $rows
     * @return array{total_samples: int, mean_wer: float, min_wer: float, max_wer: float}
     */
    private function runWer(MetricsCalculator $calculator, array $rows): array
    {
        if ($rows === []) {
            return ['total_samples' => 0, 'mean_wer' => 0.0, 'min_wer' => 0.0, 'max_wer' => 0.0];
        }

        $scores = [];
        foreach ($rows as $row) {
            $scores[] = $calculator->wer(
                (string) ($row['reference'] ?? ''),
                (string) ($row['hypothesis'] ?? '')
            );
        }

        return [
            'total_samples' => count($scores),
            'mean_wer' => round(array_sum($scores) / count($scores), 4),
            'min_wer' => min($scores),
            'max_wer' => max($scores),
        ];
    }
}
