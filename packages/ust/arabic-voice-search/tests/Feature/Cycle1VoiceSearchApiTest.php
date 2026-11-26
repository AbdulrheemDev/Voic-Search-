<?php

declare(strict_types=1);

namespace Ust\ArabicVoiceSearch\Tests\Feature;

use Tests\TestCase;

/**
 * اختبارات التكامل للدورة 1 — مسار استقبال الاستعلام الصوتي والنصي.
 *
 * المتطلبات المرتبطة: FR-01, FR-02, FR-12, IR-01, NFR-06
 * يُشغَّل في بيئة Laravel عبر:
 *   php artisan test packages/ust/arabic-voice-search/tests/Feature/Cycle1VoiceSearchApiTest.php
 */
class Cycle1VoiceSearchApiTest extends TestCase
{
    public function test_it_receives_arabic_voice_query_and_returns_echo_json(): void
    {
        $response = $this->getJson('/api/voice-search?q=' . urlencode('أبغى شنطة ظهر سوداء') . '&source=voice');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'ok',
                'cycle' => 1,
                'query' => [
                    'raw' => 'أبغى شنطة ظهر سوداء',
                    'source' => 'voice',
                ],
                'results' => [],
                'message' => null,
            ]);
    }

    public function test_it_receives_arabic_text_query_through_same_endpoint(): void
    {
        $response = $this->getJson('/api/voice-search?q=' . urlencode('سماعة بلوتوث') . '&source=text');

        $response->assertStatus(200)
            ->assertJsonPath('query.raw', 'سماعة بلوتوث')
            ->assertJsonPath('query.source', 'text');
    }

    public function test_it_returns_422_and_clear_arabic_message_when_query_is_empty(): void
    {
        $response = $this->getJson('/api/voice-search?q=');

        $response->assertStatus(422)
            ->assertJsonPath('status', 'empty')
            ->assertJsonStructure(['status', 'cycle', 'query', 'results', 'message']);
    }
}
