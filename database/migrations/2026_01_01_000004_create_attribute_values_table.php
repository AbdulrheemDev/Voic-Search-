<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول قيم الخصائص: يربط المنتجات بالخصائص بعلاقة متعدد إلى متعدد (الشكل 5.3)،
 * ومنه تُجمع قيم الخصائص التي تُفهرس بوصفها نصًا (المتطلب FR-07).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('attribute_id')->constrained('attributes');
            $table->string('value', 120);
            $table->timestamps();

            $table->index(['product_id', 'attribute_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attribute_values');
    }
};
