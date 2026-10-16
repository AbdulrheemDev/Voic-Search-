<?php

namespace App\Search;

use App\Models\LexiconEntry;
use Illuminate\Support\Facades\Cache;

/**
 * القاموس التجاري (القسم 3.6.3 من الفصل الثالث).
 *
 * يبني الصنف من جدول lexicon_entries خريطتين: خريطة الاستبدال أحادي الاتجاه التي تُطبق على
 * كلمات الاستعالم (العبارات من كلمتين أولًا ثم الكلمات المفردة، لتقدم المطابقة الأطول على
 * الأقصر)، ومجموعات التكافؤ التي تُرسل إلى Meilisearch في إعداد المرادفات.
 */
class Lexicon
{
    /** @var array<string, string> اللفظ المطبَّع => المصطلح المعتمد المطبَّع */
    private array $substitutions = [];

    /** @var array<int, array{0: string, 1: string}> أزواج التكافؤ بصيغتها المطبَّعة */
    private array $equivalences = [];

    /** @var array<int, string> مداخل الاستبدال المكونة من كلمتين */
    private array $multiWord = [];

    /** @var array<string, true> مداخل الاستبدال المفردة */
    private array $singleWord = [];

    public function __construct(private readonly Normalizer $normalizer)
    {
        $this->load();
    }

    private function load(): void
    {
        $entries = Cache::rememberForever('lexicon_entries', fn () => LexiconEntry::query()
            ->orderBy('id')
            ->get(['term', 'normalized_term', 'canonical_term', 'relation_type'])
            ->map(fn (LexiconEntry $e): array => [
                'term' => $e->normalized_term ?: $this->normalizer->normalize($e->term),
                'canonical' => $this->normalizer->normalize($e->canonical_term),
                'relation' => $e->relation_type,
            ])->all());

        foreach ($entries as $entry) {
            if (($entry['relation'] ?? null) === LexiconEntry::RELATION_EQUIVALENCE) {
                $this->equivalences[] = [$entry['term'], $entry['canonical']];
                continue;
            }
            if ($entry['term'] === '' || $entry['canonical'] === '') {
                continue;
            }
            $this->substitutions[$entry['term']] = $entry['canonical'];
            if (str_contains($entry['term'], ' ')) {
                $this->multiWord[] = $entry['term'];
            } else {
                $this->singleWord[$entry['term']] = true;
            }
        }
    }

    /**
     * استبدال الألفاظ البديلة بمصطلحات بيانات المتجر.
     *
     * @param  array<int, string>  $words
     * @return array{0: array<int, string>, 1: array<int, array{from: string, to: string}>}
     */
    public function apply(array $words): array
    {
        $out = [];
        $replaced = [];
        $count = count($words);

        for ($i = 0; $i < $count; $i++) {
            $pair = $i + 1 < $count ? $words[$i] . ' ' . $words[$i + 1] : null;
            if ($pair !== null && isset($this->substitutions[$pair])) {
                $canonical = $this->substitutions[$pair];
                $out = array_merge($out, explode(' ', $canonical));
                $replaced[] = ['from' => $pair, 'to' => $canonical];
                $i++;
                continue;
            }
            if (isset($this->singleWord[$words[$i]])) {
                $canonical = $this->substitutions[$words[$i]];
                $out = array_merge($out, explode(' ', $canonical));
                $replaced[] = ['from' => $words[$i], 'to' => $canonical];
                continue;
            }
            $out[] = $words[$i];
        }

        return [array_values($out), $replaced];
    }

    /**
     * إعداد المرادفات لـ Meilisearch: كل مصطلح يشير إلى بقية أعضاء مجموعة التكافؤ.
     *
     * @return array<string, array<int, string>>
     */
    public function synonymsSetting(): array
    {
        $parent = [];
        $find = function (string $x) use (&$parent, &$find): string {
            while (($parent[$x] ?? $x) !== $x) {
                $x = $parent[$x];
            }

            return $x;
        };

        foreach ($this->equivalences as [$a, $b]) {
            foreach ([$a, $b] as $term) {
                $parent[$term] ??= $term;
            }
            $rootA = $find($a);
            $rootB = $find($b);
            if ($rootA !== $rootB) {
                $parent[$rootA] = $rootB;
            }
        }

        $groups = [];
        foreach (array_keys($parent) as $term) {
            $groups[$find($term)][] = $term;
        }

        $synonyms = [];
        foreach ($groups as $members) {
            if (count($members) < 2) {
                continue;
            }
            foreach ($members as $member) {
                $synonyms[$member] = array_values(array_filter($members, fn (string $m): bool => $m !== $member));
            }
        }

        return $synonyms;
    }

    public function substitutionsCount(): int
    {
        return count($this->substitutions);
    }

    /** @return array<int, array{0: string, 1: string}> */
    public function equivalences(): array
    {
        return $this->equivalences;
    }

    public function forget(): void
    {
        Cache::forget('lexicon_entries');
    }
}
