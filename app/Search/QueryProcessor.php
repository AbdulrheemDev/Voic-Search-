<?php

namespace App\Search;

/**
 * معالجة الاستعالم: الخطوات من 2 إلى 6 من الخوارزمية (1.3) في الفصل الثالث.
 *
 * التطبيع ← التقطيع ← حذف عبارات الطلب ← تطبيق القاموس التجاري.
 */
class QueryProcessor
{
    public function __construct(
        private readonly Normalizer $normalizer,
        private readonly StopPhraseFilter $stopPhrases,
        private readonly Lexicon $lexicon,
    ) {
    }

    /**
     * @return array{
     *     query: string,
     *     words: array<int, string>,
     *     stages: array{raw: string, normalized: string, after_stop_phrases: string, after_lexicon: string},
     *     replacements: array<int, array{from: string, to: string}>
     * }
     */
    public function process(string $raw, string $setting = 'c'): array
    {
        $useNormalization = in_array($setting, ['b', 'c'], true);
        $useLexicon = $setting === 'c';

        $stages = ['raw' => $raw, 'normalized' => '', 'after_stop_phrases' => '', 'after_lexicon' => ''];
        $text = $useNormalization ? $this->normalizer->normalize($raw) : $raw;
        $stages['normalized'] = $text;

        $words = $this->normalizer->tokenize($text);
        if ($useNormalization) {
            $words = $this->stopPhrases->apply($words);
        }
        $stages['after_stop_phrases'] = implode(' ', $words);

        $replacements = [];
        if ($useLexicon) {
            [$words, $replacements] = $this->lexicon->apply($words);
        }
        $stages['after_lexicon'] = implode(' ', $words);
        $query = $stages['after_lexicon'] !== '' ? $stages['after_lexicon'] : $stages['after_stop_phrases'];

        return [
            'query' => trim($query),
            'words' => array_values($words),
            'stages' => $stages,
            'replacements' => $replacements,
        ];
    }

    /** الاستعالم الفارغ: تُعاد رسالة «لم يُلتقط استعالم» (الخطوة 1 من الخوارزمية 1.3) */
    public function isEmpty(string $raw): bool
    {
        return trim($raw) === '';
    }
}
