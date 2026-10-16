<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول المنتجات في المتجر المستضيف.
 *
 * يقرأ المحرك من هذا الجدول الحقول الآتية فقط (الجدول 1.3 من الفصل الثالث):
 * الاسم والوصف للفهرسة، والسعر والصورة والمخزون للعرض في النتائج،
 * ولا يُجري أي تعديل على بنية الجدول (المتطلب NFR-02).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name', 180);
            $table->foreignId('category_id')->constrained('categories');
            $table->text('description');
            $table->decimal('price', 12, 2);
            $table->string('image', 255)->nullable();
            $table->unsignedSmallInteger('stock')->default(0);
            $table->timestamps();

            $table->index('category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
