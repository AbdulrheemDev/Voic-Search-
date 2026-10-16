<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * تهيئة قاعدة بيانات بيئة التجربة: بيانات المتجر ثم القاموس التجاري.
 * ويُفهرس بعدها المنتجات في Meilisearch بالأمر search:index-products.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            StoreDataSeeder::class,
            LexiconSeeder::class,
        ]);
    }
}
