<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Processing;

/**
 * وحدة حذف عبارات الطلب (StopPhraseFilter).
 *
 * تطبق الخطوة 4 من الخوارزمية (1.3) وقائمة الجدول (8.3) من التقرير المعتمد:
 * - تُحذف العبارات المكونة من كلمتين أولًا ثم الكلمات المفردة.
 * - تُخزن العبارات بصيغتها المطبّعة لتطابق النص بعد التطبيع.
 * - لا تُحذف العبارة إذا كان حذفها سيُفرغ الاستعلام تمامًا.
 *
 * المتطلبات المرتبطة: FR-05, Q-04
 */
class StopPhraseFilter
{
    /**
     * عبارات الطلب الافتراضية من الجدول (8.3) بصيغتها المطبّعة.
     *
     * @var list<string>
     */
    public const DEFAULT_STOP_PHRASES = [
        // عبارات من كلمتين (تُفحص أولًا)
        'ابحث عن',
        'دور لي',
        'شوف لي',
        'لو سمحت',
        'من فضلك',
        'الله يعافيك',
        // كلمات مفردة
        'اريد',
        'ابغي',
        'ابي',
        'احتاج',
        'ودي',
        'اعطني',
        'هل',
        'عندكم',
        'يوجد',
    ];

    /** @var array<string, true> */
    private array $twoWordPhrases = [];

    /** @var array<string, true> */
    private array $singleWords = [];

    /**
     * @param list<string>|null $stopPhrases قائمة قابلة للتخصيص من ملف الإعدادات
     */
    public function __construct(
        private readonly ArabicNormalizer $normalizer = new ArabicNormalizer(),
        ?array $stopPhrases = null
    ) {
        $phrases = $stopPhrases ?? self::DEFAULT_STOP_PHRASES;

        foreach ($phrases as $phrase) {
            $normalized = $this->normalizer->normalize($phrase);
            if ($normalized === '') {
                continue;
            }

            $parts = $this->normalizer->tokenize($normalized);
            if (count($parts) === 2) {
                $this->twoWordPhrases[$normalized] = true;
            } elseif (count($parts) === 1) {
                $this->singleWords[$normalized] = true;
            }
        }
    }

    /**
     * حذف عبارات الطلب من مصفوفة كلمات الاستعلام المطبّع دون إفراغها.
     *
     * @param list<string> $tokens
     * @return list<string>
     */
    public function filter(array $tokens): array
    {
        if ($tokens === []) {
            return [];
        }

        $filtered = [];
        $count = count($tokens);
        $i = 0;

        while ($i < $count) {
            // فحص العبارات المكونة من كلمتين أولًا
            if ($i + 1 < $count) {
                $bigram = $tokens[$i] . ' ' . $tokens[$i + 1];
                if (isset($this->twoWordPhrases[$bigram])) {
                    $i += 2;
                    continue;
                }
            }

            // فحص الكلمات المفردة
            if (isset($this->singleWords[$tokens[$i]])) {
                $i++;
                continue;
            }

            $filtered[] = $tokens[$i];
            $i++;
        }

        // شرط الخوارزمية (1.3) الخطوة 4: عدم إفراغ الاستعلام
        return $filtered !== [] ? $filtered : $tokens;
    }
}
