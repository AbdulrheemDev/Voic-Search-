<?php

use App\Http\Controllers\ProductController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\StoreController;
use App\Http\Controllers\TestToolsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| مسارات المتجر المستضيف ومحرك البحث الصوتي
|--------------------------------------------------------------------------
| لا يضيف المحرك إلى المتجر إلا مسارًا واحدًا للبحث (نقطة التكامل الثانية) وهو
| POST /api/voice-search المعرَّف في routes/api.php، أما المسارات التالية فهي
| صفحات المتجر التي تخدم تجربة الدمج والعرض.
*/

Route::get('/', [StoreController::class, 'index'])->name('store.index');
Route::get('/category/{category}', [StoreController::class, 'category'])->name('store.category');
Route::get('/product/{product}', [ProductController::class, 'show'])->name('products.show');

// صفحة البحث بالصوت والكتابة (نقطة التكامل الأولى: زر الميكروفون وشيفرة JavaScript المرتبطة به)
Route::get('/search', [SearchController::class, 'index'])->name('search.index');

// أدوات البحث الميداني: أداة تسجيل الاستعالمات الاختبارية
Route::get('/tools/recordings', [TestToolsController::class, 'recordings'])->name('tools.recordings');
