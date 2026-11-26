<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * أمر التحقق الآلي من المتطلب NFR-02 (مهمة C4-1):
 * يلتقط قائمة جداول قاعدة البيانات قبل الدمج (P0-6)، ثم يقارنها بعد الدمج
 * لإثبات أن الجدول الوحيد المضاف إلى المتجر المستضيف (مثل Bagisto 2.4) هو lexicon_entries فقط.
 *
 * الاستخدام:
 *  1. قبل الدمج: php artisan arabic-voice-search:verify-nfr02 --save=storage/app/schema_before.json
 *  2. بعد الدمج: php artisan arabic-voice-search:verify-nfr02 --compare=storage/app/schema_before.json
 */
class VerifySchemaIntegrityCommand extends Command
{
    protected $signature = 'arabic-voice-search:verify-nfr02
        {--save= : حفظ لقطة بأسماء الجداول الحالية قبل الدمج (P0-6)}
        {--compare= : مقارنة الجداول الحالية بلقطة ما قبل الدمج للتحقق من NFR-02}';

    protected $description = 'التحقق من المتطلب NFR-02: عدم تعديل جداول المتجر المستضيف والاقتصار على إضافة lexicon_entries';

    public function handle(): int
    {
        $tables = $this->fetchCurrentTables();
        sort($tables);

        $savePath = $this->option('save');
        if (is_string($savePath) && $savePath !== '') {
            file_put_contents($savePath, json_encode([
                'captured_at' => now()->toIso8601String(),
                'tables' => $tables,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            $this->info("تم حفظ لقطة المخطط المرجعي ({$savePath}) — عدد الجداول: " . count($tables));
            return self::SUCCESS;
        }

        $comparePath = $this->option('compare');
        if (is_string($comparePath) && $comparePath !== '') {
            if (! file_exists($comparePath)) {
                $this->error("ملف اللقطة غير موجود: {$comparePath}");
                return self::FAILURE;
            }

            $snapshot = json_decode((string) file_get_contents($comparePath), true);
            $before = is_array($snapshot['tables'] ?? null) ? $snapshot['tables'] : [];

            $added = array_values(array_diff($tables, $before));
            $removed = array_values(array_diff($before, $tables));
            $expectedTable = (string) config('arabic-voice-search.lexicon.table', 'lexicon_entries');

            $this->line('الجداول المضافة: ' . ($added === [] ? 'لا يوجد' : implode(', ', $added)));
            $this->line('الجداول المحذوفة: ' . ($removed === [] ? 'لا يوجد' : implode(', ', $removed)));

            if ($added === [$expectedTable] && $removed === []) {
                $this->info("نجاح NFR-02: الجدول الوحيد المضاف هو [{$expectedTable}] دون أي تغيير على جداول المتجر.");
                return self::SUCCESS;
            }

            $this->error('تحذير NFR-02: الفرق في الجداول لا يطابق المتوقع.');
            return self::FAILURE;
        }

        $this->warn('يرجى تمرير --save=<path> أو --compare=<path>.');
        return self::INVALID;
    }

    /**
     * @return list<string>
     */
    protected function fetchCurrentTables(): array
    {
        $rows = DB::select('SHOW TABLES');
        $tables = [];
        foreach ($rows as $row) {
            $values = array_values((array) $row);
            if (isset($values[0])) {
                $tables[] = (string) $values[0];
            }
        }

        return $tables;
    }
}
