<?php

namespace App\Search;

use App\Models\Product;
use Illuminate\Support\Collection;

/**
 * خدمة البحث: تنفيذ الاستعالم في فهرس Meilisearch عبر Laravel Scout، ثم استرجاع سجلات
 * المنتجات من MySQL عبر Eloquent بالترتيب نفسه (الخطوتان 7 و9 من الخوارزمية 1.3،
 * والقسم 5.6.3 من الفصل الثالث).
 */
class SearchService
{
    public function __construct(private readonly QueryProcessor $processor)
    {
    }

    /**
     * @return array{
     *     query: string,
     *     stages: array<string, string>,
     *     replacements: array<int, array{from: string, to: string}>,
     *     products: Collection<int, Product>,
     *     timed_out: bool,
     *     timing_ms: array<string, float>
     * }
     */
    public function search(string $rawQuery, string $setting = 'c', int $limit = 12): array
    {
        $startedAt = microtime(true);

        if ($this->processor->isEmpty($rawQuery)) {
            return [
                'query' => '',
                'stages' => ['raw' => '', 'normalized' => '', 'after_stop_phrases' => '', 'after_lexicon' => ''],
                'replacements' => [],
                'products' => collect(),
                'timed_out' => false,
                'timing_ms' => ['processing' => 0.0, 'search' => 0.0, 'retrieval' => 0.0, 'server_total' => 0.0],
            ];
        }

        $processed = $this->processor->process($rawQuery, $setting);
        $afterProcessing = microtime(true);

        /** @var Collection<int, Product> $products */
        $products = collect();
        $timedOut = false;

        if ($processed['query'] !== '') {
            try {
                // Laravel Scout ينقل الاستعالم إلى Meilisearch ويعيد النماذج بترتيب الصلة
                $products = Product::search($processed['query'])
                    ->take($limit)
                    ->get();
            } catch (\Throwable $e) {
                report($e);
                $timedOut = true;
            }
        }

        $afterSearch = microtime(true);
        $ms = static fn (float $from, float $to): float => round(($to - $from) * 1000, 3);

        return [
            'query' => $processed['query'],
            'stages' => $processed['stages'],
            'replacements' => $processed['replacements'],
            'products' => $products,
            'timed_out' => $timedOut,
            'timing_ms' => [
                'processing' => $ms($startedAt, $afterProcessing),
                'search' => $ms($afterProcessing, $afterSearch),
                'retrieval' => $ms($afterSearch, microtime(true)),
                'server_total' => $ms($startedAt, microtime(true)),
            ],
        ];
    }
}
