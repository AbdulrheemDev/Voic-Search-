<?php

namespace App\Console\Commands;

use App\Models\LexiconEntry;
use App\Search\Evaluation\Dataset;
use App\Search\Lexicon;
use App\Search\Normalizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * استيراد القاموس التجاري إلى جدول lexicon_entries (نقطة التكامل الرابعة).
 *
 * يُخزَّن كل مدخل بثلاث صور: اللفظ كما يُكتب (term)، واللفظ بعد التطبيع (normalized_term)
 * ويُستخدم في المطابقة، والمصطلح المعتمد في بيانات المتجر بصيغته المطبَّعة (canonical_term).
 * ويتميز نوع العلاقة بين «استبدال» أحادي الاتجاه و«تكافؤ» متبادل، على غرار تمييز Meilisearch
 * بين المرادفات أحادية الاتجاه والمرادفات المتبادلة (القسم 2.3.3 من الفصل الثالث).
 */
class ImportLexiconCommand extends Command
{
    protected $signature = 'lexicon:import {--fresh : حذف مداخل القاموس الحالية قبل الاستيراد}';

    protected $description = 'استيراد مداخل القاموس التجاري من resources/data/lexicon_entries.csv';

    public function handle(Dataset $dataset, Normalizer $normalizer, Lexicon $lexicon): int
    {
        $rows = $dataset->csv('lexicon_entries.csv');
        if ($rows === []) {
            $this->error('ملف القاموس التجاري غير موجود');

            return self::FAILURE;
        }

        if ($this->option('fresh')) {
            DB::table('lexicon_entries')->delete();
        }

        DB::transaction(function () use ($rows, $normalizer) {
            foreach ($rows as $row) {
                LexiconEntry::query()->updateOrCreate(['id' => (int) $row['id']], [
                    'term' => $row['term'],
                    'normalized_term' => $normalizer->normalize($row['term']),
                    'canonical_term' => $normalizer->normalize($row['canonical_term']),
                    'relation_type' => $row['relation_type'] === LexiconEntry::RELATION_EQUIVALENCE
                        ? LexiconEntry::RELATION_EQUIVALENCE
                        : LexiconEntry::RELATION_SUBSTITUTION,
                ]);
            }
        });

        $lexicon->forget();

        $this->table(['نوع العلاقة', 'عدد المداخل'], [
            ['استبدال', LexiconEntry::query()->where('relation_type', LexiconEntry::RELATION_SUBSTITUTION)->count()],
            ['تكافؤ', LexiconEntry::query()->where('relation_type', LexiconEntry::RELATION_EQUIVALENCE)->count()],
            ['الإجمالي', LexiconEntry::query()->count()],
        ]);

        return self::SUCCESS;
    }
}
