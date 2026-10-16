<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Meilisearch\Client;

/**
 * بناء فهرس المنتجات في Meilisearch ومزامنته من جدول المنتجات عبر Laravel Scout
 * (المتطلبان FR-07 وFR-08، والقسم 4.6.3 من الفصل الثالث).
 */
class IndexProductsCommand extends Command
{
    protected $signature = 'search:index-products {--flush : إفراغ الفهرس قبل الفهرسة}';

    protected $description = 'فهرسة منتجات المتجر في Meilisearch عبر Laravel Scout';

    public function handle(Client $client): int
    {
        $index = config('scout.prefix') . 'products';

        if ($this->option('flush')) {
            Product::removeAllFromSearch();
            $this->info('تم إفراغ الفهرس ' . $index);
        }

        $this->call('scout:import', ['model' => Product::class]);

        $client->waitForTask($client->index($index)->updateSettings([])['taskUid'] ?? 0);
        $stats = $client->index($index)->stats();

        $this->table(['البند', 'القيمة'], [
            ['اسم الفهرس', $index],
            ['عدد الوثائق المفهرسة', $stats['numberOfDocuments'] ?? '—'],
            ['الوثائق قيد المعالجة', $stats['isIndexing'] ?? false ? 'نعم' : 'لا'],
        ]);

        return self::SUCCESS;
    }
}
