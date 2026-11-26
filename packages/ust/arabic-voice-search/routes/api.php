<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use Ust\ArabicVoiceSearch\Http\Controllers\VoiceSearchController;

/**
 * مسارات واجهة البرمجة (API Routes) لحزمة محرك البحث الصوتي العربي.
 *
 * المتطلبات المرتبطة: IR-01, IR-06, D-30
 * المسار الافتراضي: GET /api/voice-search?q=... (قابل للتعديل من config/arabic-voice-search.php)
 */
Route::prefix((string) config('arabic-voice-search.route.prefix', 'api'))
    ->middleware((array) config('arabic-voice-search.route.middleware', ['api']))
    ->group(function (): void {
        Route::get(
            (string) config('arabic-voice-search.route.path', 'voice-search'),
            [VoiceSearchController::class, 'search']
        )->name((string) config('arabic-voice-search.route.name', 'arabic-voice-search.query'));
    });
