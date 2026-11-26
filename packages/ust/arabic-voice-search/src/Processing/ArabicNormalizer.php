<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Processing;

/**
 * وحدة تطبيع النص العربي (ArabicNormalizer).
 *
 * تطبق القواعد السبع المعتمدة في الجدول (7.3) من التقرير المعتمد بالترتيب الحرفي:
 *  1. حذف التشكيل (حَقِيبَة -> حقيبة)
 *  2. حذف التطويل (حقيــبة -> حقيبة)
 *  3. توحيد الألف المهموزة (أ، إ، آ) إلى ا (أسود -> اسود)
 *  4. تحويل التاء المربوطة في آخر الكلمة إلى ه (حقيبة -> حقيبه)
 *  5. تحويل الألف المقصورة في آخر الكلمة إلى ي (حلوى -> حلوي)
 *  6. توحيد الأرقام الهندية إلى الأرقام العربية (٤٢ -> 42)
 *  7. حذف علامات الترقيم وتوحيد المسافات (حقيبة، ظهر! -> حقيبه ظهر)
 *
 * المتطلبات المرتبطة: FR-04, DR-03
 */
class ArabicNormalizer
{
    /**
     * الأرقام الهندية ومقابلها بالأرقام العربية القياسية (القاعدة 6).
     *
     * @var array<string, string>
     */
    private const EASTERN_ARABIC_DIGITS = [
        '٠' => '0',
        '١' => '1',
        '٢' => '2',
        '٣' => '3',
        '٤' => '4',
        '٥' => '5',
        '٦' => '6',
        '٧' => '7',
        '٨' => '8',
        '٩' => '9',
    ];

    /**
     * تطبيق قواعد التطبيع السبع بالترتيب على النص العربي.
     */
    public function normalize(string $text): string
    {
        if ($text === '') {
            return '';
        }

        // 1. حذف التشكيل (الحركات والتنوين والشدة والألف الخنجرية)
        $text = (string) preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}]/u', '', $text);

        // 2. حذف التطويل (الكشيدة)
        $text = str_replace("\u{0640}", '', $text);

        // 3. توحيد الألف المهموزة (أ، إ، آ) إلى ا
        $text = str_replace(['أ', 'إ', 'آ'], 'ا', $text);

        // 4. تحويل التاء المربوطة في آخر الكلمة إلى ه
        $text = (string) preg_replace('/ة(?=$|\s|\p{P})/u', 'ه', $text);

        // 5. تحويل الألف المقصورة في آخر الكلمة إلى ي
        $text = (string) preg_replace('/ى(?=$|\s|\p{P})/u', 'ي', $text);

        // 6. توحيد الأرقام الهندية إلى الأرقام العربية
        $text = strtr($text, self::EASTERN_ARABIC_DIGITS);

        // 7. حذف علامات الترقيم وتوحيد المسافات
        $text = (string) preg_replace('/\p{P}+/u', ' ', $text);
        $text = (string) preg_replace('/\s+/u', ' ', $text);

        return trim($text);
    }

    /**
     * تقطيع النص المطبّع إلى مصفوفة كلمات (الخطوة 3 من الخوارزمية 1.3).
     *
     * @return list<string>
     */
    public function tokenize(string $normalizedText): array
    {
        $trimmed = trim($normalizedText);
        if ($trimmed === '') {
            return [];
        }

        return array_values(array_filter(
            preg_split('/\s+/u', $trimmed) ?: [],
            static fn (string $token): bool => $token !== ''
        ));
    }
}
