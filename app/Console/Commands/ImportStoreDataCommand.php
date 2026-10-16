<?php

namespace App\Console\Commands;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Category;
use App\Models\Product;
use App\Search\Evaluation\Dataset;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * استيراد بيانات المتجر المستضيف من ملفات resources/data إلى جداول MySQL.
 *
 * تُنشأ جداول المتجر في بيئة التجربة (categories، attributes، products، attribute_values)
 * على بنية مطابقة لما ورد في القسم 1.3.3 والشكل 5.3 من الفصل الثالث. أما عند الدمج في
 * متجر قائم فلا يُنشئ المحرك هذه الجداول، وإنما يقرأ منها فقط (نقطة التكامل الثالثة).
 */
class ImportStoreDataCommand extends Command
{
    protected $signature = 'store:import-data {--fresh : حذف بيانات المتجر الحالية قبل الاستيراد}';

    protected $description = 'استيراد بيانات المنتجات والفئات والخصائص من ملفات resources/data';

    public function handle(Dataset $dataset): int
    {
        $categories = $dataset->csv('categories.csv');
        $attributes = $dataset->csv('attributes.csv');
        $products = $dataset->csv('products.csv');
        $values = $dataset->csv('attribute_values.csv');

        if ($categories === [] || $products === []) {
            $this->error('ملفات البيانات غير موجودة في resources/data');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            DB::table('attribute_values')->delete();
            DB::table('products')->delete();
            DB::table('attributes')->delete();
            DB::table('categories')->delete();
        }

        DB::transaction(function () use ($categories, $attributes, $products, $values) {
            foreach ($categories as $row) {
                Category::query()->updateOrCreate(['id' => (int) $row['id']], ['name' => $row['name']]);
            }
            foreach ($attributes as $row) {
                Attribute::query()->updateOrCreate(['id' => (int) $row['id']], ['name' => $row['name']]);
            }
            foreach ($products as $row) {
                Product::query()->updateOrCreate(['id' => (int) $row['id']], [
                    'name' => $row['name'],
                    'category_id' => (int) $row['category_id'],
                    'description' => $row['description'],
                    'price' => (float) $row['price'],
                    'image' => $row['image'],
                    'stock' => (int) $row['stock'],
                ]);
            }
            $chunks = array_chunk($values, 200);
            foreach ($chunks as $chunk) {
                foreach ($chunk as $row) {
                    AttributeValue::query()->updateOrCreate(['id' => (int) $row['id']], [
                        'product_id' => (int) $row['product_id'],
                        'attribute_id' => (int) $row['attribute_id'],
                        'value' => $row['value'],
                    ]);
                }
            }
        });

        $this->table(['الجدول', 'عدد السجلات'], [
            ['categories', count($categories)],
            ['attributes', count($attributes)],
            ['products', count($products)],
            ['attribute_values', count($values)],
        ]);

        return self::SUCCESS;
    }
}
