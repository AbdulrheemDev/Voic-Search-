<?php

use App\Http\Controllers\SearchController;
use App\Http\Controllers\StoreApiController;
use App\Http\Controllers\TestToolsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| نقاط التكامل البرمجية مع المنصة المستضيفة
|--------------------------------------------------------------------------
*/

// نقطة التكامل الثانية: مسار API واحد يستقبل نص الاستعالم ويعيد النتائج مرتبة
Route::post('/voice-search', [SearchController::class, 'search'])->name('api.voice-search');

// بيانات المتجر المستضيف لصفحات العرض
Route::get('/categories', [StoreApiController::class, 'categories'])->name('api.categories');
Route::get('/products', [StoreApiController::class, 'products'])->name('api.products');
Route::get('/products/{product}', [StoreApiController::class, 'product'])->name('api.product');

// أدوات التجارب: قائمة الاستعالمات الاختبارية وحفظ نتائج التسجيل
Route::get('/test-queries', [TestToolsController::class, 'testQueries'])->name('api.test-queries');
Route::post('/recordings', [TestToolsController::class, 'storeRecordings'])->name('api.recordings');
