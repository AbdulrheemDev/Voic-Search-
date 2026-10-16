<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * نقاط JSON التي تقرأ منها صفحات المتجر التجريبي بياناتها.
 * (صفحات المتجر جزء من البيئة المستضيفة، ولا تدخل في مسار معالجة الاستعالم.)
 */
class StoreApiController extends Controller
{
    public function categories(): JsonResponse
    {
        return response()->json([
            'categories' => Category::query()->withCount('products')->orderBy('id')->get()
                ->map(fn (Category $category): array => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'products_count' => $category->products_count,
                ])->all(),
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $query = Product::query()->with(['category', 'attributeValues'])->orderBy('id');
        if ($request->filled('category')) {
            $query->where('category_id', (int) $request->integer('category'));
        }
        $limit = min(max($request->integer('limit', 12), 1), 60);

        return response()->json([
            'products' => ProductResource::collection($query->limit($limit)->get())->resolve(),
        ]);
    }

    public function product(Product $product): JsonResponse
    {
        $product->load(['category', 'attributeValues']);
        $related = Product::query()
            ->where('category_id', $product->category_id)
            ->whereKeyNot($product->getKey())
            ->with(['category', 'attributeValues'])
            ->limit(4)
            ->get();

        return response()->json([
            'product' => array_merge(
                ProductResource::make($product)->resolve(),
                ['description' => $product->description]
            ),
            'related' => ProductResource::collection($related)->resolve(),
        ]);
    }
}
