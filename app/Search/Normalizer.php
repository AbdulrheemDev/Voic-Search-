<?php

namespace App\Search;

/**
 * تطبيع النص العربي.
 *
 * ينفذ هذا الصنف قواعد التطبيع المعروضة في الجدول (7.3) من الفصل الثالث بالترتيب نفسه:
 * حذف التشكيل، حذف التطويل، توحيد الألف المهموزة إلى ألف، تحويل التاء المربوطة في آخر الكلمة
 * إلى هاء، تحويل الألف المقصورة في آخر الكلمة إلى ياء، توحيد الأرقام الهندية إلى الأرقام
 * العربية، وحذف علامات الترقيم وتوحيد المسافات.
 *
 * وتُطبق الدالة نفسها على نص الاستعالم وعلى وثائق الفهرسة وعلى مداخل القاموس التجاري،
 * ليكون التطبيع موحدًا في جميع أجزاء المحرك (القسم 2.6.3 من الفصل الثالث).
 */
class Normalizer
{
    /** التشكيل والتطويل والعلامات الملحقة بالحروف */
    private const DIACRITICS = '/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06DC}\x{06DF}-\x{06E8}\x{06EA}-\x{06ED}\x{0640}]/u';

    /** علامات الترقيم العربية واللاتينية */
    private const PUNCTUATION = '/[!-#%-*,-.\/:;?@\[-\]_\x{00AB}\x{00BB}\x{060C}\x{061B}\x{061F}\x{066A}-\x{066D}\x{06D4}\x{2010}-\x{2015}\x{2018}\x{2019}\x{201C}\x{201D}\x{2026}]+/u';

    /**
     * تطبيع نص عربي.
     */
    public function normalize(?string $text): string
    {
        if ($text === null) {
            return '';
        }

        $text = preg_replace(self::DIACRITICS, '', $text) ?? $text;
        // توحيد الألف المهموزة (أ، إ، آ) والألف بواسطة الوصلة إلى ألف مجردة
        $text = preg_replace('/[\x{0623}\x{0625}\x{0622}\x{0671}]/u', "\u{0627}", $text) ?? $text;
        // توحيد الأرقام الهندية والفارسية إلى الأرقام العربية (1، 2، 3، ...)
        $text = preg_replace_callback('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', function (array $m) {
            $code = mb_ord($m[0], 'UTF-8');

            return (string) ($code >= 0x06F0 ? $code - 0x06F0 : $code - 0x0660);
        }, $text) ?? $text;
        $text = preg_replace(self::PUNCTUATION, ' ', $text) ?? $text;
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $text = trim($text);

        // التاء المربوطة والألف المقصورة في آخر الكلمة
        $words = $text === '' ? [] : explode(' ', $text);
        $words = array_map(function (string $word): string {
            if (mb_substr($word, -1) === 'ة') {
                $word = mb_substr($word, 0, -1) . 'ه';
            }
            if (mb_substr($word, -1) === 'ى') {
                $word = mb_substr($word, 0, -1) . 'ي';
            }

            return $word;
        }, $words);

        return trim(preg_replace('/\s+/u', ' ', implode(' ', $words)) ?? '');
    }

    /**
     * تقطيع النص المطبَّع إلى كلمات.
     *
     * @return array<int, string>
     */
    public function tokenize(?string $text): array
    {
        $text = $this->normalize($text);

        return $text === '' ? [] : explode(' ', $text);
    }

    /**
     * حذف أداة التعريف للمطابقة، كما تفعل Meilisearch عند معالجة النص العربي.
     */
    public function stripDefiniteArticle(string $word): string
    {
        if (mb_strlen($word) > 4 && mb_substr($word, 0, 2) === 'ال') {
            return mb_substr($word, 2);
        }

        return $word;
    }
}
