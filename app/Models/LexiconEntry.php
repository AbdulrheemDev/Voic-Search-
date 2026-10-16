<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * مدخل في القاموس التجاري (الجدول 11.3 في الفصل الثالث).
 *
 * @property int $id
 * @property string $term
 * @property string $normalized_term
 * @property string $canonical_term
 * @property string $relation_type
 */
class LexiconEntry extends Model
{
    public const RELATION_SUBSTITUTION = 'substitution';

    public const RELATION_EQUIVALENCE = 'equivalence';

    protected $table = 'lexicon_entries';

    protected $fillable = ['term', 'normalized_term', 'canonical_term', 'relation_type'];

    /** @return array<string, string> */
    public static function relationLabels(): array
    {
        return [
            self::RELATION_SUBSTITUTION => 'استبدال',
            self::RELATION_EQUIVALENCE => 'تكافؤ',
        ];
    }
}
