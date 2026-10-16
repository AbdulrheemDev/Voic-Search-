<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * استيراد بيانات المتجر المستضيف من ملفات resources/data (216 منتجًا في 12 فئة
 * مع 336 قيمة خصائص). القيم نفسها تُستخدم في تجارب الفصل الرابع.
 */
class StoreDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->call('store:import-data', ['--fresh' => true]);
    }
}
