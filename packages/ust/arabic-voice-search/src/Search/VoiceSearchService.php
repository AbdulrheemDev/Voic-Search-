<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Search;

use Illuminate\Database\Eloquent\Model;
use Ust\ArabicVoiceSearch\Processing\QueryProcessor;

/**
 * خدمة البحث والاسترجاع الكاملة (VoiceSearchService — الدورة 3).
 *
 * تنفذ الخطوات (1..10) من الخوارزمية (1.3):
 *  - معالجة الاستعلام عبر QueryProcessor (تطبيع + حذف عبارات الطلب + استبدال القاموس).
 *  - البحث في Meilisearch عبر Laravel Scout لاسترجاع المعرّفات مرتبة حسب الصلة.
 *  - استرجاع السجلات الحية من MySQL عبر Eloquent مع الحفاظ الصارم على ترتيب Meilisearch (R-08).
 *
 * المتطلبات المرتبطة: FR-09, FR-10, FR-11, FR-12, NFR-06, R-08
 */
class VoiceSearchService
{
    public function __construct(
        private readonly QueryProcessor $queryProcessor
    ) {}

    /**
     * تنفيذ البحث الكامل وإرجاع الاستعلام المعالج وقائمة المنتجات المرتبة.
     *
     * @return array{
     *     status: string,
     *     cycle: int,
     *     query: array{raw: string, normalized: string, after_stop_phrases: string, processed: string, source: string},
     *     results: list<array<string, mixed>>,
     *     total: int,
     *     message: string|null
     * }
     */
    public function search(string $rawQuery, string $source = 'text', ?int $limit = null): array
    {
        $stages = $this->queryProcessor->process($rawQuery);
        $processed = $stages['processed'];

        if ($processed === '') {
            return [
                'status' => 'empty',
                'cycle' => 3,
                'query' => array_merge($stages, ['source' => $source]),
                'results' => [],
                'total' => 0,
                'message' => (string) config(
                    'arabic-voice-search.messages.no_speech',
                    'لم يُلتقط استعلام، يرجى المحاولة مرة أخرى أو الكتابة في حقل البحث.'
                ),
            ];
        }

        $perPage = $limit ?? (int) config('arabic-voice-search.product.per_page', 20);
        $modelClass = (string) config('arabic-voice-search.product.model', 'App\\Models\\Product');

        $orderedModels = $this->fetchOrderedProducts($modelClass, $processed, $perPage);
        $results = array_map(
            static fn (Model $product): array => method_exists($product, 'toVoiceSearchResult')
                ? $product->toVoiceSearchResult()
                : [
                    'id' => $product->getKey(),
                    'name' => (string) ($product->name ?? ''),
                    'price' => $product->price ?? null,
                    'image_url' => $product->image_url ?? $product->image ?? null,
                    'in_stock' => (bool) ($product->in_stock ?? true),
                    'url' => '/products/' . $product->getKey(),
                ],
            $orderedModels
        );

        $total = count($results);

        return [
            'status' => 'ok',
            'cycle' => 3,
            'query' => array_merge($stages, ['source' => $source]),
            'results' => $results,
            'total' => $total,
            'message' => $total === 0
                ? (string) config('arabic-voice-search.messages.no_results', 'لا توجد منتجات مطابقة لاستعلامك.')
                : null,
        ];
    }

    /**
     * إعادة ترتيب السجلات المسترجعة من MySQL لتطابق ترتيب معرّفات Meilisearch حرفيًا (R-08).
     *
     * @template TModel of Model
     * @param list<int|string> $orderedIds
     * @param iterable<TModel> $records
     * @return list<TModel>
     */
    public static function preserveMeilisearchOrder(array $orderedIds, iterable $records): array
    {
        $byId = [];
        foreach ($records as $record) {
            $byId[(string) $record->getKey()] = $record;
        }

        $ordered = [];
        foreach ($orderedIds as $id) {
            $key = (string) $id;
            if (isset($byId[$key])) {
                $ordered[] = $byId[$key];
            }
        }

        return $ordered;
    }

    /**
     * استدعاء Laravel Scout لجلب المعرّفات المرتبة ثم تحميل السجلات الحية من MySQL.
     *
     * @return list<Model>
     */
    protected function fetchOrderedProducts(string $modelClass, string $processedQuery, int $perPage): array
    {
        if (! class_exists($modelClass) || ! method_exists($modelClass, 'search')) {
            return [];
        }

        /** @var list<int|string> $orderedIds */
        $orderedIds = $modelClass::search($processedQuery)
            ->take($perPage)
            ->keys()
            ->all();

        if ($orderedIds === []) {
            return [];
        }

        $keyName = (new $modelClass())->getKeyName();
        $records = $modelClass::query()
            ->whereIn($keyName, $orderedIds)
            ->get();

        return self::preserveMeilisearchOrder($orderedIds, $records);
    }
}
