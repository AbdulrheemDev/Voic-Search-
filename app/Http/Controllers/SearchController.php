<?php

namespace App\Http\Controllers;

use App\Http\Requests\SearchRequest;
use App\Http\Resources\ProductResource;
use App\Search\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\View\View;

/**
 * متحكم البحث (القسم 1.5.3 من الفصل الثالث): يستقبل طلب البحث من واجهة المتجر،
 * ويمرره إلى وحدة التطبيع ووحدة القاموس وخدمة البحث، ويعيد النتائج بصيغة JSON.
 *
 * ونقطة التكامل الثانية هي المسار POST /api/voice-search، وهو المسار الوحيد الذي يضيفه
 * المحرك إلى تطبيق المتجر (القسم 2.5.3).
 */
class SearchController extends Controller
{
    public function __construct(private readonly SearchService $search)
    {
    }

    /** صفحة البحث في المتجر: تضم زر الميكروفون وحقل البحث وقائمة النتائج */
    public function index(): View
    {
        return view('search.index');
    }

    /** تنفيذ الاستعالم وإرجاع النتائج للواجهة */
    public function search(SearchRequest $request): JsonResponse
    {
        $query = (string) $request->input('query', '');
        $setting = (string) $request->input('setting', config('services.voice_search.setting', 'c'));
        $results = $this->search->search($query, $setting);

        return response()->json([
            'query' => $results['query'],
            'stages' => $results['stages'],
            'replacements' => $results['replacements'],
            'count' => $results['products']->count(),
            'products' => ProductResource::collection($results['products'])->resolve(),
            'message' => $this->message($query, $results['products']->count(), $results['timed_out']),
            'timing_ms' => $results['timing_ms'],
        ]);
    }

    /** رسائل الحالات الاستثنائية (المتطلب FR-12) */
    private function message(string $query, int $count, bool $timedOut): ?string
    {
        if (trim($query) === '') {
            return 'لم يُلتقط أي استعالم، يُرجى إعادة المحاولة والتحدث بوضوح.';
        }
        if ($timedOut) {
            return 'تعذر تنفيذ البحث حاليًا، يُرجى إعادة المحاولة.';
        }
        if ($count === 0) {
            return 'لا توجد منتجات مطابقة لاستعلامك، جرّب كلمات أخرى.';
        }

        return null;
    }
}
