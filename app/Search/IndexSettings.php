<?php

namespace App\Search;

use Meilisearch\Client;

/**
 * إعداد فهرس المنتجات في Meilisearch (الجدول 10.3 في الفصل الثالث).
 *
 * searchableAttributes = الاسم، الفئة، قيم الخصائص، الوصف (بهذا الترتيب لتحديد أهمية الحقول)
 * synonyms             = علاقات التكافؤ من جدول القاموس التجاري بصيغتها المطبَّعة
 * typoTolerance        = الإعداد الافتراضي (خطأ واحد من خمسة أحرف، وخطآن من تسعة أحرف)
 * matchingStrategy     = last (إسقاط الكلمات من آخر الاستعالم عند غياب المطابقة الكاملة)
 */
class IndexSettings
{
    public const SEARCHABLE_ATTRIBUTES = ['name', 'category', 'attributes', 'description'];

    public const MATCHING_STRATEGY = 'last';

    public function __construct(
        private readonly Lexicon $lexicon,
        private readonly Client $client,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'searchableAttributes' => self::SEARCHABLE_ATTRIBUTES,
            'synonyms' => $this->lexicon->synonymsSetting(),
            'typoTolerance' => [
                'enabled' => true,
                'minWordSizeForTypos' => ['oneTypo' => 5, 'twoTypos' => 9],
            ],
            'matchingStrategy' => self::MATCHING_STRATEGY,
        ];
    }

    /**
     * إرسال الإعدادات إلى خادم Meilisearch وانتظار انتهاء مهام التحديث.
     *
     * @return array<int, string> معرّفات المهام المنفذة
     */
    public function apply(string $indexName): array
    {
        $index = $this->client->index($indexName);
        $settings = $this->toArray();

        $tasks = [
            $index->updateSettings([
                'searchableAttributes' => $settings['searchableAttributes'],
                'synonyms' => $settings['synonyms'],
                'typoTolerance' => $settings['typoTolerance'],
            ])['taskUid'],
            $index->updateMatchingStrategy($settings['matchingStrategy'])['taskUid'],
        ];

        foreach ($tasks as $taskUid) {
            $this->client->waitForTask($taskUid);
        }

        return array_map(static fn (int $uid): string => (string) $uid, $tasks);
    }
}
