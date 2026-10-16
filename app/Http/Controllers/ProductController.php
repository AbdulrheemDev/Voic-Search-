<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\View\View;

/**
 * صفحة المنتج في المتجر: الرابط الذي تعيده نقطة تكامل البحث مع كل نتيجة.
 */
class ProductController extends Controller
{
    public function show(Product $product): View
    {
        $product->load(['category', 'attributeValues.attribute']);

        return view('products.show', [
            'product' => $product,
            'related' => Product::query()->where('category_id', $product->category_id)
                ->whereKeyNot($product->getKey())->with('attributeValues')->limit(4)->get(),
        ]);
    }
}
