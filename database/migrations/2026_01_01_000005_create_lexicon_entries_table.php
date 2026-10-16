<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * جدول القاموس التجاري lexicon_entries (الجدول 11.3 من الفصل الثالث).
 *
 * هذا هو الجدول الوحيد الذي يضيفه المحرك إلى قاعدة بيانات المتجر، ويُنشأ بملف ترحيل واحد
 * عند الدمج (نقطة التكامل الرابعة)، ولا يرتبط بجداول المتجر بعلاقات خارجية.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lexicon_entries', function (Blueprint $table) {
            $table->id();
            $table->string('term', 120)->comment('اللفظ كما يُكتب عادة، مثل: شنطة');
            $table->string('normalized_term', 120)->comment('اللفظ بعد التطبيع، ويُستخدم في المطابقة');
            $table->string('canonical_term', 120)->comment('المصطلح المعتمد في بيانات المتجر بصيغته المطبَّعة');
            $table->enum('relation_type', ['substitution', 'equivalence'])
                ->default('substitution')
                ->comment('نوع العلاقة: استبدال أحادي الاتجاه أو تكافؤ متبادل');
            $table->timestamps();

            $table->unique('normalized_term');
            $table->index('relation_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lexicon_entries');
    }
};
