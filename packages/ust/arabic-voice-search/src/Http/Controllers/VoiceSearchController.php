<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Ust\ArabicVoiceSearch\Search\VoiceSearchService;

/**
 * متحكم البحث الصوتي العربي — الدورة 3 (الربط الكامل مع Meilisearch وLaravel Scout).
 *
 * المتطلبات المرتبطة:
 * - FR-01..FR-12, NFR-06, IR-01, IR-06
 */
class VoiceSearchController extends Controller
{
    public function __construct(
        private readonly VoiceSearchService $searchService
    ) {}

    /**
     * استقبال الاستعلام العربي وتنفيذ المسار الكامل وإعادة النتائج المرتبة بصيغة JSON.
     */
    public function search(Request $request): JsonResponse
    {
        $paramName = (string) config('arabic-voice-search.route.query_param', 'q');
        $rawQuery = trim((string) $request->query($paramName, ''));
        $source = $request->query('source', 'text') === 'voice' ? 'voice' : 'text';
        $limit = $request->query('limit');

        $payload = $this->searchService->search(
            $rawQuery,
            $source,
            is_numeric($limit) ? max(1, min(100, (int) $limit)) : null
        );

        $statusCode = $payload['status'] === 'empty' ? 422 : 200;

        return response()->json($payload, $statusCode);
    }
}
