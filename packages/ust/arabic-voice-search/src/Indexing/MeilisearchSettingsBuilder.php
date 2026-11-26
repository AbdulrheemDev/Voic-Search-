<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Indexing;

use Ust\ArabicVoiceSearch\Models\LexiconEntry;
use Ust\ArabicVoiceSearch\Processing\ArabicNormalizer;

/**
 * بنّاء إعدادات فهرس Meilisearch وفق الجدول (10.3) من التقرير المعتمد.
 *
 * المتطلبات المرتبطة: FR-06, FR-07, FR-09, D-04, Q-07
 */
class MeilisearchSettingsBuilder
{
    /**
     * ترتيب الحقول المفهرسة المعتمد في الجدول (10.3):
     * الاسم ← الفئة ← قيم الخصائص ← الوصف.
     *
     * @var list<string>
     */
    public const SEARCHABLE_ATTRIBUTES = [
        'name',
        'category',
        'attributes',
        'description',
    ];

    public function __construct(
        private readonly ArabicNormalizer $normalizer = new ArabicNormalizer()
    ) {}

    /**
     * بناء مصفوفة إعدادات فهرس Meilisearch الكاملة (الجدول 10.3).
     *
     * @param list<array{normalized_term: string, canonical_term: string}>|null $equivalenceEntries
     * @return array<string, mixed>
     */
    public function build(?array $equivalenceEntries = null): array
    {
        return [
            'searchableAttributes' => self::SEARCHABLE_ATTRIBUTES,
            'synonyms' => $this->buildSynonyms($equivalenceEntries),
            'typoTolerance' => [
                'enabled' => true,
            ],
            'matchingStrategy' => 'last',
        ];
    }

    /**
     * تحويل مداخل التكافؤ (relation_type = equivalence) إلى خريطة مرادفات ثنائية الاتجاه لـ Meilisearch.
     *
     * @param list<array{normalized_term: string, canonical_term: string}>|null $entries
     * @return array<string, list<string>>
     */
    public function buildSynonyms(?array $entries = null): array
    {
        if ($entries === null) {
            $entries = LexiconEntry::query()
                ->where('relation_type', LexiconEntry::TYPE_EQUIVALENCE)
                ->get(['normalized_term', 'canonical_term'])
                ->map(static fn (LexiconEntry $e): array => [
                    'normalized_term' => (string) $e->normalized_term,
                    'canonical_term' => (string) $e->canonical_term,
                ])
                ->all();
        }

        $synonyms = [];
        foreach ($entries as $entry) {
            $a = $this->normalizer->normalize($entry['normalized_term'] ?? '');
            $b = $this->normalizer->normalize($entry['canonical_term'] ?? '');

            if ($a === '' || $b === '' || $a === $b) {
                continue;
            }

            $synonyms[$a] = array_values(array_unique(array_merge($synonyms[$a] ?? [], [$b])));
            $synonyms[$b] = array_values(array_unique(array_merge($synonyms[$b] ?? [], [$a])));
        }

        return $synonyms;
    }
}
