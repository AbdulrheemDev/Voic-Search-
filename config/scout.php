<?php

return [

    /*
    |--------------------------------------------------------------------------
    | برنامج تشغيل البحث
    |--------------------------------------------------------------------------
    | يعتمد المحرك على برنامج تشغيل meilisearch في Laravel Scout (القسم 4.10.3).
    */

    'driver' => env('SCOUT_DRIVER', 'meilisearch'),

    'prefix' => env('SCOUT_PREFIX', ''),

    'queue' => env('SCOUT_QUEUE', false),

    'after_commit' => false,

    'chunk' => [
        'searchable' => 500,
        'unsearchable' => 500,
    ],

    'soft_delete' => false,

    'identify' => env('SCOUT_IDENTIFY', false),

    'meilisearch' => [
        'host' => env('MEILISEARCH_HOST', 'http://127.0.0.1:7700'),
        'key' => env('MEILISEARCH_KEY', null),
        'index-settings' => [
            'products' => [
                'searchableAttributes' => ['name', 'category', 'attributes', 'description'],
                'filterableAttributes' => [],
                'sortableAttributes' => [],
                'matchingStrategy' => 'last',
                'typoTolerance' => [
                    'enabled' => true,
                    'minWordSizeForTypos' => ['oneTypo' => 5, 'twoTypos' => 9],
                ],
            ],
        ],
    ],

];
