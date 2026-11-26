<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ترحيل جدول القاموس التجاري (lexicon_entries) وفق الجدول (11.3) من التقرير المعتمد.
 *
 * المتطلبات المرتبطة:
 * - DR-04: هيكل جدول القاموس التجاري.
 * - NFR-02: هذا هو الجدول الوحيد المضاف إلى قاعدة بيانات المتجر المستضيف دون تعديل جداوله القائمة.
 * - NFR-05: يتيح تحديث القاموس من البيانات فقط دون تعديل الشيفرة.
 */
return new class extends Migration
{
    public function up(): void
    {
        $tableName = (string) config('arabic-voice-search.lexicon.table', 'lexicon_entries');

        Schema::create($tableName, function (Blueprint $table): void {
            $table->id();
            $table->string('term')->comment('اللفظ كما يُكتب عادة، مثل: شنطة');
            $table->string('normalized_term')->index()->comment('اللفظ بعد التطبيع، ويُستخدم في المطابقة');
            $table->string('canonical_term')->comment('المصطلح المعتمد في بيانات المتجر بصيغته المطبّعة');
            $table->enum('relation_type', ['replacement', 'equivalence'])
                ->default('replacement')
                ->index()
                ->comment('نوع العلاقة: استبدال (replacement) أو تكافؤ (equivalence)');
            $table->timestamps();

            $table->unique(['normalized_term', 'relation_type'], 'lexicon_term_type_unique');
        });
    }

    public function down(): void
    {
        $tableName = (string) config('arabic-voice-search.lexicon.table', 'lexicon_entries');
        Schema::dropIfExists($tableName);
    }
};
