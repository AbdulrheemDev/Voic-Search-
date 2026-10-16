<?php

namespace App\Console\Commands;

use App\Search\IndexSettings;
use Illuminate\Console\Command;

/**
 * تطبيق إعدادات فهرس المنتجات على خادم Meilisearch (الجدول 10.3 من الفصل الثالث).
 */
class ApplyIndexSettingsCommand extends Command
{
    protected $signature = 'search:index-settings {--show : طباعة الإعدادات دون إرسالها}';

    protected $description = 'إرسال إعدادات فهرس المنتجات إلى Meilisearch (الحقول المفهرسة والمرادفات والتسامح مع الأخطاء)';

    public function handle(IndexSettings $settings): int
    {
        $index = config('scout.prefix') . 'products';
        $values = $settings->toArray();

        $this->table(['الإعداد', 'القيمة'], [
            ['searchableAttributes', implode('، ', $values['searchableAttributes'])],
            ['synonyms', count($values['synonyms']) . ' مصطلحًا'],
            ['typoTolerance', 'افتراضي: خطأ واحد من 5 أحرف، وخطآن من 9 أحرف'],
            ['matchingStrategy', $values['matchingStrategy']],
        ]);

        if ($this->option('show')) {
            return self::SUCCESS;
        }

        $tasks = $settings->apply($index);
        $this->info('تم إرسال الإعدادات إلى الفهرس ' . $index . ' (المهام: ' . implode('، ', $tasks) . ')');

        return self::SUCCESS;
    }
}
