<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Processing;

use Ust\ArabicVoiceSearch\Models\LexiconEntry;

/**
 * وحدة القاموس التجاري (CommercialLexicon — القسم 3.6.3).
 *
 * تطبق الخطوة 5 من الخوارزمية (1.3):
 * - تعالج مداخل الاستبدال أحادي الاتجاه فقط (relation_type = replacement) وفق القرار D-04.
 * - تبدأ بالعبارات المكونة من كلمتين ثم الكلمات المفردة لتقديم المطابقة الأطول على الأقصر.
 * - مداخل التكافؤ (equivalence) تُصدَّر إلى إعداد synonyms في Meilisearch (الدورة 3).
 *
 * المتطلبات المرتبطة: FR-06, NFR-05, D-04
 */
class CommercialLexicon
{
    /** @var array<string, string>|null خريطة استبدال محقونة للاختبار أو الاستخدام المباشر */
    private ?array $inMemoryMap;

    /**
     * @param array<string, string>|null $inMemoryMap [normalized_term => canonical_term]
     */
    public function __construct(
        private readonly ArabicNormalizer $normalizer = new ArabicNormalizer(),
        ?array $inMemoryMap = null
    ) {
        if ($inMemoryMap !== null) {
            $normalizedMap = [];
            foreach ($inMemoryMap as $term => $canonical) {
                $k = $this->normalizer->normalize($term);
                $v = $this->normalizer->normalize($canonical);
                if ($k !== '' && $v !== '') {
                    $normalizedMap[$k] = $v;
                }
            }
            $this->inMemoryMap = $normalizedMap;
        } else {
            $this->inMemoryMap = null;
        }
    }

    /**
     * استبدال ألفاظ الاستعلام بمصطلحاتها المعتمدة (الأطول أولًا: كلمتان ثم كلمة).
     *
     * @param list<string> $tokens
     * @return list<string>
     */
    public function applyReplacements(array $tokens): array
    {
        if ($tokens === []) {
            return [];
        }

        $map = $this->getReplacementMap();
        if ($map === []) {
            return $tokens;
        }

        $result = [];
        $count = count($tokens);
        $i = 0;

        while ($i < $count) {
            // 1. فحص العبارات المكونة من كلمتين أولًا (المطابقة الأطول)
            if ($i + 1 < $count) {
                $bigram = $tokens[$i] . ' ' . $tokens[$i + 1];
                if (isset($map[$bigram])) {
                    foreach ($this->normalizer->tokenize($map[$bigram]) as $part) {
                        $result[] = $part;
                    }
                    $i += 2;
                    continue;
                }
            }

            // 2. فحص الكلمة المفردة
            $word = $tokens[$i];
            if (isset($map[$word])) {
                foreach ($this->normalizer->tokenize($map[$word]) as $part) {
                    $result[] = $part;
                }
            } else {
                $result[] = $word;
            }
            $i++;
        }

        return $result;
    }

    /**
     * جلب خريطة الاستبدال من الذاكرة (في الاختبارات) أو من جدول lexicon_entries (في التشغيل).
     *
     * @return array<string, string>
     */
    public function getReplacementMap(): array
    {
        if ($this->inMemoryMap !== null) {
            return $this->inMemoryMap;
        }

        return LexiconEntry::query()
            ->where('relation_type', LexiconEntry::TYPE_REPLACEMENT)
            ->pluck('canonical_term', 'normalized_term')
            ->all();
    }
}
