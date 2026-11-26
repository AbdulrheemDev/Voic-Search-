<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Models;

use Illuminate\Database\Eloquent\Model;
use Ust\ArabicVoiceSearch\Processing\ArabicNormalizer;

/**
 * نموذج Eloquent لجدول القاموس التجاري (lexicon_entries — الجدول 11.3).
 *
 * @property int $id
 * @property string $term اللفظ كما يُكتب عادة
 * @property string $normalized_term اللفظ بعد التطبيع
 * @property string $canonical_term المصطلح المعتمد بصيغته المطبّعة
 * @property string $relation_type replacement | equivalence
 */
class LexiconEntry extends Model
{
    public const TYPE_REPLACEMENT = 'replacement';
    public const TYPE_EQUIVALENCE = 'equivalence';

    protected $fillable = [
        'term',
        'normalized_term',
        'canonical_term',
        'relation_type',
    ];

    public function getTable(): string
    {
        return (string) config('arabic-voice-search.lexicon.table', 'lexicon_entries');
    }

    /**
     * تطبيع تلقائي لحقلي normalized_term وcanonical_term عند الحفظ (القسم 1.6.3).
     */
    protected static function booted(): void
    {
        static::saving(function (self $entry): void {
            $normalizer = new ArabicNormalizer();
            $entry->normalized_term = $normalizer->normalize((string) ($entry->normalized_term ?: $entry->term));
            $entry->canonical_term = $normalizer->normalize((string) $entry->canonical_term);
        });
    }
}
