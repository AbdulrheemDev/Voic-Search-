<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Processing;

/**
 * أنبوب معالجة الاستعلام العربي (QueryProcessor).
 *
 * يجمع الخطوات (1..6) من الخوارزمية (1.3) ويعيد ناتج كل مرحلة على حدة
 * لسهولة التتبع والتفسير والاختبار (الجدول 9.3).
 *
 * المتطلبات المرتبطة: FR-04, FR-05, FR-06, NFR-05
 */
class QueryProcessor
{
    public function __construct(
        private readonly ArabicNormalizer $normalizer = new ArabicNormalizer(),
        private readonly StopPhraseFilter $stopPhraseFilter = new StopPhraseFilter(),
        private readonly CommercialLexicon $lexicon = new CommercialLexicon(),
    ) {}

    /**
     * تنفيذ مراحل المعالجة الأربع وإرجاع ناتج كل مرحلة.
     *
     * @return array{
     *     raw: string,
     *     normalized: string,
     *     after_stop_phrases: string,
     *     processed: string
     * }
     */
    public function process(string $rawQuery): array
    {
        $raw = trim($rawQuery);
        if ($raw === '') {
            return [
                'raw' => '',
                'normalized' => '',
                'after_stop_phrases' => '',
                'processed' => '',
            ];
        }

        // المرحلة 1: التطبيع (جدول 7.3)
        $normalized = $this->normalizer->normalize($raw);

        // المرحلة 2: التقطيع وحذف عبارات الطلب (جدول 8.3)
        $tokens = $this->normalizer->tokenize($normalized);
        $afterStopTokens = $this->stopPhraseFilter->filter($tokens);
        $afterStopText = implode(' ', $afterStopTokens);

        // المرحلة 3: تطبيق القاموس التجاري (الاستبدال أحادي الاتجاه)
        $replacedTokens = $this->lexicon->applyReplacements($afterStopTokens);
        $processed = implode(' ', $replacedTokens);

        return [
            'raw' => $raw,
            'normalized' => $normalized,
            'after_stop_phrases' => $afterStopText,
            'processed' => $processed,
        ];
    }
}
