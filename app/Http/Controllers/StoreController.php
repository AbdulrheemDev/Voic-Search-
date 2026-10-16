<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\View\View;

/**
 * صفحات المتجر المستضيف (البيئة التي يُدمج فيها المحرك).
 * لا يعدل المحرك هذه الصفحات ولا منطقها، وهي موجودة لتجربة الدمج والبحث.
 */
class StoreController extends Controller
{
    public function index(): View
    {
        return view('store.index', [
            'categories' => Category::query()->withCount('products')->orderBy('id')->get(),
            'products' => Product::query()->with(['category', 'attributeValues'])->latest('id')->limit(12)->get(),
        ]);
    }

    public function category(Category $category): View
    {
        return view('store.category', [
            'category' => $category,
            'products' => $category->products()->with('attributeValues')->orderBy('id')->paginate(12),
        ]);
    }
}
