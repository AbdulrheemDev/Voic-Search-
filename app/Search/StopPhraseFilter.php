<?php

namespace App\Search;

use Illuminate\Support\Facades\File;

/**
 * حذف عبارات الطلب من الاستعالم.
 *
 * تُقرأ العبارات من الملف resources/data/stop_phrases.txt بصيغتها المطبَّعة (الجدول 8.3)،
 * وتُحذف الكلمة المفردة أو العبارة المكونة من كلمتين. ولا تُحذف العبارة إذا كان حذفها
 * سيُفرغ الاستعالم، حتى لا يُرسل إلى البحث استعالم فارغ (الخطوة 4 من الخوارزمية 1.3).
 */
class StopPhraseFilter
{
    /** @var array<int, string> عبارات من كلمتين */
    private array $phrases;

    /** @var array<string, true> عبارات من كلمة واحدة */
    private array $singleWords;

    public function __construct(private readonly Normalizer $normalizer, ?array $phrases = null)
    {
        $phrases ??= $this->readPhrasesFile();
        $normalized = array_values(array_unique(array_map(
            fn (string $phrase): string => $this->normalizer->normalize($phrase),
            $phrases
        )));

        $this->phrases = array_values(array_filter($normalized, fn (string $p): bool => str_contains($p, ' ')));
        $this->singleWords = array_fill_keys(
            array_values(array_filter($normalized, fn (string $p): bool => ! str_contains($p, ' '))),
            true
        );
    }

    /**
     * @return array<int, string>
     */
    private function readPhrasesFile(): array
    {
        $path = resource_path('data/stop_phrases.txt');
        if (! File::exists($path)) {
            return [];
        }

        $lines = array_filter(array_map('trim', File::lines($path)->toArray()),
            fn (string $line): bool => $line !== '' && ! str_starts_with($line, '#'));

        return array_values($lines);
    }

    /**
     * @param  array<int, string>  $words  كلمات الاستعالم المطبَّعة
     * @return array<int, string> كلمات الاستعالم بعد حذف عبارات الطلب
     */
    public function apply(array $words): array
    {
        $kept = [];
        $count = count($words);

        for ($i = 0; $i < $count; $i++) {
            $pair = $i + 1 < $count ? $words[$i] . ' ' . $words[$i + 1] : null;
            if ($pair !== null && in_array($pair, $this->phrases, true)) {
                $i++;
                continue;
            }
            if (isset($this->singleWords[$words[$i]])) {
                continue;
            }
            $kept[] = $words[$i];
        }

        return $kept === [] ? array_values($words) : array_values($kept);
    }

    /**
     * @return array<int, string>
     */
    public function phrases(): array
    {
        return array_merge(array_keys($this->singleWords), $this->phrases);
    }
}
