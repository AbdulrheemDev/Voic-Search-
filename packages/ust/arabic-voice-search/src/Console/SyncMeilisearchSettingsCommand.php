<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Console;

use Illuminate\Console\Command;
use Meilisearch\Client;
use Ust\ArabicVoiceSearch\Indexing\MeilisearchSettingsBuilder;

/**
 * أمر Artisan لمزامنة إعدادات فهرس Meilisearch (الجدول 10.3) والمرادفات المتكافئة من جدول lexicon_entries.
 *
 * الاستخدام:
 *   php artisan arabic-voice-search:sync-settings
 *
 * المتطلبات المرتبطة: FR-06, FR-07, FR-09, Q-07
 */
class SyncMeilisearchSettingsCommand extends Command
{
    protected $signature = 'arabic-voice-search:sync-settings {--index= : اسم فهرس Meilisearch (اختياري)}';

    protected $description = 'مزامنة إعدادات فهرس المنتجات ومرادفات التكافؤ في Meilisearch وفق الجدول (10.3)';

    public function handle(MeilisearchSettingsBuilder $builder): int
    {
        $modelClass = (string) config('arabic-voice-search.product.model', 'App\\Models\\Product');
        $indexName = (string) ($this->option('index') ?: (class_exists($modelClass) ? (new $modelClass())->searchableAs() : 'products'));

        $host = (string) config('scout.meilisearch.host', env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'));
        $key = config('scout.meilisearch.key', env('MEILISEARCH_KEY'));

        $settings = $builder->build();

        $client = new Client($host, is_string($key) ? $key : null);
        $client->index($indexName)->updateSettings($settings);

        $this->info("تمت مزامنة إعدادات فهرس Meilisearch [{$indexName}] بنجاح.");
        $this->line('عدد مفاتيح المرادفات المتكافئة المرسلة: ' . count($settings['synonyms']));

        return self::SUCCESS;
    }
}
