<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول الفئات في المتجر المستضيف (الشكل 5.3 من الفصل الثالث).
 * ينشأ هذا الجدول في بيئة التجربة فقط؛ وعند الدمج في متجر قائم يقرأ المحرك الجدول القائم.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
