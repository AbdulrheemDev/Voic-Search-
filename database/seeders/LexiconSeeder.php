<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * استيراد مداخل القاموس التجاري (67 مدخلًا: 58 استبدالًا و9 تكافؤ).
 */
class LexiconSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->call('lexicon:import', ['--fresh' => true]);
    }
}
