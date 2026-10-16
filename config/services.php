<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    |--------------------------------------------------------------------------
    | إعداد المحرك
    |--------------------------------------------------------------------------
    | setting: إعداد المعالجة الافتراضي في الواجهة (أ/ب/ج حسب القسم 3.11.3)،
    | والإعداد النهائي للمحرك هو (ج).
    */

    'voice_search' => [
        'setting' => env('VOICE_SEARCH_SETTING', 'c'),
        'results_per_page' => 12,
        'language' => 'ar-SA',
    ],

];
